import { describe, expect, it } from "vitest";
import { universityTheme } from "./theme.js";

describe("universityTheme", () => {
  it("is a valid, frozen theme with all 5 layouts", () => {
    expect(universityTheme.manifest.id).toBe("unej.theme-university");
    expect(universityTheme.layouts).toHaveLength(5);
    expect(universityTheme.layouts.map((layout) => layout.id).sort()).toEqual(
      ["home", "layout", "news-list", "news-single", "page"].sort(),
    );
  });

  it("declares header/footer regions and primary/footer menu locations", () => {
    expect(universityTheme.regions?.map((region) => region.id)).toEqual(["header", "footer"]);
    expect(universityTheme.menuLocations?.map((location) => location.id)).toEqual(["primary", "footer"]);
  });

  it("exposes the expected settings with defaults", () => {
    expect(universityTheme.settings?.primaryColor?.type).toBe("color");
    expect(universityTheme.settings?.secondaryColor?.type).toBe("color");
    expect(universityTheme.settings?.statStudents?.default).toBe("15.000+");
  });

  it("declares fixed design tokens", () => {
    expect(universityTheme.tokens?.colors?.background).toBe("#ffffff");
    expect(universityTheme.tokens?.radius?.card).toBe("16px");
  });

  it("declares a 'default' template mapped to the 'page' layout", () => {
    expect(universityTheme.templates).toHaveLength(1);
    expect(universityTheme.templates?.[0]?.layout).toBe("page");
  });

  it("has no leftover placeholder markers in the layout source (substitution ran)", () => {
    const layout = universityTheme.layouts.find((candidate) => candidate.id === "layout");
    expect(layout?.render).not.toContain("__SCROLL_REVEAL_SCRIPT__");
    expect(layout?.render).not.toContain("__FORM_SUBMIT_SCRIPT__");
    expect(layout?.render).toContain("IntersectionObserver");
  });
});

describe("layout rendering (Svelte SSR)", () => {
  const findLayout = (id: string) => {
    const layout = universityTheme.layouts.find((candidate) => candidate.id === id);
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

    // Written inside this package (not `os.tmpdir()`) so the compiled
    // output's `import ... from 'svelte/internal/server'` resolves via this
    // package's own `node_modules/svelte` — same reasoning as
    // `SvelteSiteRenderer.compileAndImport` in apps/backend.
    const cacheDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".test-svelte-cache");
    await mkdir(cacheDir, { recursive: true });
    const file = join(cacheDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
    await writeFile(file, js.code, "utf-8");
    const mod = (await import(pathToFileURL(file).href)) as { default: unknown };

    return render(mod.default as never, { props }) as unknown as { head: string; body: string };
  }

  const site = { name: "Situs Uji", slug: "test", logoUrl: null, faviconUrl: null };
  const theme = {
    primaryColor: "#0f4c81",
    secondaryColor: "#f2a900",
    heroTagline: "Tagline uji",
    accreditationText: "Akreditasi Uji",
    statStudents: "1.000+",
    statPrograms: "10",
    statFaculty: "50",
    statAlumni: "5.000+",
  };

  it("renders the outer layout with title, dropdown nav, and injected body", async () => {
    const { head, body } = await renderSvelte(findLayout("layout"), {
      site,
      theme,
      menus: {
        primary: [
          {
            label: "Profil",
            url: "#",
            newTab: false,
            clickable: false,
            children: [{ label: "Sejarah", url: "/sejarah/", newTab: false, clickable: true, children: [] }],
          },
        ],
      },
      tokensCss: ":root{--theme-background:#fff;}",
      title: "Beranda",
      body: "<p>halo</p>",
      seo: { description: "Deskripsi uji.", keywords: "uji, tes", canonicalUrl: "https://example.test/", ogImage: null },
    });

    expect(head).toContain("<title>Beranda | Situs Uji</title>");
    expect(head).toContain('<meta name="description" content="Deskripsi uji."/>');
    expect(head).toContain('<meta name="keywords" content="uji, tes"/>');
    expect(head).toContain('<link rel="canonical" href="https://example.test/"/>');
    expect(body).toContain("nav-item-label");
    expect(body).toContain("Profil");
    expect(body).toContain('href="/sejarah/"');
    expect(body).toContain("<p>halo</p>");
    expect(head).toContain(":root{--theme-background:#fff;}");
  });

  it("renders the home layout with hero, stats, news, and info cards", async () => {
    const { body } = await renderSvelte(findLayout("home"), {
      site,
      theme,
      news: [{ slug: "a", title: "Berita A", excerpt: "Ringkasan", categories: [], tags: [] }],
      pages: [{ slug: "tentang", title: "Tentang", isHomepage: false }],
    });

    expect(body).toContain("Tagline uji");
    expect(body).toContain("1.000+");
    expect(body).toContain("Berita A");
    expect(body).toContain("Tentang");
  });

  it("renders the news-single layout with taxonomy pills", async () => {
    const { body } = await renderSvelte(findLayout("news-single"), {
      item: {
        title: "Judul Berita",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
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

  it("renders the page layout", async () => {
    const { body } = await renderSvelte(findLayout("page"), {
      item: { title: "Halaman Statis", bodyHtml: "<p>konten</p>" },
    });

    expect(body).toContain("Halaman Statis");
    expect(body).toContain("<p>konten</p>");
  });
});
