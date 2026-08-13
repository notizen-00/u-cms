import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { issuePreviewToken, previewUrl } from '$lib/server/api/preview';
import { ApiError } from '$lib/server/api/client';
import { PREVIEW_EDITOR_SCRIPT, PREVIEW_EDITOR_STYLE } from '$lib/server/preview-editor-script';

/**
 * Adds the Builder's click-to-select/insert editing chrome right before
 * `</body>` (same idea as the API's own `injectBeforeClosingTag` in
 * plugin-assets.ts, reimplemented here rather than imported — this is
 * dashboard editing UX, not core rendering, so it stays decoupled from that
 * package). Unlike the API's version, a missing `</body>` fails gracefully
 * (preview still renders, just without editing chrome) rather than throwing
 * — this injection is cosmetic, not something a broken preview should hinge on.
 */
function injectBeforeClosingBody(html: string, content: string): string {
	const match = /<\/body\s*>/i.exec(html);
	if (!match || match.index === undefined) return html;
	return `${html.slice(0, match.index)}${content}\n${html.slice(match.index)}`;
}

/**
 * Same-origin proxy for the page preview.
 *
 * The builder frames this rather than the API directly: the API sets helmet's
 * default `frame-ancestors 'self'`, so a cross-origin iframe from the
 * dashboard is blocked outright. Serving the preview from the dashboard's own
 * origin sidesteps that without weakening the API's CSP — and mirrors how
 * every other backend call in this app is proxied server-side.
 *
 * It also keeps the preview token off the browser entirely: it is minted and
 * spent here, so a shared screenshot of the URL grants nothing.
 */
export const GET: RequestHandler = async (event) => {
	const { siteId, pageId } = event.params;

	try {
		const token = await issuePreviewToken(event, siteId, pageId);
		const response = await event.fetch(previewUrl(pageId, token));
		const html = injectBeforeClosingBody(
			await response.text(),
			`<style>${PREVIEW_EDITOR_STYLE}</style><script>${PREVIEW_EDITOR_SCRIPT}</script>`
		);

		return new Response(html, {
			status: response.status,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				// Draft content: never store it anywhere.
				'Cache-Control': 'no-store, max-age=0',
				'X-Robots-Tag': 'noindex, nofollow'
			}
		});
	} catch (err) {
		if (err instanceof ApiError) {
			error(err.status || 500, err.message);
		}
		throw err;
	}
};
