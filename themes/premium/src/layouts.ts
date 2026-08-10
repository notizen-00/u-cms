import { defineLayout } from "@unej-cms/sdk-theme";

/**
 * `render` is the raw Eta template source. `TRender = string` — the Builder
 * Runtime (apps/backend's `EtaSiteRenderer`) knows to interpret it that way;
 * the SDK itself stays opaque about the representation (Runtime Independent
 * principle). All CSS lives in the `layout` entry so every page shares one
 * stylesheet with no extra network round-trip.
 */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --primary: <%= it.theme.primaryColor %>;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --surface: #ffffff;
  --bg: #f8fafc;
  --radius: 14px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #f1f5f9;
    --muted: #94a3b8;
    --line: #1e293b;
    --surface: #111827;
    --bg: #0b1220;
  }
}

* { box-sizing: border-box; }

html { color-scheme: light dark; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

img { max-width: 100%; height: auto; display: block; }

.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.site-header .wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-size: 19px;
  color: var(--ink);
}
.brand img { height: 36px; width: 36px; border-radius: 10px; object-fit: cover; }
.brand:hover { text-decoration: none; }
.main-nav { display: flex; gap: 4px; align-items: center; }
.main-nav .nav-item { position: relative; }
.main-nav a {
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 999px;
  transition: background 0.15s ease, color 0.15s ease;
}
.main-nav a:hover {
  color: var(--ink);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  text-decoration: none;
}
.main-nav .nav-item-label {
  display: inline-block;
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  padding: 8px 14px;
  cursor: default;
}
.main-nav .sub-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  flex-direction: column;
  gap: 2px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 6px;
  min-width: 180px;
  box-shadow: 0 16px 32px -20px rgba(15, 23, 42, 0.35);
  z-index: 30;
}
.main-nav .sub-menu .nav-item { width: 100%; }
.main-nav .sub-menu .sub-menu { top: -6px; left: 100%; }
.main-nav .nav-item:hover > .sub-menu,
.main-nav .nav-item:focus-within > .sub-menu { display: flex; }
.main-nav .has-children > a::after,
.main-nav .has-children > .nav-item-label::after { content: " ▾"; font-size: 0.65em; opacity: 0.6; }
.main-nav .sub-menu .has-children > a::after,
.main-nav .sub-menu .has-children > .nav-item-label::after { content: " ▸"; font-size: 0.65em; opacity: 0.6; }
.footer-grid .sub-links { list-style: none; margin: 4px 0 0; padding-left: 14px; display: flex; flex-direction: column; gap: 10px; }

/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  padding: 88px 0 72px;
  background:
    radial-gradient(60% 100% at 15% 0%, color-mix(in srgb, var(--primary) 16%, transparent), transparent),
    radial-gradient(50% 80% at 100% 0%, color-mix(in srgb, var(--primary) 10%, transparent), transparent);
  border-bottom: 1px solid var(--line);
}
.hero h1 {
  margin: 0 0 14px;
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.hero p {
  margin: 0 0 28px;
  color: var(--muted);
  font-size: 18px;
  max-width: 640px;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 22px;
  border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--primary) 60%, transparent);
}
.btn:hover {
  text-decoration: none;
  transform: translateY(-1px);
  box-shadow: 0 12px 24px -8px color-mix(in srgb, var(--primary) 70%, transparent);
}

/* Sections */
main { padding: 56px 0 80px; }
.section { margin-bottom: 56px; }
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 24px;
}
.eyebrow {
  display: block;
  color: var(--primary);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.section-head h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; }
.section-head a { font-weight: 600; font-size: 14px; }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 860px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .card-grid { grid-template-columns: 1fr; } }

.card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 22px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--primary) 35%, var(--line));
  box-shadow: 0 16px 32px -20px rgba(15, 23, 42, 0.35);
}
.badge {
  display: inline-block;
  align-self: flex-start;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}
