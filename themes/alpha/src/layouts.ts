import { defineLayout } from "@unej-cms/sdk-theme";
import { SCROLL_REVEAL_SCRIPT, HERO_VIDEO_SCRIPT } from "./animations.js";
import { ThemeStylesSource } from "./theme-styles.generated.js";
import {
  LayoutSource,
  HomeSource,
  NewsListSource,
  NewsSingleSource,
  PageSource,
  BlockBattleHeroSource,
  BlockStatsStripSource,
  BlockModeGridSource,
  BlockNewsGridSource,
  BlockTextSource,
} from "./svelte-sources.generated.js";

/**
 * `.svelte` files are compiled at *site-build* time (apps/backend's
 * SvelteSiteRenderer), from raw source text written to a cache directory
 * unrelated to this package's file tree, so `Layout.svelte` can't `import`
 * these scripts/styles itself. `JSON.stringify` turns each into a properly
 * quoted/escaped JS string literal — the placeholders in Layout.svelte are
 * bare (unquoted) so the substituted value supplies its own quoting.
 *
 * `__THEME_STYLES__` follows the same trick for the theme's CSS: authored as
 * assets/css/*.css (separate files per concern, never one giant inline
 * stylesheet), concatenated by scripts/generate-theme-styles.mjs into
 * `ThemeStylesSource`, spliced in here.
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
  description: "Shell HTML gelap: header sticky, navigasi utama, dan footer multi-kolom.",
  regions: ["header", "footer"],
  render: resolvePlaceholders(LayoutSource),
});

export const homeLayout = defineLayout<string>({
  id: "home",
  name: "Beranda",
  description: "Hero sinematik, pita statistik, berita terbaru, dan halaman, dipakai ketika belum ada Page bertanda homepage.",
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
  render: NewsSingleSource,
});

export const pageLayout = defineLayout<string>({
  id: "page",
  name: "Halaman Statis",
  description: "Body untuk Page biasa (bukan homepage).",
  render: PageSource,
});

export const layouts = [layoutLayout, homeLayout, newsListLayout, newsSingleLayout, pageLayout];

/**
 * How this theme renders each block type (docs/theme_aware_prd.md §17).
 *
 * `core.hero` maps to the same component as `alpha.battle-hero`: the pair
 * differs only in which props the builder offers, not in how this theme
 * draws it — which is exactly what makes the declared fallback look
 * seamless after a theme switch.
 *
 * Blocks with no entry here (`core.image`, `core.video`, `core.button`,
 * `core.search`, `core.events`, `core.gallery`, ...) fall back to the CMS's
 * own generic renderer (block-content-renderer.ts's `renderCoreBlockFallback`)
 * rather than being half-drawn — add a component here to give one this
 * theme's own look instead.
 */
export const blockRenderers: Record<string, string> = {
  "core.hero": BlockBattleHeroSource,
  "alpha.battle-hero": BlockBattleHeroSource,
  "alpha.stats-strip": BlockStatsStripSource,
  "alpha.mode-grid": BlockModeGridSource,
  "core.text": BlockTextSource,
  "core.news": BlockNewsGridSource,
};
