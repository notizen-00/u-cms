import { describe, expect, it } from "vitest";
import { parseWxr, WxrParseError } from "./wxr-parser.js";

// A small hand-crafted WXR fixture exercising every mapping path the parser
// handles: one category, one tag, one attachment (used as a post's featured
// image), a parent/child page pair, one post referencing the category/tag/
// thumbnail, plus an auto-draft and a nav_menu_item that must both be
// dropped.
const FIXTURE_WXR = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>Contoh Fakultas</title>
  <wp:category>
    <wp:term_id>5</wp:term_id>
    <wp:category_nicename>berita</wp:category_nicename>
    <wp:category_parent></wp:category_parent>
    <wp:cat_name><![CDATA[Berita]]></wp:cat_name>
  </wp:category>
  <wp:tag>
    <wp:term_id>12</wp:term_id>
    <wp:tag_slug>riset</wp:tag_slug>
    <wp:tag_name><![CDATA[Riset]]></wp:tag_name>
  </wp:tag>
  <item>
    <title>logo-fakultas.png</title>
    <guid isPermaLink="false">http://old.example.ac.id/?attachment_id=456</guid>
    <wp:post_id>456</wp:post_id>
    <wp:post_type>attachment</wp:post_type>
    <wp:status>inherit</wp:status>
    <wp:attachment_url>http://old.example.ac.id/wp-content/uploads/2024/01/logo-fakultas.png</wp:attachment_url>
  </item>
  <item>
    <title>Tentang Kami</title>
    <guid isPermaLink="false">http://old.example.ac.id/?page_id=10</guid>
    <content:encoded><![CDATA[<p>Halaman <strong>tentang</strong> kami.</p>]]></content:encoded>
    <wp:post_id>10</wp:post_id>
    <wp:post_name>tentang-kami</wp:post_name>
    <wp:post_date_gmt>2024-01-10 03:00:00</wp:post_date_gmt>
    <wp:status>publish</wp:status>
    <wp:post_parent>0</wp:post_parent>
    <wp:post_type>page</wp:post_type>
  </item>
  <item>
    <title>Visi &amp; Misi</title>
    <guid isPermaLink="false">http://old.example.ac.id/?page_id=11</guid>
    <content:encoded><![CDATA[<p>Visi dan misi kami.</p>]]></content:encoded>
    <wp:post_id>11</wp:post_id>
    <wp:post_name>visi-misi</wp:post_name>
    <wp:post_date_gmt>0000-00-00 00:00:00</wp:post_date_gmt>
    <wp:status>draft</wp:status>
    <wp:post_parent>10</wp:post_parent>
    <wp:post_type>page</wp:post_type>
  </item>
  <item>
    <title>Seminar Nasional 2024</title>
    <guid isPermaLink="false">http://old.example.ac.id/?p=123</guid>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <content:encoded><![CDATA[<h2>Seminar</h2><p>Isi berita.</p>]]></content:encoded>
    <excerpt:encoded><![CDATA[Ringkasan berita.]]></excerpt:encoded>
    <wp:post_id>123</wp:post_id>
    <wp:post_name>seminar-nasional-2024</wp:post_name>
    <wp:post_date_gmt>2024-03-05 08:30:00</wp:post_date_gmt>
    <wp:status>publish</wp:status>
    <wp:post_parent>0</wp:post_parent>
    <wp:post_type>post</wp:post_type>
    <category domain="category" nicename="berita"><![CDATA[Berita]]></category>
    <category domain="post_tag" nicename="riset"><![CDATA[Riset]]></category>
    <wp:postmeta>
      <wp:meta_key>_thumbnail_id</wp:meta_key>
      <wp:meta_value>456</wp:meta_value>
    </wp:postmeta>
  </item>
  <item>
    <title>Auto Draft</title>
    <guid isPermaLink="false">http://old.example.ac.id/?p=999</guid>
    <wp:post_id>999</wp:post_id>
    <wp:status>auto-draft</wp:status>
    <wp:post_type>post</wp:post_type>
  </item>
  <item>
    <title>Primary Menu Item</title>
    <wp:post_id>77</wp:post_id>
    <wp:status>publish</wp:status>
    <wp:post_type>nav_menu_item</wp:post_type>
  </item>
</channel>
</rss>`;

describe("parseWxr", () => {
  it("throws WxrParseError for XML that isn't a WXR export", () => {
    expect(() => parseWxr("<not-wxr></not-wxr>")).toThrow(WxrParseError);
  });

  it("parses categories and tags from the channel", () => {
    const result = parseWxr(FIXTURE_WXR);
    expect(result.categories).toEqual([{ wpId: 5, name: "Berita", slug: "berita" }]);
    expect(result.tags).toEqual([{ wpId: 12, name: "Riset", slug: "riset" }]);
  });

  it("parses an attachment item", () => {
    const result = parseWxr(FIXTURE_WXR);
    expect(result.attachments).toEqual([
      {
        wpId: 456,
        guid: "http://old.example.ac.id/?attachment_id=456",
        title: "logo-fakultas.png",
        sourceUrl: "http://old.example.ac.id/wp-content/uploads/2024/01/logo-fakultas.png",
      },
    ]);
  });

  it("parses pages, resolving parent/child hierarchy by wpId and dropping an all-zero date", () => {
    const result = parseWxr(FIXTURE_WXR);
    expect(result.pages).toHaveLength(2);

    const parent = result.pages.find((p) => p.wpId === 10);
    expect(parent).toMatchObject({
      title: "Tentang Kami",
      slug: "tentang-kami",
      status: "published",
      parentWpId: undefined,
    });
    expect(parent?.publishedAt).toBeInstanceOf(Date);

    const child = result.pages.find((p) => p.wpId === 11);
    expect(child).toMatchObject({
      title: "Visi & Misi",
      status: "draft",
      parentWpId: 10,
      publishedAt: undefined,
    });
  });

  it("parses a post, resolving its category/tag refs by nicename and its featured image by postmeta", () => {
    const result = parseWxr(FIXTURE_WXR);
    expect(result.posts).toHaveLength(1);
    const post = result.posts[0];
    expect(post).toMatchObject({
      wpId: 123,
      title: "Seminar Nasional 2024",
      slug: "seminar-nasional-2024",
      status: "published",
      contentHtml: "<h2>Seminar</h2><p>Isi berita.</p>",
      excerptHtml: "Ringkasan berita.",
      categoryWpIds: [5],
      tagWpIds: [12],
      thumbnailWpId: 456,
    });
    expect(post?.publishedAt).toBeInstanceOf(Date);
  });

  it("drops auto-draft posts and unsupported post types (nav_menu_item)", () => {
    const result = parseWxr(FIXTURE_WXR);
    const wpIds = [...result.posts.map((p) => p.wpId), ...result.pages.map((p) => p.wpId)];
    expect(wpIds).not.toContain(999);
    expect(wpIds).not.toContain(77);
  });
});
