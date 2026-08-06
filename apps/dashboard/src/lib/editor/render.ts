import { browser } from '$app/environment';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Preview HTML is sanitized client-side even though the backend also sanitizes the
 * published version — this pane never passes through the backend sanitizer (PRD.md §12).
 *
 * `iframe` is allowed back in because the embed block's whole purpose is to render one,
 * and its `src` is authored by a logged-in site member (same trust level as `bodyMarkdown`
 * itself). Everything else stays on DOMPurify's default deny list.
 */
export function renderMarkdown(markdown: string): string {
	// DOMPurify needs a real DOM; these editor routes are SSR'd, so skip on the server
	// and let the client fill the pane in on hydration.
	if (!browser || !markdown) return '';
	const html = marked.parse(markdown, { async: false, gfm: true }) as string;
	return DOMPurify.sanitize(html, {
		ADD_TAGS: ['iframe'],
		ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'loading', 'target']
	});
}
