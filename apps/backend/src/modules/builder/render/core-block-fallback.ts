import { escapeHtmlAttribute } from './plugin-assets';

/**
 * Renders a `core.*` block with the CMS's own generic markup, used when the
 * active theme provides no component for it (docs/theme_aware_prd.md §5.1's
 * "guaranteed to exist no matter which theme is active" — a promise that only
 * held for `core.hero`/`core.text`/`core.news` in practice, since every
 * installed theme only ever implemented renderers for those three).
 *
 * Markup here only ever carries `cms-block-*` classes, never inline `style=`
 * — the rules those classes need live in `buildCoreBlockFallbackStyles()`
 * below, meant to be injected once into the page's `<head>` (see
 * `block-content-renderer.ts`'s `renderBlocks()`), not repeated per block.
 * That split is what makes this "theme-agnostic": the same small stylesheet
 * works on any theme regardless of what that theme's own CSS happens to
 * contain, and a theme can still override any rule by declaring the same
 * class later in `<head>` — plugin assets already use this same
 * later-in-head-wins convention (see plugin-assets.ts).
 *
 * Returns `undefined` for a type this has no generic version of
 * (`core.columns` — its slot-based nested content has no editor UI yet, so
 * there is nothing meaningful to render regardless of styling) or a type
 * that isn't `core.*` at all — the caller skips the block exactly as before
 * in either case.
 */
export function renderCoreBlockFallback(
  type: string,
  props: Record<string, unknown>,
  context: { site: unknown; theme: Record<string, unknown>; news: readonly unknown[] },
): string | undefined {
  switch (type) {
    case 'core.hero':
      return renderHero(props, context);
    case 'core.text':
      return renderText(props);
    case 'core.image':
      return renderImage(props);
    case 'core.video':
      return renderVideo(props);
    case 'core.button':
      return renderButton(props);
    case 'core.search':
      return renderSearch(props);
    case 'core.news':
      return renderNews(props, context);
    case 'core.events':
      return renderEvents(props);
    case 'core.gallery':
      return renderGallery(props);
    default:
      return undefined;
  }
}

/**
 * The stylesheet every `render*` function below assumes is present —
 * `block-content-renderer.ts` calls this once per page (only when at least
 * one block actually used the fallback) and injects the result into
 * `<head>`, rather than each block carrying its own styling inline.
 *
 * `accentColor` is the resolved theme's `primaryColor` (falls back to a
 * fixed default). It only ever reaches here as a `<style>` custom property
 * value, so it's validated against a safe CSS-color shape first — a
 * misconfigured or tampered setting can make the accent wrong, but it can
 * never break out of the declaration into arbitrary injected CSS.
 */
