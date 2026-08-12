import { randomUUID } from 'node:crypto';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import { resolveThemeVars } from '../builder/render/theme-vars';

/**
 * Minimal, backend-only port of the Page Builder block markdown format
 * (`apps/dashboard/src/lib/editor/blocks.ts`'s `markerV2`/`renderHero`/
 * `renderStats`/`renderCards`/`renderCallout`/`blocksToMarkdown`) — just the
 * four rich block types a starter homepage needs, not the whole editor.
 * Output must byte-for-byte match that format (same marker syntax, same
 * payload keys, same rendered class names) so the Dashboard's block editor
 * can parse a Page created here back into real, editable blocks — see
 * `markdownToBlocks()`/`parseV2()` on the dashboard side.
 */

interface StatEntry {
  readonly value: string;
  readonly label: string;
}

interface CardEntry {
  readonly title: string;
  readonly text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textTag(tag: 'p' | 'h2' | 'h3' | 'dt' | 'dd', className: string, value: string): string {
  return value.trim() ? `<${tag} class="${className}">${escapeHtml(value)}</${tag}>` : '';
}

function marker(type: string, payload: Record<string, unknown>, html: string): string {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  return `<!-- cms:v2:${type} ${encoded} -->\n${html}\n<!-- /cms:v2:${type} -->`;
}

/** Shared payload fields every rich block carries — matches `richPayload()`'s `common` object on the dashboard. */
function basePayload(text: string, body: string, tone: string, align: string): Record<string, unknown> {
  return {
    id: randomUUID(),
    text,
    body,
    eyebrow: '',
    url: '',
    alt: '',
    imageUrl: '',
    imageAlt: '',
    label: '',
    tone,
    align,
    columnCount: 3,
    space: 'md',
  };
}

function heroBlock(eyebrow: string, text: string, body: string): string {
  const payload = { ...basePayload(text, body, 'primary', 'left'), eyebrow };
  const content = [
    textTag('p', 'cms-pb-hero__eyebrow', eyebrow),
    textTag('h2', 'cms-pb-hero__title', text),
    textTag('p', 'cms-pb-hero__text', body),
  ]
    .filter(Boolean)
    .join('');
  const html = `<section class="cms-pb-hero cms-pb-tone-primary cms-pb-align-left cms-pb-hero--no-media"><div class="cms-pb-hero__content">${content}</div></section>`;
  return marker('hero', payload, html);
}

function statsBlock(text: string, stats: readonly StatEntry[]): string {
  const items = stats.map((entry) => ({ id: randomUUID(), value: entry.value, label: entry.label }));
  const payload = { ...basePayload(text, '', 'soft', 'left'), stats: items };
  const dl = items
    .map(
      (item) =>
        `<div class="cms-pb-stat">${textTag('dt', 'cms-pb-stat__value', item.value)}${textTag('dd', 'cms-pb-stat__label', item.label)}</div>`,
    )
    .join('');
  const html = `<section class="cms-pb-stats cms-pb-tone-soft cms-pb-align-left">${textTag('h2', 'cms-pb-stats__title', text)}<dl class="cms-pb-stats__list">${dl}</dl></section>`;
  return marker('stats', payload, html);
}

function cardsBlock(text: string, body: string, cards: readonly CardEntry[]): string {
  const items = cards.map((entry) => ({
    id: randomUUID(),
    title: entry.title,
    text: entry.text,
    url: '',
    label: '',
    imageUrl: '',
    imageAlt: '',
  }));
  const payload = { ...basePayload(text, body, 'default', 'left'), cards: items };
  const articles = items
    .map(
      (item) =>
        `<article class="cms-pb-card"><div class="cms-pb-card__body">${textTag('h3', 'cms-pb-card__title', item.title)}${textTag('p', 'cms-pb-card__text', item.text)}</div></article>`,
    )
    .join('');
  const html = `<section class="cms-pb-card-grid cms-pb-tone-default cms-pb-align-left cms-pb-cols-3">${textTag('h2', 'cms-pb-card-grid__title', text)}${textTag('p', 'cms-pb-card-grid__text', body)}${articles}</section>`;
  return marker('cards', payload, html);
}

function calloutBlock(text: string, body: string): string {
  const payload = basePayload(text, body, 'dark', 'center');
  const html = `<aside class="cms-pb-callout cms-pb-tone-dark cms-pb-align-center">${textTag('h2', 'cms-pb-callout__title', text)}${textTag('p', 'cms-pb-callout__text', body)}</aside>`;
  return marker('callout', payload, html);
}

/** `university`/`faculty` share the same 4 hardcoded stat settings (see their `settings.ts`). */
function statsFromLegacyFields(vars: Record<string, unknown>): StatEntry[] | undefined {
  const entries: StatEntry[] = [];
  const push = (value: unknown, label: string) => {
    if (typeof value === 'string' && value.trim()) entries.push({ value, label });
  };
  push(vars.statPrograms, 'Program Studi');
  push(vars.statFaculty, 'Dosen & Tenaga Pendidik');
  push(vars.statStudents, 'Mahasiswa Aktif');
  push(vars.statAlumni, 'Alumni');
  return entries.length > 0 ? entries : undefined;
}

/** `joy` exposes 4 fully generic value/label pairs (see its `settings.ts`) instead of hardcoded labels. */
function statsFromGenericFields(vars: Record<string, unknown>): StatEntry[] | undefined {
  const entries: StatEntry[] = [];
  for (let index = 1; index <= 4; index += 1) {
    const value = vars[`stat${index}Value`];
    const label = vars[`stat${index}Label`];
    if (typeof value === 'string' && value.trim() && typeof label === 'string' && label.trim()) {
      entries.push({ value, label });
    }
  }
  return entries.length > 0 ? entries : undefined;
}

/** Keyed by manifest id since each theme's settings schema uses different field names for its stat counters (if it has any at all). */
const STATS_BY_THEME_ID: Readonly<Record<string, (vars: Record<string, unknown>) => StatEntry[] | undefined>> = {
  'unej.theme-university': statsFromLegacyFields,
  'unej.theme-faculty': statsFromLegacyFields,
  'unej.theme-joy': statsFromGenericFields,
};

/**
 * Starter homepage content for a freshly themed site — generic and
 * domain-neutral by design (placeholder "Layanan" cards, no assumed
 * institution type) since this runs for any site regardless of what it's
 * actually about, and reads as an obvious editing prompt rather than
 * content someone might mistake for finished copy.
 */
export function buildHomepageBodyMarkdown(theme: CmsTheme<unknown>, siteName: string): string {
  const vars = resolveThemeVars(theme);
  const heroTagline =
    typeof vars.heroTagline === 'string' && vars.heroTagline.trim()
      ? vars.heroTagline
      : `Situs resmi ${siteName}.`;

  const blocks: string[] = [heroBlock('Selamat datang', siteName, heroTagline)];

  const stats = STATS_BY_THEME_ID[theme.manifest.id]?.(vars);
  if (stats) blocks.push(statsBlock('Sekilas angka', stats));

  blocks.push(
    cardsBlock('Layanan Utama', 'Jelaskan layanan atau program unggulan Anda di sini.', [
      { title: 'Layanan 1', text: 'Jelaskan layanan pertama Anda di sini.' },
      { title: 'Layanan 2', text: 'Jelaskan layanan kedua Anda di sini.' },
      { title: 'Layanan 3', text: 'Jelaskan layanan ketiga Anda di sini.' },
    ]),
  );

  blocks.push(
    calloutBlock('Siap memulai?', `Tambahkan ajakan bertindak dan tautan kontak untuk ${siteName} di sini.`),
  );

  return blocks.join('\n\n');
}
