import { Injectable } from '@nestjs/common';
import { renderTokensCss, type CmsTheme } from '@unej-cms/sdk-theme';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveTheme } from '../../themes/theme-registry';
import { ContentRenderer } from './content-renderer';
import { emitPluginAssets, renderPluginAssetTags } from './plugin-assets';
import { buildPageSeo, pickString, type PageSeo } from './seo';
import type { SiteRenderData, SiteRenderer } from './site-renderer.types';
import { resolveThemeVars } from './theme-vars';

/**
 * Compiled-component cache directory, resolved relative to this file (not
 * `process.cwd()`, which varies with how the process was launched) so it
 * always lands inside `apps/backend` — where Node's module resolution will
 * find `apps/backend/node_modules/svelte` when the compiled output does
 * `import ... from 'svelte/internal/server'`.
 */
const CACHE_DIR = join(__dirname, '..', '..', '..', '..', '.svelte-cache');

/**
 * Renders themes authored as real `.svelte` components (see
 * modules/themes/theme-registry.ts's `renderKind: 'svelte'`), via Svelte's
 * own SSR-only `render()` — no SvelteKit, no hydration, no client bundle
 * (that's a separate, not-yet-built Builder phase). `apps/backend` is a
 * CommonJS package but Svelte 5 is ESM-only, so every Svelte-touching import
 * here is a dynamic `import()` — the one thing that reliably bridges CJS ->
 * ESM-only packages in Node.
 *
 * A theme's `LayoutDefinition.render` is raw `.svelte` source text (just
 * like an Eta theme's `render` is raw Eta source text — same "TRender is
 * opaque, the Runtime interprets it" SDK principle, just a different
 * interpretation). Compiled once per unique source (content-hash cache, both
 * in-memory and on disk) and reused for every page that uses that layout.
 */
@Injectable()
export class SvelteSiteRenderer implements SiteRenderer {
  private readonly componentCache = new Map<string, unknown>();

  constructor(private readonly contentRenderer: ContentRenderer) {}

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

    // Dynamically compiled at runtime from theme source text, so there's no
    // static type to check components/props against — same trust boundary
    // as Eta's `renderString(template, data)` accepting a plain object.
    // Loosely typed here rather than fighting `render()`'s generic inference
    // over a component with no compile-time type.
    const { render } = (await import('svelte/server')) as {
      render: (
        component: unknown,
        options: { props: Record<string, unknown> },
      ) => { head: string; body: string };
    };

    const renderLayout = async (
      id: string,
      layoutData: Record<string, unknown>,
    ): Promise<{ head: string; body: string }> => {
      const source = layouts.get(id);
      if (!source) {
        throw new Error(`Theme "${theme.manifest.id}" has no layout "${id}"`);
      }
      const component = await this.compileAndImport(source, `${id}.svelte`);
      return render(component, {
        props: {
          site: data.site,
          theme: themeVars,
          menus: data.menus ?? {},
          tokensCss,
          ...layoutData,
        },
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
    const homeBody = homepage
      ? `<div class="wrap"><div class="prose">${renderMarkdown(homepage.bodyMarkdown)}</div></div>`
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

  private async compileAndImport(source: string, filename: string): Promise<unknown> {
    const hash = createHash('sha256').update(source).digest('hex');
    const cached = this.componentCache.get(hash);
    if (cached) return cached;

    const { compile } = await import('svelte/compiler');
    const { js } = compile(source, { generate: 'server', filename });

    await mkdir(CACHE_DIR, { recursive: true });
    const cacheFile = join(CACHE_DIR, `${hash}.mjs`);
    await writeFile(cacheFile, js.code, 'utf-8');

    const mod = (await import(pathToFileURL(cacheFile).href)) as { default: unknown };
    this.componentCache.set(hash, mod.default);
    return mod.default;
  }
}
