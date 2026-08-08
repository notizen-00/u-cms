import { describe, expect, it } from "vitest";
import { Eta } from "eta";
import { defaultTheme } from "./theme.js";

describe("defaultTheme", () => {
  it("is a valid, frozen theme with all 5 layouts", () => {
    expect(defaultTheme.manifest.id).toBe("unej.theme-default");
    expect(defaultTheme.layouts).toHaveLength(5);
    expect(defaultTheme.layouts.map((layout) => layout.id).sort()).toEqual(
      ["home", "layout", "news-list", "news-single", "page"].sort(),
    );
  });

  it("declares header/footer regions and a primary menu location", () => {
    expect(defaultTheme.regions?.map((region) => region.id)).toEqual(["header", "footer"]);
    expect(defaultTheme.menuLocations?.[0]?.id).toBe("primary");
  });

  it("exposes a primaryColor setting with a default", () => {
    expect(defaultTheme.settings?.primaryColor?.type).toBe("color");
  });
});

describe("layout rendering (Eta)", () => {
  const eta = new Eta({ autoEscape: true });
  const findLayout = (id: string) => {
    const layout = defaultTheme.layouts.find((candidate) => candidate.id === id);
    if (!layout) throw new Error(`layout "${id}" not found`);
    return layout.render;
  };

  const site = { name: "Situs Uji", slug: "test", logoUrl: null, faviconUrl: null };
  const theme = { primaryColor: "#075985" };

  it("renders the outer layout with title, site, theme, and body", () => {
    const html = eta.renderString(findLayout("layout"), {
      title: "Beranda",
      site,
      theme,
      menus: {},
      body: "<p>halo</p>",
    });
    expect(html).toContain("<title>Beranda | Situs Uji</title>");
    expect(html).toContain("background:#075985");
    expect(html).toContain("<p>halo</p>");
  });

  it("renders the home layout with news and pages lists", () => {
    const html = eta.renderString(findLayout("home"), {
      news: [{ slug: "a", title: "Berita A" }],
      pages: [{ slug: "tentang", title: "Tentang" }],
    });
    expect(html).toContain("Berita A");
    expect(html).toContain("Tentang");
  });

  it("renders the news-list layout, including the empty state", () => {
    const empty = eta.renderString(findLayout("news-list"), { news: [] });
    expect(empty).toContain("Belum ada berita.");

    const withItems = eta.renderString(findLayout("news-list"), {
      news: [{ slug: "a", title: "Berita A", excerpt: "Ringkasan", categories: [], tags: [] }],
    });
    expect(withItems).toContain("Berita A");
    expect(withItems).toContain("Ringkasan");
  });

  it("renders the news-single layout with taxonomies", () => {
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
