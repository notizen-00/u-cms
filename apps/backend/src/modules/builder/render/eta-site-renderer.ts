import { Injectable } from '@nestjs/common';
import type { CmsTheme } from '@unej-cms/sdk-theme';
import { Eta } from 'eta';
import MarkdownIt from 'markdown-it';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sanitizeHtml from 'sanitize-html';
import { resolveTheme } from '../../themes/theme-registry';
import type {
  SiteRenderData,
  SiteRenderer,
  SiteRenderForm,
  SiteRenderFormField,
} from './site-renderer.types';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'hr',
  'span',
  // Tag tambahan untuk blok kaya dari block editor admin: Kolom (div),
  // Embed (iframe), dan judul tabel Kalender (caption).
  // Lihat docs/block-editor-storage.md di repo admin app.
  'div',
  'iframe',
  'caption',
  'figure',
  'figcaption',
];

/**
 * Hanya class milik CMS yang boleh lolos — bukan atribut `class` bebas. Ini yang
 * membuat blok Tombol/Kolom/Embed/Kalender/Form bisa di-style tanpa membuka celah
 * bagi penulis konten untuk menempelkan class sembarangan ke tema.
 */
const ALLOWED_CLASSES = {
  a: ['cms-button'],
  div: ['cms-columns', 'cms-column', 'cms-embed', 'cms-form'],
  table: ['cms-calendar'],
};

/** Embed dikunci ke penyedia yang dikenal — mitigasi utama dari diizinkannya <iframe>. */
const ALLOWED_IFRAME_HOSTNAMES = ['www.youtube.com', 'player.vimeo.com'];

/**
 * Matches the placeholder the admin block editor emits for a Form block
 * (`<div class="cms-form" data-form-id="...">…</div>` — see
 * apps/dashboard/src/lib/editor/blocks.ts). Expanded into a real <form> at
 * build time because rendering it needs a DB lookup of the form's current
 * field config, which the admin editor's client-side preview can't do.
 */
const FORM_EMBED_RE = /<div class="cms-form" data-form-id="([0-9a-fA-F-]{36})">[\s\S]*?<\/div>/g;

@Injectable()
export class EtaSiteRenderer implements SiteRenderer {
  private readonly eta: Eta;
  private readonly md: InstanceType<typeof MarkdownIt>;

  constructor() {
    this.eta = new Eta({ autoEscape: true });
    // html: true diperlukan supaya blok kaya dari block editor admin (Tombol, Embed,
    // Kalender, Kolom) ter-render, bukan bocor sebagai teks mentah ke halaman. Ini
    // sengaja melonggarkan aturan "no raw HTML in content" di PRD: gerbang keamanan
    // yang sesungguhnya adalah sanitizeHtml di renderMarkdown() — allowlist di sana
    // lebih ketat daripada default sanitize-html, dan `class` dibatasi lewat
    // ALLOWED_CLASSES. Jangan pernah melewati sanitizer itu.
    this.md = new MarkdownIt({ html: true, linkify: true, breaks: true });
  }

  async render(outputDir: string, data: SiteRenderData): Promise<void> {
    // Resolved per-call (not cached on `this`) so this singleton service
    // renders each site with its own site.themeId, and never leaks one
    // build's theme into a concurrently-running build for another site.
    const theme = resolveTheme(data.themeId);
    const layouts = new Map<string, string>(
      theme.layouts.map((layout) => [layout.id, layout.render]),
    );
    const themeVars = resolveThemeVars(theme, data.themeSettings);
    const formsById = new Map(data.forms.map((form) => [form.id, form]));
    const renderMarkdown = (markdown: string): string =>
      this.renderMarkdown(markdown, data.site.id, data.apiBaseUrl, formsById);

    // `site`/`theme`/`menus` are merged into every layout's data, not just
    // the outer "layout" wrapper — a theme's body templates (e.g. a hero on
    // "home") may reasonably want them too, and per-theme call sites
    // shouldn't have to know which specific layouts need them.
    const renderLayout = (id: string, layoutData: Record<string, unknown>): string => {
      const template = layouts.get(id);
      if (!template) {
        throw new Error(`Theme "${theme.manifest.id}" has no layout "${id}"`);
      }
      return this.eta.renderString(template, {
        site: data.site,
        theme: themeVars,
        menus: data.menus ?? {},
        ...layoutData,
      }) as string;
    };

    const writePage = async (
      relativePath: string,
      title: string,
      body: string,
    ): Promise<void> => {
      const dir = relativePath ? join(outputDir, relativePath) : outputDir;
      await mkdir(dir, { recursive: true });
      const html = renderLayout('layout', { title, body });
      await writeFile(join(dir, 'index.html'), html, 'utf-8');
    };

    const homepage = data.pages.find((p) => p.isHomepage);

    const homeBody = homepage
      ? renderMarkdown(homepage.bodyMarkdown)
      : renderLayout('home', { news: data.news, pages: data.pages });
    await writePage('', 'Beranda', homeBody);

    const newsListBody = renderLayout('news-list', { news: data.news });
    await writePage('news', 'Berita', newsListBody);

    for (const item of data.news) {
      const body = renderLayout('news-single', {
        item: { ...item, bodyHtml: renderMarkdown(item.bodyMarkdown) },
      });
      await writePage(`news/${item.slug}`, item.title, body);
    }

    for (const page of data.pages) {
      if (page.isHomepage) continue;
      const body = renderLayout('page', {
        item: { ...page, bodyHtml: renderMarkdown(page.bodyMarkdown) },
      });
      await writePage(page.slug, page.title, body);
    }
  }

