import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { renderTokensCss, type CmsTheme } from '@unej-cms/sdk-theme';
import { Eta } from 'eta';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { news, pages, sites } from '../../database/schema';
import { BlockRegistryService } from '../blocks/block-registry.service';
import { renderBlocks } from '../builder/render/block-content-renderer';
import { ContentRenderer } from '../builder/render/content-renderer';
import { buildPageSeo } from '../builder/render/seo';
import { SvelteCompilerService } from '../builder/render/svelte-compiler.service';
import { resolveThemeVars } from '../builder/render/theme-vars';
import { resolveTheme, resolveThemeRenderKind } from '../themes/theme-registry';

/**
 * Renders a single page to a complete HTML document for live preview
 * (docs/theme_aware_prd.md §14).
 *
 * Renders the page's *draft* — whatever is currently saved, published or not
 * — through the active theme's real layout and block templates, using the
 * same `renderBlocks` the static site build uses (via `SvelteCompilerService`
 * for Svelte themes, `Eta` directly for Eta themes — mirroring
 * `SvelteSiteRenderer`/`EtaSiteRenderer`). That shared path is what makes the
 * preview a faithful stand-in for production rather than an approximation.
 */
@Injectable()
export class PreviewRendererService {
  private readonly eta: Eta;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly compiler: SvelteCompilerService,
    private readonly contentRenderer: ContentRenderer,
    private readonly blockRegistry: BlockRegistryService,
  ) {
    this.eta = new Eta({ autoEscape: true });
  }

  async renderPage(siteId: string, pageId: string): Promise<string> {
    const [page] = await this.db
      .select()
      .from(pages)
      .where(and(eq(pages.siteId, siteId), eq(pages.id, pageId)))
      .limit(1);
    if (!page) throw new NotFoundException('Page not found');

    const [site] = await this.db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
    if (!site) throw new NotFoundException('Site not found');

    const renderKind = resolveThemeRenderKind(site.themeId);
    const theme = resolveTheme(site.themeId) as CmsTheme<string>;
    const themeVars = resolveThemeVars(theme, readThemeSettings(site.settings, site.themeId));
    const tokensCss = renderTokensCss(theme.tokens);

    // Only published news feeds preview, matching what a visitor would see —
    // a preview that surfaced unpublished posts would misrepresent the page.
    const publishedNews = await this.db
      .select()
      .from(news)
      .where(and(eq(news.siteId, siteId), eq(news.status, 'published')));
    const sitePages = await this.db.select().from(pages).where(eq(pages.siteId, siteId));

    const siteData = {
      id: site.id,
      name: site.name,
      slug: site.slug,
      logoUrl: site.logoUrl,
      faviconUrl: site.faviconUrl,
      domain: site.domain,
    };

    const blockContext = {
      site: siteData,
      theme: themeVars,
      menus: {},
      news: publishedNews.map((item) => ({ ...item, categories: [], tags: [] })),
      pages: sitePages,
    };
    const seo = buildPageSeo(siteData, page.isHomepage ? '/' : `/${page.slug}/`, {
      fallbackMarkdown: page.bodyMarkdown,
    });
    const markdownBody = (): string =>
      `<div class="wrap"><div class="prose">${this.contentRenderer.renderMarkdown(
        page.bodyMarkdown,
        siteId,
        '',
        new Map(),
      )}</div></div>`;

    const layoutSource = theme.layouts.find((layout) => layout.id === 'layout')?.render;
    if (!layoutSource) {
      throw new NotFoundException(`Theme "${site.themeId}" has no layout "layout"`);
    }

    if (renderKind === 'eta') {
      // Deliberately `page.blocks` (the Builder's draft), never
      // `publishedBlocks` — preview exists to show unsaved-to-production work
      // (docs/theme_aware_prd.md §16), so rendering the published snapshot
      // instead would defeat the entire feature.
      const body = page.blocks?.length
        ? await renderBlocks(
            page.blocks,
            theme,
            site.themeId,
            this.blockRegistry,
            blockContext,
            async (source, _filename, props) => ({
              head: '',
              body: this.eta.renderString(source, props) as string,
            }),
          )
        : markdownBody();

      // Unlike Svelte's `render()`, an Eta `layout` template already emits a
      // complete `<!DOCTYPE html>...</html>` document (see e.g.
      // themes/default/src/layouts.ts) — nothing further to wrap it in.
      return this.eta.renderString(layoutSource, {
        site: siteData,
        theme: themeVars,
        menus: {},
        tokensCss,
        title: page.title,
        body,
        seo,
      }) as string;
    }

    const body = page.blocks?.length
      ? await renderBlocks(
          page.blocks,
          theme,
          site.themeId,
          this.blockRegistry,
          blockContext,
          (source, filename, props) => this.compiler.renderSource(source, filename, props),
        )
      : markdownBody();

    const rendered = await this.compiler.renderSource(layoutSource, 'layout.svelte', {
      site: siteData,
      theme: themeVars,
      menus: {},
      tokensCss,
      title: page.title,
      body,
      isHome: page.isHomepage,
      seo,
    });

    return `<!DOCTYPE html>\n<html lang="id">\n<head>\n${rendered.head}\n</head>\n<body>\n${rendered.body}\n</body>\n</html>\n`;
  }
}

function readThemeSettings(settings: unknown, themeId: string): Record<string, unknown> {
  const themeSettings = (settings as { themeSettings?: Record<string, Record<string, unknown>> } | null)
    ?.themeSettings;
  return themeSettings?.[themeId] ?? {};
}
