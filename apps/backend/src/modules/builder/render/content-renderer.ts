import { Injectable } from '@nestjs/common';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import type { SiteRenderForm, SiteRenderFormField } from './site-renderer.types';

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
  // Semantic containers emitted by the Page Builder plugin. The plugin owns
  // their presentation; this renderer only preserves its tightly-scoped
  // markup after sanitization.
  'section',
  'article',
  'aside',
  'details',
  'summary',
  'dl',
  'dt',
  'dd',
];

/**
 * Exact public class contract of `unej.page-builder`. Keep this list explicit:
 * accepting a prefix wildcard such as `cms-pb-*` would let stored content opt
 * into future plugin behaviour before that behaviour has been security-reviewed.
 */
const PAGE_BUILDER_ALLOWED_CLASSES = [
  'cms-pb-hero',
  'cms-pb-hero--no-media',
  'cms-pb-hero__media',
  'cms-pb-hero__content',
  'cms-pb-hero__eyebrow',
  'cms-pb-hero__title',
  'cms-pb-hero__text',
  'cms-pb-callout',
  'cms-pb-callout__title',
  'cms-pb-callout__text',
  'cms-pb-card-grid',
  'cms-pb-card-grid__title',
  'cms-pb-card-grid__text',
  'cms-pb-card',
  'cms-pb-card__media',
  'cms-pb-card__body',
  'cms-pb-card__title',
  'cms-pb-card__text',
  'cms-pb-card__link',
  'cms-pb-gallery',
  'cms-pb-gallery__title',
  'cms-pb-gallery__item',
  'cms-pb-gallery__image',
  'cms-pb-gallery__caption',
  'cms-pb-stats',
  'cms-pb-stats__title',
  'cms-pb-stats__list',
  'cms-pb-stat',
  'cms-pb-stat__value',
  'cms-pb-stat__label',
  'cms-pb-faq',
  'cms-pb-faq__title',
  'cms-pb-faq__item',
  'cms-pb-faq__question',
  'cms-pb-faq__answer',
  'cms-pb-spacer',
  'cms-pb-tone-default',
  'cms-pb-tone-primary',
  'cms-pb-tone-dark',
  'cms-pb-tone-soft',
  'cms-pb-tone-info',
  'cms-pb-tone-success',
  'cms-pb-tone-warning',
  'cms-pb-align-left',
  'cms-pb-align-center',
  'cms-pb-cols-2',
  'cms-pb-cols-3',
  'cms-pb-cols-4',
  'cms-pb-space-sm',
  'cms-pb-space-md',
  'cms-pb-space-lg',
];

/**
 * Hanya class milik CMS yang boleh lolos — bukan atribut `class` bebas. Ini yang
 * membuat blok Tombol/Kolom/Embed/Kalender/Form bisa di-style tanpa membuka celah
 * bagi penulis konten untuk menempelkan class sembarangan ke tema.
 */
const ALLOWED_CLASSES = {
  // Page Builder may use its exact class contract on any semantic tag above.
  // sanitize-html merges this wildcard-tag list with tag-specific entries.
  '*': PAGE_BUILDER_ALLOWED_CLASSES,
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

/**
 * Markdown -> sanitized HTML, shared by every `SiteRenderer` implementation
 * (Eta, Svelte, ...) so there is exactly one copy of the security-critical
 * sanitizer allowlist, never one per renderer.
 */
@Injectable()
export class ContentRenderer {
  private readonly md: InstanceType<typeof MarkdownIt>;

  constructor() {
    // html: true diperlukan supaya blok kaya dari block editor admin (Tombol, Embed,
    // Kalender, Kolom) ter-render, bukan bocor sebagai teks mentah ke halaman. Ini
    // sengaja melonggarkan aturan "no raw HTML in content" di PRD: gerbang keamanan
    // yang sesungguhnya adalah sanitizeHtml di bawah — allowlist di sana lebih ketat
    // daripada default sanitize-html, dan `class` dibatasi lewat ALLOWED_CLASSES.
    // Jangan pernah melewati sanitizer itu.
    this.md = new MarkdownIt({ html: true, linkify: true, breaks: true });
  }

  renderMarkdown(
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
 * handler is shipped as a Form Builder plugin asset, POSTs JSON to the
 * backend's public submit endpoint, and swaps in the success message
 * client-side; see PublicFormsController.
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
