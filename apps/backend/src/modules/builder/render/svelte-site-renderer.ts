import { Injectable } from '@nestjs/common';
import { renderTokensCss, type CmsTheme } from '@unej-cms/sdk-theme';
import type { PageBlock } from '@unej-cms/sdk-content';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveTheme } from '../../themes/theme-registry';
import { BlockRegistryService } from '../../blocks/block-registry.service';
import { renderBlocks } from './block-content-renderer';
import { ContentRenderer } from './content-renderer';
import { emitPluginAssets, renderPluginAssetTags } from './plugin-assets';
import { buildPageSeo, pickString, type PageSeo } from './seo';
import type { SiteRenderData, SiteRenderer } from './site-renderer.types';
import { SvelteCompilerService } from './svelte-compiler.service';
import { resolveThemeVars } from './theme-vars';

/**
 * Renders themes authored as real `.svelte` components (see
 * modules/themes/theme-registry.ts's `renderKind: 'svelte'`), via Svelte's
 * own SSR-only `render()` — no SvelteKit, no hydration, no client bundle
 * (that's a separate, not-yet-built Builder phase).
 *
 * A theme's `LayoutDefinition.render` is raw `.svelte` source text (just
 * like an Eta theme's `render` is raw Eta source text — same "TRender is
 * opaque, the Runtime interprets it" SDK principle, just a different
 * interpretation). Compilation and caching live in SvelteCompilerService,
 * shared with the live preview so both render through one code path.
 */
@Injectable()
export class SvelteSiteRenderer implements SiteRenderer {
  constructor(
    private readonly contentRenderer: ContentRenderer,
    private readonly blockRegistry: BlockRegistryService,
    private readonly compiler: SvelteCompilerService,
  ) {}

  async render(outputDir: string, data: SiteRenderData): Promise<void> {
    // Safe to narrow to `CmsTheme<string>` here — BuildProcessor only ever
    // routes a "svelte"-renderKind theme to this renderer, and for those
    // themes `TRender = string` means "raw .svelte source", not Eta source.
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
     * per-block components (docs/theme_aware_prd.md §17), while pages written
     * before the theme-aware builder still render their Markdown. Both stay
     * supported, so no existing page needs migrating to keep working.
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
        (source, filename, props) => this.compiler.renderSource(source, filename, props),
      );
    };

    const renderLayout = async (
      id: string,
      layoutData: Record<string, unknown>,
    ): Promise<{ head: string; body: string }> => {
      const source = layouts.get(id);
      if (!source) {
        throw new Error(`Theme "${theme.manifest.id}" has no layout "${id}"`);
      }
      return this.compiler.renderSource(source, `${id}.svelte`, {
        site: data.site,
        theme: themeVars,
        menus: data.menus ?? {},
        tokensCss,
        ...layoutData,
      });
    };

    const writePage = async (
      relativePath: string,
      title: string,
      bodyHtml: string,
      seo: PageSeo,
      isHome = false,
    ): Promise<void> => {
      const dir = relativePath ? join(outputDir, relativePath) : outputDir;
      await mkdir(dir, { recursive: true });
      // Svelte's `render()` returns `<svelte:head>` content and everything
      // else separately — a real `<html>`/`<head>`/`<body>` document is
      // assembled here, not inside the Layout component (mirrors how
      // SvelteKit's own root `app.html` + layout split works). `isHome` lets
      // a theme's Layout component style itself differently on the homepage
      // (e.g. a transparent header overlaid on a full-screen hero video) —
      // every other page renders with the normal, opaque header.
      const { head, body } = await renderLayout('layout', { title, body: bodyHtml, seo, isHome });
      const pluginAssetTags = renderPluginAssetTags(emittedPluginAssets, relativePath);
      // Plugin CSS (e.g. Page Builder's generic block styles) loads BEFORE
      // the theme's own <style> block, not after — so a theme's same-
      // specificity `.cms-pb-card` rule wins the cascade and can actually
      // reskin a plugin's block to match its own look, instead of needing
      // `!important` or higher specificity to override a later, "winning"
      // plugin stylesheet.
      const completeHead = [pluginAssetTags.head, head].filter(Boolean).join('\n');
      const completeBody = [body, pluginAssetTags.body].filter(Boolean).join('\n');
      const html = `<!DOCTYPE html>\n<html lang="id">\n<head>\n${completeHead}\n</head>\n<body>\n${completeBody}\n</body>\n</html>\n`;
      await writeFile(join(dir, 'index.html'), html, 'utf-8');
    };

    const homepage = data.pages.find((p) => p.isHomepage);

    // A homepage Page's body swaps in for the theme's own hardcoded "home"
    // layout entirely (see the ternary below), so unlike every other Page it
    // has no theme template of its own to supply the usual .wrap/.prose
    // container — wrapped here instead, same treatment `page`/`news-single`
    // give any other body content.
    // A block-authored homepage brings its own full-width sections from the
    // theme's components, so it must NOT be squeezed into the narrow
    // `.wrap/.prose` reading column that Markdown bodies need.
    const homeBody = homepage
      ? homepage.blocks?.length
        ? await renderPageBody(homepage)
        : `<div class="wrap"><div class="prose">${renderMarkdown(homepage.bodyMarkdown)}</div></div>`
      : (await renderLayout('home', { news: data.news, pages: data.pages })).body;
    await writePage(
      '',
      'Beranda',
      homeBody,
      buildPageSeo(data.site, '/', {
        explicitDescription: pickString(themeVars.heroTagline, themeVars.heroDescription),
        fallbackMarkdown: homepage?.bodyMarkdown,
        baseKeywords,
      }),
      true,
    );

    const newsListBody = (await renderLayout('news-list', { news: data.news })).body;
    await writePage(
      'news',
      'Berita',
      newsListBody,
      buildPageSeo(data.site, '/news/', { baseKeywords, extraKeywords: ['berita'] }),
    );

    for (const item of data.news) {
      const { body } = await renderLayout('news-single', {
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
      const { body } = await renderLayout('page', {
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
