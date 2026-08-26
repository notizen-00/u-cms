import { describe, expect, it } from "vitest";
import { alphaTheme } from "./theme.js";

describe("alphaTheme", () => {
  it("is a valid, frozen theme with all 5 layouts", () => {
    expect(alphaTheme.manifest.id).toBe("unej.theme-alpha");
    expect(alphaTheme.layouts).toHaveLength(5);
    expect(alphaTheme.layouts.map((layout) => layout.id).sort()).toEqual(
      ["home", "layout", "news-list", "news-single", "page"].sort(),
    );
  });

  it("declares header/footer regions and primary/footer menu locations", () => {
    expect(alphaTheme.regions?.map((region) => region.id)).toEqual(["header", "footer"]);
    expect(alphaTheme.menuLocations?.map((location) => location.id)).toEqual(["primary", "footer"]);
  });

  it("exposes hero and stats-strip settings", () => {
    expect(alphaTheme.settings?.heroBackgroundVideo?.type).toBe("media");
    expect(alphaTheme.settings?.heroBackgroundImage?.type).toBe("media");
    expect(alphaTheme.settings?.statItems?.type).toBe("array");
    const heroHeadline = alphaTheme.settings?.heroHeadline;
    expect(heroHeadline && "default" in heroHeadline ? heroHeadline.default : undefined).toContain(
      "MEDAN PERTEMPURAN",
    );
  });

  it("declares fixed design tokens — dark background, square-ish radius", () => {
    expect(alphaTheme.tokens?.colors?.background).toBe("#0a0a0c");
    expect(alphaTheme.tokens?.radius?.button).toBe("2px");
  });

  it("declares a 'default' template mapped to the 'page' layout", () => {
    expect(alphaTheme.templates).toHaveLength(1);
    expect(alphaTheme.templates?.[0]?.layout).toBe("page");
  });

  it("declares alpha.battle-hero, alpha.stats-strip, and alpha.mode-grid, each with a core fallback", () => {
    const ids = alphaTheme.blocks?.map((block) => block.id) ?? [];
    expect(ids).toEqual(["alpha.battle-hero", "alpha.stats-strip", "alpha.mode-grid"]);
    expect(alphaTheme.blocks?.find((block) => block.id === "alpha.battle-hero")?.fallback).toBe("core.hero");
    expect(alphaTheme.blocks?.find((block) => block.id === "alpha.stats-strip")?.fallback).toBe("core.text");
    expect(alphaTheme.blocks?.find((block) => block.id === "alpha.mode-grid")?.fallback).toBe("core.gallery");
  });

  /**
   * The Dashboard's block picker seeds a newly-added block's props straight
   * from each field's schema `default` (apps/dashboard's block-mutations.ts
   * `defaultPropsFor`) — so a field with no `default` here is a field a user
   * drops onto their page blank. Media fields are the deliberate exception
   * (no real file to default to); every other field on this theme's own
   * blocks should come pre-filled.
   */
  it("seeds every non-media block field with a real default, so the block picker never drops one in blank", () => {
    const nonMediaFieldsOf = (block: NonNullable<typeof alphaTheme.blocks>[number]) =>
      Object.entries(block.propertySchema).filter(([, field]) => field.type !== "media");

    for (const block of alphaTheme.blocks ?? []) {
      for (const [key, field] of nonMediaFieldsOf(block)) {
        expect(field, `${block.id}.${key} should declare a default`).toHaveProperty("default");
        expect((field as { default?: unknown }).default, `${block.id}.${key}'s default should not be empty`).not.toBe(
          "",
        );
      }
    }
  });

  it("starts a new site with a battle hero, stats strip, mode grid, and news homepage", () => {
    expect(alphaTheme.defaultHomepage?.map((block) => block.type)).toEqual([
      "alpha.battle-hero",
      "alpha.stats-strip",
      "alpha.mode-grid",
      "core.news",
    ]);
  });

  /**
   * Applying/re-applying this theme (ThemesService.ensureHomepage) seeds an
   * untouched homepage from `defaultHomepage` — so every block this theme
   * declares should actually appear in it. Otherwise switching to Alpha
   * leaves one of its own sections needing to be added by hand from the
   * block picker instead of just being there, ready to click and edit.
   */
  it("seeds every block this theme declares onto the starter homepage", () => {
    const declaredTypes = (alphaTheme.blocks ?? []).map((block) => block.id);
    const seededTypes = (alphaTheme.defaultHomepage ?? []).map((block) => block.type);
    for (const type of declaredTypes) {
      expect(seededTypes, `defaultHomepage should include this theme's own "${type}" block`).toContain(type);
    }
  });

  it("has no leftover placeholder markers in the layout source (substitution ran)", () => {
    const layout = alphaTheme.layouts.find((candidate) => candidate.id === "layout");
    expect(layout?.render).not.toContain("__SCROLL_REVEAL_SCRIPT__");
    expect(layout?.render).not.toContain("__HERO_VIDEO_SCRIPT__");
    expect(layout?.render).not.toContain("__SEARCH_MODAL_SCRIPT__");
    expect(layout?.render).not.toContain("__THEME_STYLES__");
    expect(layout?.render).toContain("IntersectionObserver");
    expect(layout?.render).toContain("btn-cut");
    expect(layout?.render).toContain("__NEWS_SEARCH_INDEX__");
  });
});

