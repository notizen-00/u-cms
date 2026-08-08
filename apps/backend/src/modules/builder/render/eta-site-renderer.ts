import { Injectable } from '@nestjs/common';
import { renderTokensCss, type CmsTheme } from '@unej-cms/sdk-theme';
import { Eta } from 'eta';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveTheme } from '../../themes/theme-registry';
import { ContentRenderer } from './content-renderer';
import { buildPageSeo, pickString, type PageSeo } from './seo';
import type { SiteRenderData, SiteRenderer } from './site-renderer.types';
import { resolveThemeVars } from './theme-vars';

@Injectable()
export class EtaSiteRenderer implements SiteRenderer {
  private readonly eta: Eta;

  constructor(private readonly contentRenderer: ContentRenderer) {
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
    const renderMarkdown = (markdown: string): string =>
      this.contentRenderer.renderMarkdown(markdown, data.site.id, data.apiBaseUrl, formsById);

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
      const html = renderLayout('layout', { title, body, seo });
      await writeFile(join(dir, 'index.html'), html, 'utf-8');
    };

    const homepage = data.pages.find((p) => p.isHomepage);

    const homeBody = homepage
      ? renderMarkdown(homepage.bodyMarkdown)
      : renderLayout('home', { news: data.news, pages: data.pages });
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
        item: { ...page, bodyHtml: renderMarkdown(page.bodyMarkdown) },
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
