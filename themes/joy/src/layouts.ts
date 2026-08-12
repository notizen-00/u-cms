import { defineLayout } from "@unej-cms/sdk-theme";
import { SCROLL_REVEAL_SCRIPT } from "./animations.js";
import {
  LayoutSource,
  HomeSource,
  NewsListSource,
  NewsSingleSource,
  PageSource,
  BlockHeroSource,
  BlockNewsGridSource,
  BlockTextSource,
  BlockAnnouncementSource,
} from "./svelte-sources.generated.js";

/**
 * `Layout.svelte` can't `import` these scripts itself — it's compiled at
 * *site-build* time (apps/backend's SvelteSiteRenderer) from raw source
 * text written to a cache directory unrelated to this package's file tree,
 * so any relative import in the component source would fail to resolve.
 * Substituting the real script text into the placeholders here (before the
 * source ever reaches the Svelte compiler) keeps the script reusable/DRY
 * while producing fully self-contained `.svelte` source text.
 */
function resolvePlaceholders(source: string): string {
  // `JSON.stringify` turns each script into a properly quoted/escaped JS
  // string literal — the placeholders in Layout.svelte are bare (unquoted)
  // so the substituted value supplies its own quoting, since the scripts
  // are multi-line and would otherwise break out of a hand-written quote.
  return source.replace("__SCROLL_REVEAL_SCRIPT__", () => JSON.stringify(SCROLL_REVEAL_SCRIPT));
}

export const layoutLayout = defineLayout<string>({
  id: "layout",
  name: "Layout",
  description: "Shell HTML: header sticky dengan navigasi dropdown, dan footer multi-kolom.",
  regions: ["header", "footer"],
  render: resolvePlaceholders(LayoutSource),
});

export const homeLayout = defineLayout<string>({
  id: "home",
  name: "Beranda",
  description: "Hero dengan statistik, berita terbaru, halaman pilihan, dan pita ajakan bergabung.",
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
 * `core.hero` and `joy.image-hero` deliberately share one component: the two
 * differ only in which props the builder offers, not in how this theme draws
 * a hero — and sharing is what makes the `joy.image-hero -> core.hero`
 * fallback visually seamless.
 *
 * Blocks with no entry here (`core.video`, `core.events`, ...) are skipped at
 * render time rather than half-drawn; add a component here to support one.
 */
export const blockRenderers: Record<string, string> = {
  "core.hero": BlockHeroSource,
  "joy.image-hero": BlockHeroSource,
  "core.text": BlockTextSource,
  "core.news": BlockNewsGridSource,
  "joy.announcement": BlockAnnouncementSource,
};
