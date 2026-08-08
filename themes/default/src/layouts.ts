import { defineLayout } from "@unej-cms/sdk-theme";
import { FORM_SUBMIT_SCRIPT } from "./form-script.js";

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
<% if (it.site.faviconUrl) { %><link rel="icon" href="<%= it.site.faviconUrl %>"><% } %>
<style>
/* Style untuk blok kaya dari block editor admin. Class-class ini di-whitelist di
   ALLOWED_CLASSES pada eta-site-renderer.ts; menghapusnya membuat blok tampil polos. */
.cms-button{display:inline-block;padding:.5em 1.1em;border-radius:.375rem;background:<%= it.theme.primaryColor %>;color:#fff;text-decoration:none;font-weight:500}
.cms-columns{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.cms-embed{position:relative;padding-bottom:56.25%;height:0}
.cms-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:.375rem}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dfe5ed;padding:.4em .6em;text-align:left}
th{background:#f5f7fb}
caption{caption-side:top;text-align:left;font-weight:600;padding-bottom:.4em}
.cms-calendar td{text-align:center}
img{max-width:100%;height:auto}
header h1 a{color:<%= it.theme.primaryColor %>;text-decoration:none}
.cms-form-embed{margin:1.5em 0;padding:1.25em;border:1px solid #dfe5ed;border-radius:.5rem;max-width:32rem}
.cms-form-title{margin:0 0 1em;font-size:1.1em}
.cms-form-field{margin-bottom:1em;display:flex;flex-direction:column;gap:.35em}
.cms-form-field label{font-weight:600;font-size:.9em}
.cms-form-field input,.cms-form-field textarea,.cms-form-field select{padding:.5em .6em;border:1px solid #dfe5ed;border-radius:.375rem;font:inherit}
.cms-form-field-checkbox label{flex-direction:row;align-items:center;display:flex;gap:.5em;font-weight:400}
.cms-form-submit{align-self:flex-start;padding:.6em 1.3em;border:0;border-radius:.375rem;background:<%= it.theme.primaryColor %>;color:#fff;font-weight:600;cursor:pointer}
.cms-form-submit:disabled{opacity:.6;cursor:default}
.cms-form-status{margin-top:.75em;font-size:.9em}
.cms-form-status-success{color:#15803d}
.cms-form-status-error{color:#b91c1c}
.main-nav{display:flex;gap:1em;align-items:center;position:relative}
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
</header>
<main>
<%~ it.body %>
</main>
<footer>
<p>&copy; <%= new Date().getFullYear() %> <%= it.site.name %></p>
</footer>
<script>${FORM_SUBMIT_SCRIPT}</script>
</body>
</html>
`,
});

export const homeLayout = defineLayout<string>({
  id: "home",
  name: "Beranda",
  description: "Body halaman beranda ketika belum ada Page yang ditandai sebagai homepage.",
  render: `<section>
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
`,
});

export const newsListLayout = defineLayout<string>({
  id: "news-list",
  name: "Daftar Berita",
  description: "Body halaman /news/ — daftar semua berita yang dipublikasikan.",
  render: `<section>
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
`,
});

export const newsSingleLayout = defineLayout<string>({
  id: "news-single",
  name: "Detail Berita",
  description: "Body halaman /news/{slug}/.",
  render: `<article>
<h1><%= it.item.title %></h1>
<% if (it.item.publishedAt) { %><p><em><%= it.item.publishedAt %></em></p><% } %>
<% if (it.item.categories.length > 0) { %>
<p><strong>Kategori:</strong> <%= it.item.categories.map(function(category) { return category.name }).join(', ') %></p>
<% } %>
<% if (it.item.tags.length > 0) { %>
<p><strong>Tag:</strong> <%= it.item.tags.map(function(tag) { return tag.name }).join(', ') %></p>
<% } %>
<%~ it.item.bodyHtml %>
</article>
`,
});

export const pageLayout = defineLayout<string>({
  id: "page",
  name: "Halaman Statis",
  description: "Body untuk Page biasa (bukan homepage).",
  render: `<article>
<h1><%= it.item.title %></h1>
<%~ it.item.bodyHtml %>
</article>
`,
});

export const layouts = [
  layoutLayout,
  homeLayout,
  newsListLayout,
  newsSingleLayout,
  pageLayout,
];
