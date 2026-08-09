import { describe, expect, it } from "vitest";
import { facultyTheme } from "./theme.js";

describe("facultyTheme", () => {
  it("is a valid, frozen theme with all 5 layouts", () => {
    expect(facultyTheme.manifest.id).toBe("unej.theme-faculty");
    expect(facultyTheme.layouts).toHaveLength(5);
    expect(facultyTheme.layouts.map((layout) => layout.id).sort()).toEqual(
      ["home", "layout", "news-list", "news-single", "page"].sort(),
    );
  });

  it("declares header/footer regions and primary/footer menu locations", () => {
    expect(facultyTheme.regions?.map((region) => region.id)).toEqual(["header", "footer"]);
    expect(facultyTheme.menuLocations?.map((location) => location.id)).toEqual(["primary", "footer"]);
  });

  it("exposes video-hero and accreditation-logo settings", () => {
    expect(facultyTheme.settings?.heroVideoUrl?.type).toBe("media");
    expect(facultyTheme.settings?.heroVideoPoster?.type).toBe("media");
    expect(facultyTheme.settings?.accreditationLogos?.type).toBe("array");
    const heroHeadline = facultyTheme.settings?.heroHeadline;
    expect(heroHeadline && "default" in heroHeadline ? heroHeadline.default : undefined).toContain(
      "Mencetak Lulusan",
    );
  });

  it("declares fixed design tokens", () => {
    expect(facultyTheme.tokens?.colors?.background).toBe("#ffffff");
    expect(facultyTheme.tokens?.radius?.button).toBe("999px");
  });

  it("declares a 'default' template mapped to the 'page' layout", () => {
    expect(facultyTheme.templates).toHaveLength(1);
    expect(facultyTheme.templates?.[0]?.layout).toBe("page");
  });

  it("has no leftover placeholder markers in the layout source (substitution ran)", () => {
    const layout = facultyTheme.layouts.find((candidate) => candidate.id === "layout");
    expect(layout?.render).not.toContain("__SCROLL_REVEAL_SCRIPT__");
    expect(layout?.render).not.toContain("__HERO_VIDEO_SCRIPT__");
    expect(layout?.render).toContain("IntersectionObserver");
    expect(layout?.render).not.toContain("cms-form-embed");
  });
});

describe("layout rendering (Svelte SSR)", () => {
  const findLayout = (id: string) => {
    const layout = facultyTheme.layouts.find((candidate) => candidate.id === id);
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
    primaryColor: "#0d9488",
    secondaryColor: "#facc15",
    heroEyebrow: "Eyebrow uji",
    heroHeadline: "Headline uji",
    heroDescription: "Deskripsi uji",
    heroCtaLabel: "Ajakan uji",
    accreditationLogos: [{ url: "/logo.png", label: "Logo Uji" }],
    showLanguageSwitcher: true,
    showSearch: true,
  };

  it("renders the outer layout with title, logo strip, and dropdown nav", async () => {
    const { head, body } = await renderSvelte(findLayout("layout"), {
      site,
      theme,
      menus: {
        primary: [{ label: "Beranda", url: "/", newTab: false, clickable: true, children: [] }],
      },
      tokensCss: ":root{--theme-background:#fff;}",
      title: "Beranda",
      body: "<p>halo</p>",
      seo: { description: "Deskripsi uji.", keywords: "uji, tes", canonicalUrl: "https://example.test/", ogImage: null },
    });

    expect(head).toContain("<title>Beranda | Situs Uji</title>");
    expect(head).toContain('<meta name="description" content="Deskripsi uji."/>');
    expect(head).toContain('<meta name="keywords" content="uji, tes"/>');
    expect(body).toContain('src="/logo.png"');
    expect(body).toContain('alt="Logo Uji"');
    expect(body).toContain("lang-pill");
    expect(body).toContain("<p>halo</p>");
  });

  it("renders the home layout with a video hero", async () => {
    const { body } = await renderSvelte(findLayout("home"), {
      site,
      theme: { ...theme, heroVideoUrl: "/hero.mp4", heroVideoPoster: "/poster.jpg" },
      news: [],
      pages: [],
    });

    expect(body).toContain("Eyebrow uji");
    expect(body).toContain("Headline uji");
    expect(body).toContain('src="/hero.mp4"');
    expect(body).toContain('poster="/poster.jpg"');
  });

  it("falls back to the poster image when no video is set", async () => {
    const { body } = await renderSvelte(findLayout("home"), {
      site,
      theme: { ...theme, heroVideoPoster: "/poster-only.jpg" },
      news: [],
      pages: [],
    });

    expect(body).not.toContain("<video");
    expect(body).toContain('src="/poster-only.jpg"');
  });
});
