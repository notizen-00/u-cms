/**
 * How this theme renders each block type (docs/theme_aware_prd.md §17).
 *
 * This theme contributes no blocks of its own — it is the plain, unstyled
 * baseline — so this only covers the `core.*` types it chooses to support.
 * Blocks with no entry here (`core.image`, `core.video`, ...) are skipped at
 * render time rather than half-drawn; add a template here to support one.
 *
 * `<%= %>` escapes, `<%~ %>` does not — same convention `layouts.ts` uses.
 * `it.props` is the block's stored props; `it.site`/`it.theme`/`it.news` are
 * the same ambient data every layout receives.
 */

const heroBlock = `<section class="wrap blk-hero<% if (it.props.align === 'center') { %> align-center<% } %>">
<% if (it.props.image) { %><img class="blk-hero-bg" src="<%= it.props.image %>" alt=""><% } %>
<% if (it.props.eyebrow) { %><span class="blk-eyebrow"><%= it.props.eyebrow %></span><% } %>
<h2><%= it.props.title || it.site.name %></h2>
<% if (it.props.subtitle) { %><p><%= it.props.subtitle %></p><% } %>
<% if (it.props.ctaLabel && it.props.ctaUrl) { %><a class="cms-button" href="<%= it.props.ctaUrl %>"><%= it.props.ctaLabel %></a><% } %>
</section>
`;

const textBlock = `<div class="wrap">
<div class="prose">
<%~ it.props.content || '' %>
</div>
</div>
`;

const newsBlock = `<div class="wrap blk-news-grid">
<h2><%= it.props.title || 'Berita Terbaru' %></h2>
<%
var limit = Number(it.props.limit) > 0 ? Number(it.props.limit) : 6;
var wanted = String(it.props.category || '').trim().toLowerCase();
var items = it.news.filter(function(item) {
  return !wanted || (item.categories || []).some(function(category) { return category.name.toLowerCase() === wanted; });
}).slice(0, limit);
%>
<% if (items.length === 0) { %>
<p>Belum ada berita.</p>
<% } else { %>
<ul>
<% items.forEach(function(item) { %>
<li>
<h3><a href="/news/<%= item.slug %>/"><%= item.title %></a></h3>
<% if (item.excerpt) { %><p><%= item.excerpt %></p><% } %>
</li>
<% }) %>
</ul>
<% } %>
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
