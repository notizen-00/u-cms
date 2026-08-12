import { Injectable } from '@nestjs/common';
import { renderTokensCss, type CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import { Eta } from 'eta';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveTheme } from '../../themes/theme-registry';
import { BlockRegistryService } from '../../blocks/block-registry.service';
import { renderBlocks } from './block-content-renderer';
import { ContentRenderer } from './content-renderer';
import {
  emitPluginAssets,
  injectPluginAssetTags,
  renderPluginAssetTags,
} from './plugin-assets';
import { buildPageSeo, pickString, type PageSeo } from './seo';
import type { SiteRenderData, SiteRenderer } from './site-renderer.types';
import { resolveThemeVars } from './theme-vars';

@Injectable()
export class EtaSiteRenderer implements SiteRenderer {
  private readonly eta: Eta;

  constructor(
    private readonly contentRenderer: ContentRenderer,
    private readonly blockRegistry: BlockRegistryService,
  ) {
    this.eta = new Eta({ autoEscape: true });
  }

  async render(outputDir: string, data: SiteRenderData): Promise<void> {
    // Resolved per-call (not cached on `this`) so this singleton service
    // renders each site with its own site.themeId, and never leaks one
    // build's theme into a concurrently-running build for another site.
    // Safe to narrow to `CmsTheme<string>` here — BuildProcessor only ever
    // routes an "eta"-renderKind theme (see modules/themes/theme-registry.ts)
    // to this renderer.
    const theme = resolveTheme(data.themeId) as CmsTheme<string>;
    const layouts = new Map<string, string>(
      theme.layouts.map((layout) => [layout.id, layout.render]),
    );
    const themeVars = resolveThemeVars(theme, data.themeSettings);
    const tokensCss = renderTokensCss(theme.tokens);
    const baseKeywords = typeof themeVars.metaKeywords === 'string' ? themeVars.metaKeywords : '';
    const formsById = new Map(data.forms.map((form) => [form.id, form]));
    const emittedPluginAssets = await emitPluginAssets(outputDir, data.pluginAssets);
    const renderMarkdown = (markdown: string): string =>
      this.contentRenderer.renderMarkdown(markdown, data.site.id, data.apiBaseUrl, formsById);

    /**
     * A page's body comes from one of two places, and which one is decided by
     * the content itself: block-authored pages render through the theme's own
     * per-block Eta templates (docs/theme_aware_prd.md §17), while pages
     * written before the theme-aware builder still render their Markdown.
     * `renderBlocks()` is renderer-agnostic — this just supplies an Eta-backed
     * `RenderComponent`, the same role `SvelteCompilerService` plays for
     * Svelte themes.
     */
    const renderPageBody = async (page: {
      blocks?: readonly PageBlock[];
      bodyMarkdown: string;
    }): Promise<string> => {
      if (!page.blocks?.length) return renderMarkdown(page.bodyMarkdown);
      return renderBlocks(
        page.blocks,
        theme,
        data.themeId,
        this.blockRegistry,
        {
          site: data.site,
          theme: themeVars,
          menus: data.menus ?? {},
          news: data.news,
          pages: data.pages,
        },
        async (source, _filename, props) => ({
          head: '',
          body: this.eta.renderString(source, props) as string,
        }),
      );
    };

    // `site`/`theme`/`menus`/`tokensCss` are merged into every layout's data,
    // not just the outer "layout" wrapper — a theme's body templates (e.g. a
    // hero on "home") may reasonably want them too, and per-theme call sites
    // shouldn't have to know which specific layouts need them.
    const renderLayout = (id: string, layoutData: Record<string, unknown>): string => {
      const template = layouts.get(id);
      if (!template) {
        throw new Error(`Theme "${theme.manifest.id}" has no layout "${id}"`);
      }
      return this.eta.renderString(template, {
        site: data.site,
        theme: themeVars,
        menus: data.menus ?? {},
        tokensCss,
        ...layoutData,
      }) as string;
    };

    const writePage = async (
      relativePath: string,
      title: string,
      body: string,
      seo: PageSeo,
    ): Promise<void> => {
      const dir = relativePath ? join(outputDir, relativePath) : outputDir;
      await mkdir(dir, { recursive: true });
      const renderedHtml = renderLayout('layout', { title, body, seo });
      const html = injectPluginAssetTags(
        renderedHtml,
        renderPluginAssetTags(emittedPluginAssets, relativePath),
      );
      await writeFile(join(dir, 'index.html'), html, 'utf-8');
    };

    const homepage = data.pages.find((p) => p.isHomepage);

    // A homepage Page's body swaps in for the theme's own hardcoded "home"
    // layout entirely (see the branches below), so unlike every other Page it
    // has no theme template of its own to supply the usual .wrap/.prose
    // container — wrapped here instead, same treatment `page`/`news-single`
    // give any other body content.
    // A block-authored homepage brings its own full-width sections from the
    // theme's block templates, so it must NOT be squeezed into the narrow
    // `.wrap/.prose` reading column that Markdown bodies need.
    let homeBody: string;
    if (homepage?.blocks?.length) {
      homeBody = await renderPageBody(homepage);
    } else if (homepage) {
      homeBody = `<div class="wrap"><div class="prose">${renderMarkdown(homepage.bodyMarkdown)}</div></div>`;
    } else {
      homeBody = renderLayout('home', { news: data.news, pages: data.pages });
    }
    await writePage(
      '',
      'Beranda',
      homeBody,
      buildPageSeo(data.site, '/', {
        explicitDescription: pickString(themeVars.heroTagline, themeVars.heroDescription),
        fallbackMarkdown: homepage?.bodyMarkdown,
        baseKeywords,
      }),
    );

    const newsListBody = renderLayout('news-list', { news: data.news });
    await writePage(
      'news',
      'Berita',
      newsListBody,
      buildPageSeo(data.site, '/news/', { baseKeywords, extraKeywords: ['berita'] }),
    );

    for (const item of data.news) {
      const body = renderLayout('news-single', {
        item: { ...item, bodyHtml: renderMarkdown(item.bodyMarkdown) },
      });
      await writePage(
        `news/${item.slug}`,
        item.title,
        body,
        buildPageSeo(data.site, `/news/${item.slug}/`, {
          explicitDescription: item.excerpt,
          fallbackMarkdown: item.bodyMarkdown,
          baseKeywords,
          extraKeywords: [
            ...item.categories.map((category) => category.name),
            ...item.tags.map((tag) => tag.name),
          ],
        }),
      );
    }

    for (const page of data.pages) {
      if (page.isHomepage) continue;
      const body = renderLayout('page', {
        item: { ...page, bodyHtml: await renderPageBody(page) },
      });
      await writePage(
        page.slug,
        page.title,
        body,
        buildPageSeo(data.site, `/${page.slug}/`, {
          fallbackMarkdown: page.bodyMarkdown,
          baseKeywords,
        }),
      );
    }
  }
}
