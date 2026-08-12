import { defineLayout } from "@unej-cms/sdk-theme";
import { SCROLL_REVEAL_SCRIPT, HERO_VIDEO_SCRIPT } from "./animations.js";
import { ThemeStylesSource } from "./theme-styles.generated.js";
import {
  LayoutSource,
  HomeSource,
  NewsListSource,
  NewsSingleSource,
  PageSource,
  BreadCrumbSource,
  BlockVideoHeroSource,
  BlockNewsGridSource,
  BlockTextSource,
  BlockAcademicSearchSource,
} from "./svelte-sources.generated.js";

function withBreadcrumb(source: string): string {
	return source.replace(
		'__BREADCRUMB_SNIPPET__',
		() => BreadCrumbSource
	);
}
/**
 * See themes/university/src/layouts.ts for the full rationale — `.svelte`
 * files are compiled at *site-build* time (apps/backend's
 * SvelteSiteRenderer), from raw source text written to a cache directory
 * unrelated to this package's file tree, so `Layout.svelte` can't `import`
 * these scripts itself. `JSON.stringify` turns each script into a properly
 * quoted/escaped JS string literal — the placeholders in Layout.svelte are
 * bare (unquoted) so the substituted value supplies its own quoting.
 *
 * `__THEME_STYLES__` follows the same trick, for the theme's CSS: authored
 * as assets/css/*.css, concatenated by scripts/generate-theme-styles.mjs
 * into `ThemeStylesSource`, spliced in here instead of living as one giant
 * inline `<style>` string inside Layout.svelte.
 */
function resolvePlaceholders(source: string): string {
  return source
    .replace("__SCROLL_REVEAL_SCRIPT__", () => JSON.stringify(SCROLL_REVEAL_SCRIPT))
    .replace("__HERO_VIDEO_SCRIPT__", () => JSON.stringify(HERO_VIDEO_SCRIPT))
    .replace("__THEME_STYLES__", () => JSON.stringify(ThemeStylesSource));
}

export const layoutLayout = defineLayout<string>({
  id: "layout",
  name: "Layout",
  description: "Shell HTML fakultas: strip logo akreditasi, navigasi lebar, dan footer multi-kolom.",
  regions: ["header", "footer"],
  render: resolvePlaceholders(LayoutSource),
});

export const homeLayout = defineLayout<string>({
  id: "home",
  name: "Beranda",
  description: "Hero dengan latar video sinematik, berita terbaru, halaman/program, dan pita ajakan bergabung.",
  render: HomeSource,
});

export const newsListLayout = defineLayout<string>({
  id: "news-list",
  name: "Daftar Berita",
  description: "Grid kartu semua berita yang dipublikasikan.",
  render: NewsListSource,
});

export const newsSingleLayout = defineLayout<string>({
  id: "news-single",
  name: "Detail Berita",
  description: "Tipografi artikel dengan meta kategori/tag.",
  render: withBreadcrumb(NewsSingleSource),
});

export const pageLayout = defineLayout<string>({
  id: "page",
  name: "Halaman Statis",
  description: "Body untuk Page biasa (bukan homepage).",
  render: withBreadcrumb(PageSource),
});

export const layouts = [layoutLayout, homeLayout, newsListLayout, newsSingleLayout, pageLayout];

/**
 * How this theme renders each block type (docs/theme_aware_prd.md §17).
 *
 * `core.hero` maps to the same component as `faculty.video-hero`, and
 * `core.search` to the same as `faculty.academic-search`: the pairs differ
 * only in which props the builder offers, not in how this theme draws them —
 * which is exactly what makes each block's declared fallback look seamless.
 *
 * Blocks with no entry here are skipped at render time rather than
 * half-drawn; add a component to support one.
 */
export const blockRenderers: Record<string, string> = {
  "core.hero": BlockVideoHeroSource,
  "faculty.video-hero": BlockVideoHeroSource,
  "core.search": BlockAcademicSearchSource,
  "faculty.academic-search": BlockAcademicSearchSource,
  "core.text": BlockTextSource,
  "core.news": BlockNewsGridSource,
};
