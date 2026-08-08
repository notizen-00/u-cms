import { describe, expect, it } from "vitest";
import { Eta } from "eta";
import { premiumTheme } from "./theme.js";

describe("premiumTheme", () => {
  it("is a valid, frozen theme with all 5 layouts", () => {
    expect(premiumTheme.manifest.id).toBe("unej.theme-premium");
    expect(premiumTheme.layouts).toHaveLength(5);
    expect(premiumTheme.layouts.map((layout) => layout.id).sort()).toEqual(
      ["home", "layout", "news-list", "news-single", "page"].sort(),
    );
  });

  it("declares header/footer regions and a primary menu location", () => {
    expect(premiumTheme.regions?.map((region) => region.id)).toEqual(["header", "footer"]);
    expect(premiumTheme.menuLocations?.[0]?.id).toBe("primary");
  });

  it("exposes primaryColor and heroTagline settings with defaults", () => {
    expect(premiumTheme.settings?.primaryColor?.type).toBe("color");
    expect(premiumTheme.settings?.heroTagline?.type).toBe("string");
  });
});

describe("layout rendering (Eta)", () => {
  const eta = new Eta({ autoEscape: true });
  const findLayout = (id: string) => {
    const layout = premiumTheme.layouts.find((candidate) => candidate.id === id);
    if (!layout) throw new Error(`layout "${id}" not found`);
    return layout.render;
  };

  const site = { name: "Situs Uji", slug: "test", logoUrl: null, faviconUrl: null };
  const theme = { primaryColor: "#4f46e5", heroTagline: "Tagline uji" };

  const seo = { description: "Deskripsi uji.", keywords: "uji, tes", canonicalUrl: "https://example.test/", ogImage: null };

  it("renders the outer layout with title, site, theme, and body", () => {
    const html = eta.renderString(findLayout("layout"), {
      title: "Beranda",
      site,
      theme,
      menus: {},
      seo,
      body: "<p>halo</p>",
    });
    expect(html).toContain("<title>Beranda | Situs Uji</title>");
    expect(html).toContain("--primary: #4f46e5;");
    expect(html).toContain("Tagline uji");
    expect(html).toContain("<p>halo</p>");
    expect(html).toContain('<meta name="description" content="Deskripsi uji.">');
    expect(html).toContain('<meta name="keywords" content="uji, tes">');
  });

  it("renders the home layout with hero tagline, news cards, and pages", () => {
    const html = eta.renderString(findLayout("home"), {
      site,
      theme,
      news: [{ slug: "a", title: "Berita A", excerpt: "Ringkasan" }],
      pages: [{ slug: "tentang", title: "Tentang" }],
    });
    expect(html).toContain("Tagline uji");
    expect(html).toContain("Berita A");
    expect(html).toContain("Ringkasan");
    expect(html).toContain("Tentang");
  });

  it("renders the news-list layout, including the empty state", () => {
    const empty = eta.renderString(findLayout("news-list"), { news: [] });
    expect(empty).toContain("Belum ada berita.");

    const withItems = eta.renderString(findLayout("news-list"), {
      news: [{ slug: "a", title: "Berita A", excerpt: "Ringkasan", categories: [{ name: "Kampus" }], tags: [] }],
    });
    expect(withItems).toContain("Berita A");
    expect(withItems).toContain("Kampus");
  });

  it("renders the news-single layout with taxonomies as pills", () => {
    const html = eta.renderString(findLayout("news-single"), {
      item: {
        title: "Judul Berita",
        publishedAt: "2026-01-01",
        categories: [{ name: "Kampus", slug: "kampus" }],
        tags: [{ name: "unej", slug: "unej" }],
        bodyHtml: "<p>isi</p>",
      },
    });
    expect(html).toContain("Judul Berita");
    expect(html).toContain("Kampus");
    expect(html).toContain("#unej");
    expect(html).toContain("<p>isi</p>");
  });

  it("renders the page layout", () => {
    const html = eta.renderString(findLayout("page"), {
      item: { title: "Halaman Statis", bodyHtml: "<p>konten</p>" },
    });
    expect(html).toContain("Halaman Statis");
    expect(html).toContain("<p>konten</p>");
  });
});