.card h3 { margin: 0 0 8px; font-size: 17px; font-weight: 700; line-height: 1.35; }
.card h3 a { color: var(--ink); }
.card p { margin: 0; color: var(--muted); font-size: 14px; flex: 1; }
.card .read-more { margin-top: 14px; font-weight: 700; font-size: 13px; }

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--line);
  border-radius: var(--radius);
}

/* Simple list (pages) */
.list-links { display: flex; flex-direction: column; gap: 10px; }
.list-links a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 18px;
  color: var(--ink);
  font-weight: 600;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.list-links a:hover {
  text-decoration: none;
  border-color: color-mix(in srgb, var(--primary) 35%, var(--line));
  background: color-mix(in srgb, var(--primary) 5%, var(--surface));
}
.list-links a::after { content: "→"; opacity: 0.5; }

/* Article */
.article-header { max-width: 760px; margin: 0 auto 32px; text-align: left; }
.article-header h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; margin: 0 0 16px; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--muted); font-size: 13px; }
.pill {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}

.prose { max-width: 760px; margin: 0 auto; font-size: 17px; }
.prose h1, .prose h2, .prose h3 { font-weight: 800; letter-spacing: -0.01em; line-height: 1.3; margin: 1.6em 0 0.6em; }
.prose h1 { font-size: 28px; }
.prose h2 { font-size: 23px; }
.prose h3 { font-size: 19px; }
.prose p { margin: 0 0 1.1em; }
.prose ul, .prose ol { margin: 0 0 1.1em; padding-left: 1.4em; }
.prose li { margin-bottom: 0.4em; }
.prose blockquote {
  margin: 1.6em 0;
  padding: 4px 20px;
  border-left: 3px solid var(--primary);
  color: var(--muted);
  font-style: italic;
}
.prose code {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.9em;
}
.prose pre {
  background: var(--ink);
  color: #f1f5f9;
  padding: 18px;
  border-radius: 10px;
  overflow-x: auto;
}
.prose pre code { background: none; padding: 0; }
.prose table { width: 100%; border-collapse: collapse; margin: 1.6em 0; }
.prose th, .prose td { border: 1px solid var(--line); padding: 10px 12px; text-align: left; }
.prose th { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.prose figure { margin: 1.6em 0; }
.prose figcaption { color: var(--muted); font-size: 13px; margin-top: 8px; text-align: center; }
.prose img { border-radius: var(--radius); }
.prose hr { border: none; border-top: 1px solid var(--line); margin: 2em 0; }

/* Baseline styles for host-owned core blocks. Plugins may enhance these later. */
.cms-button {
  display: inline-block;
  padding: 0.6em 1.3em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff !important;
  font-weight: 700;
  text-decoration: none !important;
}
.cms-columns { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 1.6em 0; }
.cms-column { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.cms-embed { position: relative; padding-bottom: 56.25%; height: 0; margin: 1.6em 0; border-radius: var(--radius); overflow: hidden; }
.cms-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.cms-calendar td { text-align: center; }

/* Footer */
.site-footer {
  background: #0b1220;
  color: #cbd5e1;
  padding: 56px 0 28px;
  margin-top: 40px;
}
.footer-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; margin-bottom: 32px; }
@media (max-width: 640px) { .footer-grid { grid-template-columns: 1fr; } }
.footer-grid .brand { color: #f8fafc; margin-bottom: 10px; }
.footer-grid p { color: #94a3b8; font-size: 14px; max-width: 420px; }
.footer-grid h4 { color: #f8fafc; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.footer-grid a { color: #cbd5e1; font-size: 14px; }
.footer-grid ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.footer-bottom {
  border-top: 1px solid #1e293b;
  padding-top: 20px;
  font-size: 13px;
  color: #64748b;
}

`;

export const layoutLayout = defineLayout<string>({
  id: "layout",
  name: "Layout",
  description: "Shell HTML premium: header sticky, hero (dipakai halaman beranda), dan footer multi-kolom.",
  regions: ["header", "footer"],
  render: `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><%= it.title %> | <%= it.site.name %></title>
<meta name="description" content="<%= it.seo.description %>">
<meta name="keywords" content="<%= it.seo.keywords %>">
<% if (it.seo.canonicalUrl) { %><link rel="canonical" href="<%= it.seo.canonicalUrl %>"><% } %>
<meta property="og:type" content="website">
<meta property="og:site_name" content="<%= it.site.name %>">
<meta property="og:title" content="<%= it.title %> | <%= it.site.name %>">
<meta property="og:description" content="<%= it.seo.description %>">
<% if (it.seo.canonicalUrl) { %><meta property="og:url" content="<%= it.seo.canonicalUrl %>"><% } %>
<% if (it.seo.ogImage) { %><meta property="og:image" content="<%= it.seo.ogImage %>"><% } %>
<meta name="twitter:card" content="summary_large_image">
<% if (it.site.faviconUrl) { %><link rel="icon" href="<%= it.site.faviconUrl %>"><% } %>
<style><%~ it.tokensCss %>${STYLES}</style>
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">
      <% if (it.site.logoUrl) { %><img src="<%= it.site.logoUrl %>" alt="<%= it.site.name %>"><% } %>
      <span><%= it.site.name %></span>
    </a>

    <nav class="main-nav">
      <% if (it.menus.primary && it.menus.primary.length > 0) { %>
      <%
      /* Recursive so a sub-menu item can itself have a sub-menu (unlimited
         depth) — see MenuStructureEditor's "Induk"/sub-menu picker in the
         dashboard, which lets editors nest items arbitrarily deep. */
      function renderNavItem(item) {
      %>
      <span class="nav-item<% if (item.children.length > 0) { %> has-children<% } %>">
        <% if (item.clickable) { %>
        <a href="<%= item.url %>"<% if (item.newTab) { %> target="_blank" rel="noopener noreferrer"<% } %>><%= item.label %></a>
        <% } else { %>
        <span class="nav-item-label"><%= item.label %></span>
        <% } %>
        <% if (item.children.length > 0) { %>
        <span class="sub-menu">
          <% item.children.forEach(renderNavItem) %>
        </span>
        <% } %>
      </span>
      <%
      }
      it.menus.primary.forEach(renderNavItem);
      %>
      <% } else { %>
      <a href="/">Beranda</a>
      <a href="/news/">Berita</a>
      <% } %>
    </nav>
  </div>
</header>
<main>
<%~ it.body %>
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="brand"><span><%= it.site.name %></span></div>
        <p><%= it.theme.heroTagline %></p>
      </div>
      <div>
        <h4>Tautan</h4>
        <ul>
          <% if (it.menus.footer && it.menus.footer.length > 0) { %>
          <%
          /* A footer link list has no hover affordance for a dropdown, so
             nested items render as an indented sub-list instead — same
             recursion as the header nav, different presentation. */
          function renderFooterItem(item) {
          %>
          <li>
            <% if (item.clickable) { %>
            <a href="<%= item.url %>"<% if (item.newTab) { %> target="_blank" rel="noopener noreferrer"<% } %>><%= item.label %></a>
            <% } else { %>
            <span><%= item.label %></span>
            <% } %>
            <% if (item.children.length > 0) { %>
            <ul class="sub-links">
              <% item.children.forEach(renderFooterItem) %>
            </ul>
            <% } %>
          </li>
          <%
          }
          it.menus.footer.forEach(renderFooterItem);
          %>
          <% } else { %>
          <li><a href="/">Beranda</a></li>
          <li><a href="/news/">Berita</a></li>
          <% } %>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">&copy; <%= new Date().getFullYear() %> <%= it.site.name %>. Seluruh hak cipta dilindungi.</div>
  </div>
</footer>
</body>
</html>
`,
});

export const homeLayout = defineLayout<string>({
  id: "home",
  name: "Beranda",
  description: "Hero + grid berita terbaru + daftar halaman, dipakai ketika belum ada Page bertanda homepage.",
  render: `<section class="hero">
<div class="wrap">
<h1><%= it.site.name %></h1>
<p><%= it.theme.heroTagline %></p>
<a class="btn" href="/news/">Jelajahi Berita →</a>
</div>
</section>
<div class="wrap">
<section class="section">
<div class="section-head">
<div><span class="eyebrow">Terbaru</span><h2>Berita Terbaru</h2></div>
<a href="/news/">Lihat semua →</a>
</div>
<% if (it.news.length === 0) { %>
<div class="empty-state">Belum ada beritssa.</div>
<% } else { %>
<div class="card-grid">
<% it.news.forEach(function(item) { %>
<article class="card">
<h3><a href="/news/<%= item.slug %>/"><%= item.title %></a></h3>
<% if (item.excerpt) { %><p><%= item.excerpt %></p><% } %>
<span class="read-more">Baca selengkapnya →</span>
</article>
<% }) %>
</div>
<% } %>
</section>
<% if (it.pages.length > 0) { %>
<section class="section">
<div class="section-head"><div><span class="eyebrow">Statis</span><h2>Halaman</h2></div></div>
<div class="list-links">
<% it.pages.forEach(function(item) { %>
<a href="/<%= item.slug %>/"><%= item.title %></a>
<% }) %>
</div>
</section>
<% } %>
</div>
`,
});

export const newsListLayout = defineLayout<string>({
  id: "news-list",
  name: "Daftar Berita",
  description: "Body halaman /news/ — grid kartu semua berita yang dipublikasikan.",
  render: `<div class="wrap">
<section class="section">
<div class="section-head"><div><span class="eyebrow">Arsip</span><h2>Berita</h2></div></div>
<% if (it.news.length === 0) { %>
<div class="empty-state">Belum ada berita.</div>
<% } else { %>
<div class="card-grid">
<% it.news.forEach(function(item) { %>
<article class="card">
<% if (item.categories.length > 0) { %><span class="badge"><%= item.categories.map(function(category) { return category.name }).join(', ') %></span><% } %>
<h3><a href="/news/<%= item.slug %>/"><%= item.title %></a></h3>
<% if (item.excerpt) { %><p><%= item.excerpt %></p><% } %>
<span class="read-more">Baca selengkapnya →</span>
</article>
<% }) %>
</div>
<% } %>
</section>
</div>
`,
});

export const newsSingleLayout = defineLayout<string>({
  id: "news-single",
  name: "Detail Berita",
  description: "Body halaman /news/{slug}/ — tipografi artikel dengan meta kategori/tag.",
  render: `<div class="wrap">
<div class="article-header">
<h1><%= it.item.title %></h1>
<div class="meta-row">
<% if (it.item.publishedAt) { %><span><%= it.item.publishedAt %></span><% } %>
<% it.item.categories.forEach(function(category) { %><span class="pill"><%= category.name %></span><% }) %>
<% it.item.tags.forEach(function(tag) { %><span class="pill">#<%= tag.name %></span><% }) %>
</div>
</div>
<div class="prose">
<%~ it.item.bodyHtml %>
</div>
</div>
`,
});

export const pageLayout = defineLayout<string>({
  id: "page",
  name: "Halaman Statis",
  description: "Body untuk Page biasa (bukan homepage) — tipografi artikel konsisten dengan detail berita.",
  render: `<div class="wrap">
<div class="article-header"><h1><%= it.item.title %></h1></div>
<div class="prose">
<%~ it.item.bodyHtml %>
</div>
</div>
`,
});

export const layouts = [
  layoutLayout,
  homeLayout,
  newsListLayout,
  newsSingleLayout,
  pageLayout,
];
