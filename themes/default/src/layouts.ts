import { defineLayout } from "@unej-cms/sdk-theme";

/**
 * `render` is the raw Eta template source (ported from the previous
 * hand-rolled `apps/backend/src/modules/builder/templates/default/*.eta`).
 * `TRender = string` here — the Builder Runtime (apps/backend's
 * `EtaSiteRenderer`) knows to interpret it that way; the SDK itself stays
 * opaque about the representation (Runtime Independent principle).
 */

export const layoutLayout = defineLayout<string>({
  id: "layout",
  name: "Layout",
  description: "Bungkus setiap halaman: <head>, header, footer, dan gaya bersama.",
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
<style>
<%~ it.tokensCss || '' %>
*{box-sizing:border-box}
body{margin:0;font-family:var(--theme-typography-body,system-ui,-apple-system,sans-serif);color:var(--theme-foreground,#111827);line-height:1.6}
img{max-width:100%;height:auto}
.wrap{max-width:var(--theme-layout-container,1100px);margin:0 auto;padding:0 20px}
main{padding:var(--theme-spacing-section,48px) 0}
.prose{max-width:var(--theme-layout-narrow,760px);margin:0 auto}
.prose p,.prose ul,.prose ol{margin:0 0 1em}
/* Baseline styles for host-owned core blocks. Plugins may enhance these later. */
.cms-button{display:inline-block;padding:.5em 1.1em;border-radius:.375rem;background:<%= it.theme.primaryColor %>;color:#fff;text-decoration:none;font-weight:500}
.cms-columns{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.cms-embed{position:relative;padding-bottom:56.25%;height:0}
.cms-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:.375rem}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dfe5ed;padding:.4em .6em;text-align:left}
th{background:#f5f7fb}
caption{caption-side:top;text-align:left;font-weight:600;padding-bottom:.4em}
.cms-calendar td{text-align:center}
/* Page Builder reskin — flat and square-cornered, matching this theme's plain,
   unadorned identity (no shadows/animation anywhere else in this theme). */
.cms-pb-hero,.cms-pb-callout,.cms-pb-card,.cms-pb-card-grid.cms-pb-tone-primary,.cms-pb-card-grid.cms-pb-tone-dark,.cms-pb-card-grid.cms-pb-tone-soft,.cms-pb-card-grid.cms-pb-tone-info,.cms-pb-card-grid.cms-pb-tone-success,.cms-pb-card-grid.cms-pb-tone-warning,.cms-pb-gallery__item,.cms-pb-stats__list{border-radius:.375rem;box-shadow:none}
.cms-pb-card{transition:none}
.cms-pb-card:hover{transform:none;box-shadow:none;border-color:#dfe5ed}
/* Page Builder blocks (docs/theme_aware_prd.md §17) — same flat,
   square-cornered identity as the rest of this theme. */
.blk-hero{padding:48px 0;border-bottom:1px solid var(--theme-muted,#dfe5ed)}
.blk-hero.align-center{text-align:center}
.blk-hero-bg{display:block;width:100%;height:220px;object-fit:cover;border-radius:.375rem;margin-bottom:16px}
.blk-hero h2{margin:0 0 8px;font-size:1.75rem}
.blk-eyebrow{display:block;font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:<%= it.theme.primaryColor %>;margin-bottom:6px}
.blk-hero p{margin:0 0 16px;color:#475569}
.blk-news-grid{margin:32px 0}
.blk-news-grid h2{margin:0 0 16px}
.blk-news-grid ul{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.blk-news-grid li{border:1px solid #dfe5ed;border-radius:.375rem;padding:14px}
.blk-news-grid li h3{margin:0 0 6px;font-size:1rem}
.blk-news-grid li p{margin:0;color:#64748b;font-size:.9rem}
header{padding:16px 0;border-bottom:1px solid var(--theme-muted,#dfe5ed)}
header h1{margin:0 0 8px;font-size:1.25rem}
header h1 a{color:<%= it.theme.primaryColor %>;text-decoration:none}
footer{padding:24px 0;border-top:1px solid var(--theme-muted,#dfe5ed);color:#64748b;font-size:.9rem}
.main-nav{display:flex;gap:1em;align-items:center;position:relative;flex-wrap:wrap}
.main-nav .nav-item{position:relative}
.main-nav .sub-menu{display:none;position:absolute;top:100%;left:0;flex-direction:column;gap:.25em;background:#fff;border:1px solid #dfe5ed;border-radius:.375rem;padding:.5em;min-width:10em;z-index:10}
.main-nav .sub-menu .nav-item{width:100%}
.main-nav .sub-menu .sub-menu{top:-.5em;left:100%}
.main-nav .nav-item:hover>.sub-menu,.main-nav .nav-item:focus-within>.sub-menu{display:flex}
.main-nav .nav-item-label{cursor:default}
.main-nav .has-children>a::after,.main-nav .has-children>.nav-item-label::after{content:" ▾";font-size:.7em}
.main-nav .sub-menu .has-children>a::after,.main-nav .sub-menu .has-children>.nav-item-label::after{content:" ▸";font-size:.7em}
</style>
</head>
<body>
<header>
<div class="wrap">
<% if (it.site.logoUrl) { %><img src="<%= it.site.logoUrl %>" alt="<%= it.site.name %>"><% } %>
<h1><a href="/"><%= it.site.name %></a></h1>
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
<footer>
<div class="wrap">
<p>&copy; <%= new Date().getFullYear() %> <%= it.site.name %></p>
</div>
</footer>
</body>
</html>
`,
});

export const homeLayout = defineLayout<string>({
  id: "home",
  name: "Beranda",
  description: "Body halaman beranda ketika belum ada Page yang ditandai sebagai homepage.",
  render: `<div class="wrap">
<section>
<h2>Berita Terbaru</h2>
<% if (it.news.length === 0) { %>
<p>Belum ada berita.</p>
<% } %>
<ul>
<% it.news.forEach(function(item) { %>
<li><a href="/news/<%= item.slug %>/"><%= item.title %></a></li>
<% }) %>
</ul>
</section>
<section>
<h2>Halaman</h2>
<ul>
<% it.pages.forEach(function(item) { %>
<li><a href="/<%= item.slug %>/"><%= item.title %></a></li>
<% }) %>
</ul>
</section>
</div>
`,
});

export const newsListLayout = defineLayout<string>({
  id: "news-list",
  name: "Daftar Berita",
  description: "Body halaman /news/ — daftar semua berita yang dipublikasikan.",
  render: `<div class="wrap">
<section>
<h1>Berita</h1>
<% if (it.news.length === 0) { %>
<p>Belum ada berita.</p>
<% } %>
<ul>
<% it.news.forEach(function(item) { %>
<li>
<a href="/news/<%= item.slug %>/"><%= item.title %></a>
<% if (item.categories.length > 0) { %><small><%= item.categories.map(function(category) { return category.name }).join(', ') %></small><% } %>
<% if (item.excerpt) { %><p><%= item.excerpt %></p><% } %>
</li>
<% }) %>
</ul>
</section>
</div>
`,
});

export const newsSingleLayout = defineLayout<string>({
  id: "news-single",
  name: "Detail Berita",
  description: "Body halaman /news/{slug}/.",
  render: `<div class="wrap">
<article>
<h1><%= it.item.title %></h1>
<% if (it.item.publishedAt) { %><p><em><%= it.item.publishedAt %></em></p><% } %>
<% if (it.item.categories.length > 0) { %>
<p><strong>Kategori:</strong> <%= it.item.categories.map(function(category) { return category.name }).join(', ') %></p>
<% } %>
<% if (it.item.tags.length > 0) { %>
<p><strong>Tag:</strong> <%= it.item.tags.map(function(tag) { return tag.name }).join(', ') %></p>
<% } %>
<div class="prose">
<%~ it.item.bodyHtml %>
</div>
</article>
</div>
`,
});

export const pageLayout = defineLayout<string>({
  id: "page",
  name: "Halaman Statis",
  description: "Body untuk Page biasa (bukan homepage).",
  render: `<div class="wrap">
<article>
<h1><%= it.item.title %></h1>
<div class="prose">
<%~ it.item.bodyHtml %>
</div>
</article>
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
