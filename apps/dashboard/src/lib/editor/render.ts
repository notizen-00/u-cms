import { browser } from '$app/environment';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
	'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
	'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr', 'span',
	'div', 'iframe', 'caption', 'figure', 'figcaption', 'section', 'article',
	'aside', 'details', 'summary', 'dl', 'dt', 'dd'
] as const;

const ALLOWED_ATTRIBUTES = [
	'href', 'name', 'target', 'rel', 'src', 'alt', 'loading', 'title',
	'allowfullscreen', 'class', 'data-form-id'
] as const;

/** Keep preview classes as strict as the public ContentRenderer contract. */
const ALLOWED_CLASSES = new Set([
	'cms-button', 'cms-columns', 'cms-column', 'cms-embed', 'cms-calendar', 'cms-form',
	'cms-pb-hero', 'cms-pb-hero--no-media', 'cms-pb-hero__media', 'cms-pb-hero__content',
	'cms-pb-hero__eyebrow', 'cms-pb-hero__title', 'cms-pb-hero__text',
	'cms-pb-callout', 'cms-pb-callout__title', 'cms-pb-callout__text',
	'cms-pb-card-grid', 'cms-pb-card-grid__title', 'cms-pb-card-grid__text',
	'cms-pb-card', 'cms-pb-card__media', 'cms-pb-card__body',
	'cms-pb-card__title', 'cms-pb-card__text', 'cms-pb-card__link',
	'cms-pb-gallery', 'cms-pb-gallery__title', 'cms-pb-gallery__item',
	'cms-pb-gallery__image', 'cms-pb-gallery__caption',
	'cms-pb-stats', 'cms-pb-stats__title', 'cms-pb-stats__list',
	'cms-pb-stat', 'cms-pb-stat__value', 'cms-pb-stat__label',
	'cms-pb-faq', 'cms-pb-faq__title', 'cms-pb-faq__item',
	'cms-pb-faq__question', 'cms-pb-faq__answer', 'cms-pb-spacer',
	'cms-pb-tone-default', 'cms-pb-tone-primary', 'cms-pb-tone-dark',
	'cms-pb-tone-soft', 'cms-pb-tone-info', 'cms-pb-tone-success',
	'cms-pb-tone-warning', 'cms-pb-align-left', 'cms-pb-align-center',
	'cms-pb-cols-2', 'cms-pb-cols-3', 'cms-pb-cols-4',
	'cms-pb-space-sm', 'cms-pb-space-md', 'cms-pb-space-lg'
]);

const ALLOWED_IFRAME_HOSTS = new Set(['www.youtube.com', 'player.vimeo.com']);
let hooksInstalled = false;

function isAllowedIframeSource(value: string): boolean {
	try {
		const url = new URL(value, window.location.origin);
		return url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.has(url.hostname);
	} catch {
		return false;
	}
}

function installPreviewSanitizerHooks(): void {
	if (hooksInstalled) return;

	DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
		if (data.attrName !== 'class') return;
		const classes = data.attrValue.split(/\s+/).filter((name) => ALLOWED_CLASSES.has(name));
		data.attrValue = classes.join(' ');
		data.keepAttr = classes.length > 0;
	});

	DOMPurify.addHook('uponSanitizeElement', (node, data) => {
		if (data.tagName !== 'iframe' || !(node instanceof Element)) return;
		const source = node.getAttribute('src');
		if (!source || !isAllowedIframeSource(source)) node.remove();
	});

	hooksInstalled = true;
}

/**
 * Browser preview uses the same finite surface as the public renderer. This is
 * deliberately stricter than DOMPurify defaults: custom HTML cannot inject
 * styles, utility classes, forms, controls, or arbitrary iframe hosts into the
 * authenticated dashboard.
 */
export function renderMarkdown(markdown: string): string {
	if (!browser || !markdown) return '';
	installPreviewSanitizerHooks();
	const html = marked.parse(markdown, { async: false, gfm: true }) as string;
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [...ALLOWED_TAGS],
		ALLOWED_ATTR: [...ALLOWED_ATTRIBUTES],
		ALLOW_DATA_ATTR: false,
		FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
		FORBID_ATTR: ['style']
	});
}
