/**
 * How this theme renders each block type (docs/theme_aware_prd.md §17).
 *
 * This theme contributes no blocks of its own, so this only covers the
 * `core.*` types it chooses to support — reusing the exact `.hero`/
 * `.card-grid`/`.card`/`.badge`/`.eyebrow` classes the theme's own `home` and
 * `news-list` layouts already define (see layouts.ts's `STYLES`), so a
 * block-authored page looks native rather than bolted on.
 *
 * Blocks with no entry here (`core.image`, `core.video`, ...) are skipped at
 * render time rather than half-drawn; add a template here to support one.
 */

const heroBlock = `<section class="hero<% if (it.props.align === 'center') { %> align-center<% } %>"<% if (it.props.image) { %> style="background-image:linear-gradient(180deg, rgba(15,23,42,.55), rgba(15,23,42,.55)), url('<%= it.props.image %>');background-size:cover;background-position:center"<% } %>>
<div class="wrap">
<% if (it.props.eyebrow) { %><span class="eyebrow"><%= it.props.eyebrow %></span><% } %>
<h1><%= it.props.title || it.site.name %></h1>
<% if (it.props.subtitle) { %><p><%= it.props.subtitle %></p><% } %>
<% if (it.props.ctaLabel && it.props.ctaUrl) { %><a class="btn" href="<%= it.props.ctaUrl %>"><%= it.props.ctaLabel %></a><% } %>
</div>
</section>
`;

const textBlock = `<div class="wrap">
<div class="prose">
<%~ it.props.content || '' %>
</div>
</div>
`;

const newsBlock = `<div class="wrap">
<section class="section">
<div class="section-head">
<div><span class="eyebrow">Terbaru</span><h2><%= it.props.title || 'Berita Terbaru' %></h2></div>
<a href="/news/">Lihat semua →</a>
</div>
<%
var limit = Number(it.props.limit) > 0 ? Number(it.props.limit) : 6;
var wanted = String(it.props.category || '').trim().toLowerCase();
var items = it.news.filter(function(item) {
  return !wanted || (item.categories || []).some(function(category) { return category.name.toLowerCase() === wanted; });
}).slice(0, limit);
%>
<% if (items.length === 0) { %>
<div class="empty-state">Belum ada berita.</div>
<% } else { %>
<div class="card-grid">
<% items.forEach(function(item) { %>
<article class="card">
<% if ((item.categories || []).length > 0) { %><span class="badge"><%= item.categories.map(function(category) { return category.name }).join(', ') %></span><% } %>
<h3><a href="/news/<%= item.slug %>/"><%= item.title %></a></h3>
<% if (item.excerpt) { %><p><%= item.excerpt %></p><% } %>
<span class="read-more">Baca selengkapnya →</span>
</article>
<% }) %>
</div>
<% } %>
</section>
</div>
`;

export const blockRenderers: Record<string, string> = {
  "core.hero": heroBlock,
  "core.text": textBlock,
  "core.news": newsBlock,
};

/**
 * Starter homepage for a site using this theme (docs/theme_aware_prd.md §19).
 * `title: ""` on the hero is intentional — `ensureHomepage` (themes.service.ts)
 * fills it in with the site's own name.
 */
export const defaultHomepage = [
  {
    type: "core.hero",
    props: {
      eyebrow: "",
      title: "",
      subtitle: "Tulis kalimat pembuka yang menjelaskan situs Anda di sini.",
      align: "left",
    },
  },
  {
    type: "core.news",
    props: { title: "Berita Terbaru", limit: 6, category: "" },
  },
];