export function buildCoreBlockFallbackStyles(accentColor: string): string {
  return `:root{--cms-block-accent:${safeCssColor(accentColor)}}
.cms-block-hero{position:relative;overflow:hidden;padding:64px 20px;text-align:left}
.cms-block-hero--center{text-align:center}
.cms-block-hero--image{color:#fff}
.cms-block-hero--image::before{content:"";position:absolute;inset:0;background:rgba(15,23,42,.5);z-index:1}
.cms-block-hero__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.cms-block-hero__inner{position:relative;z-index:2}
.cms-block-hero__eyebrow{display:block;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--cms-block-accent);margin-bottom:8px}
.cms-block-hero--image .cms-block-hero__eyebrow{color:#fff}
.cms-block-hero__title{margin:0 0 12px;font-size:2rem;font-weight:800}
.cms-block-hero__subtitle{margin:0 0 20px;max-width:640px;opacity:.85}
.cms-block-hero--center .cms-block-hero__subtitle{margin-inline:auto}

.cms-block-btn{display:inline-block;padding:.65em 1.4em;border-radius:8px;background:var(--cms-block-accent);color:#fff !important;font-weight:600;text-decoration:none !important;border:0;cursor:pointer;font:inherit}
.cms-block-btn--outline{background:transparent;color:var(--cms-block-accent) !important;border:2px solid currentColor}

.cms-block-text{max-width:720px;margin:0 auto;padding:0 20px 32px}
.cms-block-text table{border-collapse:collapse;width:100%;margin:1em 0}
.cms-block-text th,.cms-block-text td{border:1px solid #e2e8f0;padding:.5em .75em;text-align:left}
.cms-block-text th{background:#f5f7fb}

.cms-block-image{margin:0;padding:0 20px 32px}
.cms-block-image img{max-width:100%;height:auto;display:block;border-radius:8px;margin:0 auto}
.cms-block-image figcaption{margin-top:8px;font-size:.85em;opacity:.7;text-align:center}

.cms-block-video{padding:0 20px 32px}
.cms-block-video video{max-width:100%;border-radius:8px;display:block;margin:0 auto}

.cms-block-button{padding:0 20px 32px}

.cms-block-search{padding:0 20px 32px}
.cms-block-search__form{display:flex;gap:8px;max-width:480px;margin:0 auto}
.cms-block-search__input{flex:1;min-width:0;padding:.65em .9em;border:1px solid #cbd5e1;border-radius:8px;font:inherit}

.cms-block-news{padding:0 20px 32px}
.cms-block-news__title{margin:0 0 16px}
.cms-block-news__grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.cms-block-news__card{border:1px solid #e2e8f0;border-radius:8px;padding:16px}
.cms-block-news__card h3{margin:0 0 8px;font-size:1rem}
.cms-block-news__card a{color:inherit;text-decoration:none}
.cms-block-news__card p{margin:0;font-size:.9em;opacity:.75}
.cms-block-news__empty,.cms-block-events__empty{opacity:.7}

.cms-block-events{padding:0 20px 32px}
.cms-block-events__title{margin:0 0 16px}

.cms-block-gallery{padding:0 20px 32px}
.cms-block-gallery__title{margin:0 0 16px}
.cms-block-gallery__grid{display:grid;gap:12px}
.cms-block-gallery__grid--cols-2{grid-template-columns:repeat(2,1fr)}
.cms-block-gallery__grid--cols-3{grid-template-columns:repeat(3,1fr)}
.cms-block-gallery__grid--cols-4{grid-template-columns:repeat(4,1fr)}
.cms-block-gallery__item{margin:0}
.cms-block-gallery__item img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;display:block}
.cms-block-gallery__item figcaption{margin-top:6px;font-size:.8em;opacity:.7}
`;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function esc(value: unknown): string {
  // `escapeHtmlAttribute` also escapes quotes, which is harmless (and
  // correct) in a text node too — one escaper, safe in both contexts.
  return escapeHtmlAttribute(str(value));
}

/** Hex, `rgb()`/`hsl()` (with optional alpha), or a bare CSS color keyword — anything else falls back to the default rather than reaching the `<style>` block verbatim. */
const SAFE_CSS_COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(?:rgb|hsl)a?\([\d.%,\s/]+\))$/;

function safeCssColor(value: string): string {
  const trimmed = value.trim();
  return SAFE_CSS_COLOR.test(trimmed) ? trimmed : '#075985';
}

function primaryColor(context: { theme: Record<string, unknown> }): string {
  return str(context.theme.primaryColor) || '#075985';
}

function siteName(context: { site: unknown }): string {
  return str((context.site as { name?: unknown } | null)?.name) || '';
}

function renderHero(props: Record<string, unknown>, context: { site: unknown; theme: Record<string, unknown> }): string {
  const title = str(props.title) || siteName(context);
  const image = str(props.image);
  const modifiers = [props.align === 'center' ? 'cms-block-hero--center' : '', image ? 'cms-block-hero--image' : '']
    .filter(Boolean)
    .join(' ');

  return (
    `<section class="cms-block-hero${modifiers ? ` ${modifiers}` : ''}">` +
    (image ? `<img class="cms-block-hero__bg" src="${esc(image)}" alt="">` : '') +
    `<div class="cms-block-hero__inner">` +
    (props.eyebrow ? `<span class="cms-block-hero__eyebrow">${esc(props.eyebrow)}</span>` : '') +
    `<h2 class="cms-block-hero__title">${esc(title)}</h2>` +
    (props.subtitle ? `<p class="cms-block-hero__subtitle">${esc(props.subtitle)}</p>` : '') +
    (props.ctaLabel && props.ctaUrl ? `<a class="cms-block-btn" href="${esc(props.ctaUrl)}">${esc(props.ctaLabel)}</a>` : '') +
    `</div></section>`
  );
}

function renderText(props: Record<string, unknown>): string {
  // `content` is author-written richtext, already sanitized upstream (see
  // ContentRenderer) — emitted raw, same treatment every theme's own
  // core.text component gives it.
  return `<div class="cms-block-text">${str(props.content)}</div>`;
}

