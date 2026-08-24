import { escapeHtmlAttribute } from './plugin-assets';

/**
 * Renders a `core.*` block with the CMS's own generic markup, used when the
 * active theme provides no component for it (docs/theme_aware_prd.md §5.1's
 * "guaranteed to exist no matter which theme is active" — a promise that only
 * held for `core.hero`/`core.text`/`core.news` in practice, since every
 * installed theme only ever implemented renderers for those three).
 *
 * Deliberately theme-agnostic: no `.wrap`/`.prose`-style classes (those are
 * each theme's own convention, not guaranteed to exist), just inline styles
 * plus the small `.cms-button`/`.cms-columns`/`.cms-embed`/`.cms-calendar`
 * class set every theme already carries baseline CSS for. `context.theme`
 * (the resolved theme settings, e.g. `primaryColor`) is the only per-theme
 * value used, so the result reads as "plain but on-brand" rather than
 * generic-grey everywhere.
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
      return renderButton(props, context);
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

const PAD = 'padding:0 20px 32px';

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

function primaryColor(context: { theme: Record<string, unknown> }): string {
  return str(context.theme.primaryColor) || '#075985';
}

function siteName(context: { site: unknown }): string {
  return str((context.site as { name?: unknown } | null)?.name) || '';
}

function renderHero(props: Record<string, unknown>, context: { site: unknown; theme: Record<string, unknown> }): string {
  const align = props.align === 'center' ? 'center' : 'left';
  const title = str(props.title) || siteName(context);
  const image = str(props.image);
  const color = primaryColor(context);
  const bg = image
    ? `background:linear-gradient(180deg, rgba(15,23,42,.5), rgba(15,23,42,.5)), url('${esc(image)}');background-size:cover;background-position:center;color:#fff`
    : '';

  return (
    `<section style="${bg};padding:64px 20px;text-align:${align}">` +
    (props.eyebrow
      ? `<span style="display:block;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${image ? '#fff' : color};margin-bottom:8px">${esc(props.eyebrow)}</span>`
      : '') +
    `<h2 style="margin:0 0 12px;font-size:2rem;font-weight:800">${esc(title)}</h2>` +
    (props.subtitle ? `<p style="margin:0 0 20px;max-width:640px;${align === 'center' ? 'margin-inline:auto' : ''};opacity:.85">${esc(props.subtitle)}</p>` : '') +
    (props.ctaLabel && props.ctaUrl
      ? `<a class="cms-button" href="${esc(props.ctaUrl)}" style="background:${esc(color)}">${esc(props.ctaLabel)}</a>`
      : '') +
    `</section>`
  );
}

function renderText(props: Record<string, unknown>): string {
  // `content` is author-written richtext, already sanitized upstream (see
  // ContentRenderer) — emitted raw, same treatment every theme's own
  // core.text component gives it.
  return `<div style="max-width:720px;margin:0 auto;${PAD}">${str(props.content)}</div>`;
}

function renderImage(props: Record<string, unknown>): string {
  if (!props.src) return '';
  return (
    `<figure style="margin:0;${PAD}">` +
    `<img src="${esc(props.src)}" alt="${esc(props.alt)}" style="max-width:100%;height:auto;display:block;border-radius:8px;margin:0 auto">` +
    (props.caption ? `<figcaption style="margin-top:8px;font-size:.85em;opacity:.7;text-align:center">${esc(props.caption)}</figcaption>` : '') +
    `</figure>`
  );
}

function renderVideo(props: Record<string, unknown>): string {
  if (!props.src) return '';
  const attrs = [
    props.autoplay ? 'autoplay' : '',
    props.loop ? 'loop' : '',
    props.muted !== false ? 'muted' : '',
    'controls',
    'playsinline'
  ]
    .filter(Boolean)
    .join(' ');
  return (
    `<div style="${PAD}">` +
    `<video src="${esc(props.src)}"${props.poster ? ` poster="${esc(props.poster)}"` : ''} ${attrs} style="max-width:100%;border-radius:8px;display:block;margin:0 auto"></video>` +
    `</div>`
  );
}

function renderButton(props: Record<string, unknown>, context: { theme: Record<string, unknown> }): string {
  if (!props.label || !props.url) return '';
  const outline = props.variant === 'outline';
  const color = primaryColor(context);
  const style = outline ? `background:transparent;color:${esc(color)};border:2px solid currentColor` : `background:${esc(color)}`;
  return `<div style="${PAD}"><a class="cms-button" href="${esc(props.url)}" style="${style}">${esc(props.label)}</a></div>`;
}

function renderSearch(props: Record<string, unknown>): string {
  const placeholder = str(props.placeholder) || 'Cari informasi...';
  const action = str(props.action) || '/news/';
  return (
    `<div style="${PAD}">` +
    `<form action="${esc(action)}" method="get" style="display:flex;gap:8px;max-width:480px;margin:0 auto">` +
    `<input type="search" name="q" placeholder="${esc(placeholder)}" style="flex:1;min-width:0;padding:.65em .9em;border:1px solid #cbd5e1;border-radius:8px;font:inherit">` +
    `<button type="submit" class="cms-button">Cari</button>` +
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
    ? `<div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">` +
      items
        .map((item) => {
          const slug = esc(item.slug);
          return (
            `<article style="border:1px solid #e2e8f0;border-radius:8px;padding:16px">` +
            `<h3 style="margin:0 0 8px;font-size:1rem"><a href="/news/${slug}/" style="color:inherit;text-decoration:none">${esc(item.title)}</a></h3>` +
            (item.excerpt ? `<p style="margin:0;font-size:.9em;opacity:.75">${esc(item.excerpt)}</p>` : '') +
            `</article>`
          );
        })
        .join('') +
      `</div>`
    : `<p style="opacity:.7">Belum ada berita.</p>`;

  return `<div style="${PAD}"><h2 style="margin:0 0 16px">${esc(title)}</h2>${list}</div>`;
}

function renderEvents(props: Record<string, unknown>): string {
  // No agenda/events data model exists in this CMS yet — nothing to list,
  // but the block still needs to render *something* visible rather than
  // silently vanish, same reasoning as every other fallback here.
  const title = str(props.title) || 'Agenda';
  return `<div style="${PAD}"><h2 style="margin:0 0 16px">${esc(title)}</h2><p style="opacity:.7">Belum ada agenda.</p></div>`;
}

function renderGallery(props: Record<string, unknown>): string {
  const images = Array.isArray(props.images) ? (props.images as Array<Record<string, unknown>>) : [];
  if (images.length === 0) return '';
  const columns = Math.min(4, Math.max(2, num(props.columns, 3)));

  const grid = images
    .map(
      (image) =>
        `<figure style="margin:0">` +
        `<img src="${esc(image.url)}" alt="${esc(image.alt)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;display:block">` +
        (image.caption ? `<figcaption style="margin-top:6px;font-size:.8em;opacity:.7">${esc(image.caption)}</figcaption>` : '') +
        `</figure>`
    )
    .join('');

  return (
    `<div style="${PAD}">` +
    (props.title ? `<h2 style="margin:0 0 16px">${esc(props.title)}</h2>` : '') +
    `<div style="display:grid;gap:12px;grid-template-columns:repeat(${columns},1fr)">${grid}</div>` +
    `</div>`
  );
}