  private renderMarkdown(
    markdown: string,
    siteId: string,
    apiBaseUrl: string,
    formsById: ReadonlyMap<string, SiteRenderForm>,
  ): string {
    const html = this.md.render(markdown ?? '');
    // Gerbang keamanan sesungguhnya untuk konten penulis. Penanda blok editor
    // (<!-- cms:… -->) dibuang di sini — sanitize-html memang membuang komentar
    // secara default, dan penanda itu murni metadata editor, bukan konten publik.
    const sanitized = sanitizeHtml(html, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'loading'],
        iframe: ['src', 'loading', 'title', 'allowfullscreen'],
        div: ['data-form-id'],
      },
      allowedClasses: ALLOWED_CLASSES,
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedIframeHostnames: ALLOWED_IFRAME_HOSTNAMES,
    });

    return sanitized.replace(FORM_EMBED_RE, (_match, formId: string) => {
      const form = formsById.get(formId);
      // Form deleted, or belongs to a different site, or plugin no longer
      // active — drop the embed silently rather than breaking the page.
      return form ? renderFormEmbed(form, siteId, apiBaseUrl) : '';
    });
  }
}

/**
 * Flattens a theme's settings schema into `{ [settingKey]: value }` for
 * template use as `it.theme.<key>` — generic across whatever settings a given
 * theme declares (no per-theme special-casing here; each theme's own layout
 * template only ever references the settings it itself declared). Per-site
 * overrides (see modules/themes/themes.service.ts) win over schema defaults.
 */
function resolveThemeVars(
  theme: CmsTheme<string>,
  overrides?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const vars: Record<string, string | number | boolean> = {};
  for (const [key, field] of Object.entries(theme.settings ?? {})) {
    if ('default' in field && field.default !== undefined) {
      vars[key] = field.default;
    }
    const override = overrides?.[key];
    if (override !== undefined && (typeof override === 'string' || typeof override === 'number' || typeof override === 'boolean')) {
      vars[key] = override;
    }
  }
  return vars;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFormField(field: SiteRenderFormField, formId: string): string {
  const inputId = `cms-form-${formId}-${escapeHtml(field.key)}`;
  const label = escapeHtml(field.label);
  const requiredAttr = field.required ? ' required' : '';
  const requiredMark = field.required ? ' <span aria-hidden="true">*</span>' : '';
  const placeholderAttr = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';

  if (field.type === 'checkbox') {
    return `<div class="cms-form-field cms-form-field-checkbox">
<label for="${inputId}"><input type="checkbox" id="${inputId}" name="${escapeHtml(field.key)}" value="true"${requiredAttr}> ${label}${requiredMark}</label>
</div>`;
  }

  let control: string;
  switch (field.type) {
    case 'textarea':
      control = `<textarea id="${inputId}" name="${escapeHtml(field.key)}" rows="4"${requiredAttr}${placeholderAttr}></textarea>`;
      break;
    case 'select': {
      const options = (field.options ?? '')
        .split(',')
        .map((option) => option.trim())
        .filter((option) => option.length > 0);
      const optionTags = options
        .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
        .join('');
      control = `<select id="${inputId}" name="${escapeHtml(field.key)}"${requiredAttr}><option value="" disabled selected>Pilih…</option>${optionTags}</select>`;
      break;
    }
    case 'email':
      control = `<input type="email" id="${inputId}" name="${escapeHtml(field.key)}"${requiredAttr}${placeholderAttr}>`;
      break;
    case 'number':
      control = `<input type="number" id="${inputId}" name="${escapeHtml(field.key)}"${requiredAttr}${placeholderAttr}>`;
      break;
    default:
      control = `<input type="text" id="${inputId}" name="${escapeHtml(field.key)}"${requiredAttr}${placeholderAttr}>`;
  }

  return `<div class="cms-form-field">
<label for="${inputId}">${label}${requiredMark}</label>
${control}
</div>`;
}

/**
 * Expands a `cms-form` embed into a real, submittable <form>. The submit
 * handler (delegated, theme-provided — see each theme's layouts.ts
 * "layoutLayout") POSTs JSON to the backend's public submit endpoint and
 * swaps in the success message client-side; see PublicFormsController.
 */
function renderFormEmbed(form: SiteRenderForm, siteId: string, apiBaseUrl: string): string {
  const action = `${apiBaseUrl}/sites/${siteId}/forms/${form.id}/submit`;
  const fieldsHtml = form.fields.map((field) => renderFormField(field, form.id)).join('\n');

  return `<form class="cms-form-embed" data-form-id="${form.id}" action="${escapeHtml(action)}" method="post" novalidate>
<h3 class="cms-form-title">${escapeHtml(form.title)}</h3>
${fieldsHtml}
<button type="submit" class="cms-form-submit">${escapeHtml(form.submitLabel)}</button>
<p class="cms-form-status" data-success-message="${escapeHtml(form.successMessage)}" hidden></p>
</form>`;
}