describe("layout rendering (Svelte SSR)", () => {
  const findLayout = (id: string) => {
    const layout = alphaTheme.layouts.find((candidate) => candidate.id === id);
    if (!layout) throw new Error(`layout "${id}" not found`);
    return layout.render;
  };

  async function renderSvelte(source: string, props: Record<string, unknown>) {
    const { compile } = await import("svelte/compiler");
    const { render } = await import("svelte/server");
    const { js } = compile(source, { generate: "server", filename: "Test.svelte" });

    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath, pathToFileURL } = await import("node:url");

    const cacheDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".test-svelte-cache");
    await mkdir(cacheDir, { recursive: true });
    const file = join(cacheDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
    await writeFile(file, js.code, "utf-8");
    const mod = (await import(pathToFileURL(file).href)) as { default: unknown };

    const renderComponent = render as unknown as (
      component: unknown,
      options: { props: Record<string, unknown> },
    ) => { head: string; body: string };
    return renderComponent(mod.default, { props });
  }

  const site = { name: "Situs Uji", slug: "test", logoUrl: null, faviconUrl: null };
  const theme = {
    primaryColor: "#f2a900",
    secondaryColor: "#e1261c",
    heroEyebrow: "Eyebrow uji",
    heroHeadline: "Headline uji",
    heroDescription: "Deskripsi uji",
    heroCtaLabel: "Ajakan uji",
    heroCtaUrl: "/mulai",
    statItems: [{ value: "1JT+", label: "PEMAIN" }],
    showSearch: true,
  };

  it("renders the outer layout with title, dropdown nav, and injected body", async () => {
    const { head, body } = await renderSvelte(findLayout("layout"), {
      site,
      theme,
      menus: {
        primary: [{ label: "Beranda", url: "/", newTab: false, clickable: true, children: [] }],
      },
      tokensCss: ":root{--theme-background:#0a0a0c;}",
      title: "Beranda",
      body: "<p>halo</p>",
      seo: { description: "Deskripsi uji.", keywords: "uji, tes", canonicalUrl: "https://example.test/", ogImage: null },
      news: [
        { slug: "a", title: "Berita A", excerpt: "Ringkasan A", categories: [], featuredImageUrl: null, publishedAt: "2026-01-01" },
      ],
    });

    expect(head).toContain("<title>Beranda | Situs Uji</title>");
    expect(head).toContain('<meta name="description" content="Deskripsi uji."/>');
    expect(head).toContain('<meta name="keywords" content="uji, tes"/>');
    expect(body).toContain("Beranda");
    expect(body).toContain("<p>halo</p>");
  });

  it("renders a top-level menu item's children as mega-panel columns, and their children as that column's links", async () => {
    const { body } = await renderSvelte(findLayout("layout"), {
      site,
      theme,
      menus: {
        primary: [
          {
            label: "Game Info",
            url: "/game-info/",
            newTab: false,
            clickable: false,
            children: [
              {
                label: "Mode",
                url: "/game-info/mode/",
                newTab: false,
                clickable: true,
                children: [
                  { label: "Battle Royale", url: "/game-info/mode/battle-royale/", newTab: false, clickable: true, children: [] },
                ],
              },
            ],
          },
        ],
      },
      tokensCss: "",
      title: "Beranda",
      body: "<p>halo</p>",
      seo: { description: "d", keywords: "k", canonicalUrl: null, ogImage: null },
      news: [],
    });

    expect(body).toContain("mega-panel");
    expect(body).toContain("mega-col__title");
    expect(body).toContain(">Mode<");
    expect(body).toContain(">Battle Royale<");
    expect(body).toContain('href="/game-info/mode/battle-royale/"');
  });

  it("embeds a search modal and its news index when showSearch is on, and omits both when off", async () => {
    const newsItem = {
      slug: "berita-a",
      title: "Berita A",
      excerpt: "Ringkasan A",
      categories: [{ name: "Kampus", slug: "kampus" }],
      featuredImageUrl: null,
      publishedAt: "2026-01-01",
    };
    const baseProps = {
      site,
      menus: {},
      tokensCss: ":root{--theme-background:#0a0a0c;}",
      title: "Beranda",
      body: "<p>halo</p>",
      seo: { description: "d", keywords: "k", canonicalUrl: null, ogImage: null },
      news: [newsItem],
    };

    const on = await renderSvelte(findLayout("layout"), { ...baseProps, theme: { ...theme, showSearch: true } });
    expect(on.body).toContain("data-search-modal");
    expect(on.body).toContain("data-search-open");
    expect(on.body).toContain("__NEWS_SEARCH_INDEX__");
    expect(on.body).toContain("Berita A");

    const off = await renderSvelte(findLayout("layout"), { ...baseProps, theme: { ...theme, showSearch: false } });
    expect(off.body).not.toContain("data-search-modal");
    expect(off.body).not.toContain("data-search-open");
    expect(off.body).not.toContain("__NEWS_SEARCH_INDEX__");
  });

  it("renders the home layout with hero, stats, news, and info cards", async () => {
    const { body } = await renderSvelte(findLayout("home"), {
      site,
      theme: { ...theme, heroBackgroundVideo: "/hero.mp4", heroBackgroundImage: "/poster.jpg" },
      news: [{ slug: "a", title: "Berita A", excerpt: "Ringkasan A", categories: [], featuredImageUrl: null, publishedAt: null }],
      pages: [{ slug: "tentang", title: "Tentang" }],
    });

    expect(body).toContain("Eyebrow uji");
    expect(body).toContain("Headline uji");
    expect(body).toContain('src="/hero.mp4"');
    expect(body).toContain('poster="/poster.jpg"');
    expect(body).toContain("1JT+");
    expect(body).toContain("PEMAIN");
    expect(body).toContain("Berita A");
    expect(body).toContain("Tentang");
  });

  it("renders the news-single layout with taxonomy pills", async () => {
    const { body } = await renderSvelte(findLayout("news-single"), {
      item: {
        title: "Judul Berita",
        publishedAt: "2026-01-01",
        categories: [{ name: "Kampus", slug: "kampus" }],
        tags: [{ name: "unej", slug: "unej" }],
        bodyHtml: "<p>isi</p>",
      },
    });

    expect(body).toContain("Judul Berita");
    expect(body).toContain("Kampus");
    expect(body).toContain("#unej");
    expect(body).toContain("<p>isi</p>");
  });
});