function renderImage(props: Record<string, unknown>): string {
  if (!props.src) return '';
  return (
    `<figure class="cms-block-image">` +
    `<img src="${esc(props.src)}" alt="${esc(props.alt)}">` +
    (props.caption ? `<figcaption>${esc(props.caption)}</figcaption>` : '') +
    `</figure>`
  );
}

function renderVideo(props: Record<string, unknown>): string {
  if (!props.src) return '';
  const attrs = [props.autoplay ? 'autoplay' : '', props.loop ? 'loop' : '', props.muted !== false ? 'muted' : '', 'controls', 'playsinline']
    .filter(Boolean)
    .join(' ');
  return (
    `<div class="cms-block-video">` +
    `<video src="${esc(props.src)}"${props.poster ? ` poster="${esc(props.poster)}"` : ''} ${attrs}></video>` +
    `</div>`
  );
}

function renderButton(props: Record<string, unknown>): string {
  if (!props.label || !props.url) return '';
  const outline = props.variant === 'outline' ? ' cms-block-btn--outline' : '';
  return `<div class="cms-block-button"><a class="cms-block-btn${outline}" href="${esc(props.url)}">${esc(props.label)}</a></div>`;
}

function renderSearch(props: Record<string, unknown>): string {
  const placeholder = str(props.placeholder) || 'Cari informasi...';
  const action = str(props.action) || '/news/';
  return (
    `<div class="cms-block-search">` +
    `<form class="cms-block-search__form" action="${esc(action)}" method="get">` +
    `<input class="cms-block-search__input" type="search" name="q" placeholder="${esc(placeholder)}">` +
    `<button type="submit" class="cms-block-btn">Cari</button>` +
    `</form></div>`
  );
}

function renderNews(props: Record<string, unknown>, context: { news: readonly unknown[] }): string {
  const limit = num(props.limit, 6);
  const wanted = str(props.category).trim().toLowerCase();
  const items = (context.news as Array<Record<string, unknown>>)
    .filter((item) => {
      if (!wanted) return true;
      const categories = (item.categories as Array<{ name?: unknown }> | undefined) ?? [];
      return categories.some((category) => str(category.name).toLowerCase() === wanted);
    })
    .slice(0, limit);

  const title = str(props.title) || 'Berita Terbaru';
  const list = items.length
    ? `<div class="cms-block-news__grid">` +
      items
        .map((item) => {
          const slug = esc(item.slug);
          return (
            `<article class="cms-block-news__card">` +
            `<h3><a href="/news/${slug}/">${esc(item.title)}</a></h3>` +
            (item.excerpt ? `<p>${esc(item.excerpt)}</p>` : '') +
            `</article>`
          );
        })
        .join('') +
      `</div>`
    : `<p class="cms-block-news__empty">Belum ada berita.</p>`;

  return `<div class="cms-block-news"><h2 class="cms-block-news__title">${esc(title)}</h2>${list}</div>`;
}

function renderEvents(props: Record<string, unknown>): string {
  // No agenda/events data model exists in this CMS yet — nothing to list,
  // but the block still needs to render *something* visible rather than
  // silently vanish, same reasoning as every other fallback here.
  const title = str(props.title) || 'Agenda';
  return `<div class="cms-block-events"><h2 class="cms-block-events__title">${esc(title)}</h2><p class="cms-block-events__empty">Belum ada agenda.</p></div>`;
}

function renderGallery(props: Record<string, unknown>): string {
  const images = Array.isArray(props.images) ? (props.images as Array<Record<string, unknown>>) : [];
  if (images.length === 0) return '';
  const columns = Math.min(4, Math.max(2, num(props.columns, 3)));

  const grid = images
    .map(
      (image) =>
        `<figure class="cms-block-gallery__item">` +
        `<img src="${esc(image.url)}" alt="${esc(image.alt)}">` +
        (image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : '') +
        `</figure>`,
    )
    .join('');

  return (
    `<div class="cms-block-gallery">` +
    (props.title ? `<h2 class="cms-block-gallery__title">${esc(props.title)}</h2>` : '') +
    `<div class="cms-block-gallery__grid cms-block-gallery__grid--cols-${columns}">${grid}</div>` +
    `</div>`
  );
}

export { primaryColor as coreBlockAccentColor };
