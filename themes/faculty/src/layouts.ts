import { defineLayout } from "@unej-cms/sdk-theme";
import { FORM_SUBMIT_SCRIPT } from "./form-script.js";
import { SCROLL_REVEAL_SCRIPT, HERO_VIDEO_SCRIPT } from "./animations.js";
import {
  LayoutSource,
  HomeSource,
  NewsListSource,
  NewsSingleSource,
  PageSource,
} from "./svelte-sources.generated.js";

/**
 * See themes/university/src/layouts.ts for the full rationale — `.svelte`
 * files are compiled at *site-build* time (apps/backend's
 * SvelteSiteRenderer), from raw source text written to a cache directory
 * unrelated to this package's file tree, so `Layout.svelte` can't `import`
 * these scripts itself. `JSON.stringify` turns each script into a properly
 * quoted/escaped JS string literal — the placeholders in Layout.svelte are
 * bare (unquoted) so the substituted value supplies its own quoting.
 */
function resolvePlaceholders(source: string): string {
  return source
    .replace("__SCROLL_REVEAL_SCRIPT__", () => JSON.stringify(SCROLL_REVEAL_SCRIPT))
    .replace("__HERO_VIDEO_SCRIPT__", () => JSON.stringify(HERO_VIDEO_SCRIPT))
    .replace("__FORM_SUBMIT_SCRIPT__", () => JSON.stringify(FORM_SUBMIT_SCRIPT));
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
  render: NewsSingleSource,
});

export const pageLayout = defineLayout<string>({
  id: "page",
  name: "Halaman Statis",
  description: "Body untuk Page biasa (bukan homepage).",
  render: PageSource,
});

export const layouts = [layoutLayout, homeLayout, newsListLayout, newsSingleLayout, pageLayout];
