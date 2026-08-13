import type { Handle } from '@sveltejs/kit';
import { error, isRedirect, redirect } from '@sveltejs/kit';
import { getMe } from '$lib/server/api/auth';
import { getSetupStatus } from '$lib/server/api/setup';

/**
 * The Page Builder's preview proxy (routes/.../pages/[pageId]/preview/
 * +server.ts) is deliberately framed by the Builder page itself — same
 * origin, same session, on purpose (docs/theme_aware_prd.md §14) — so it
 * needs `SAMEORIGIN` rather than the blanket `DENY` every other response
 * gets. This is not a dev-only relaxation: the proxy is framed the same way
 * in production, so scoping the exception to this one route (rather than
 * toggling strictness by environment) is what keeps every other response
 * unframeable everywhere, including in development.
 */
const PREVIEW_ROUTE = /^\/sites\/[^/]+\/pages\/[^/]+\/preview$/;

/**
 * Baseline headers for every admin response. No Content-Security-Policy here
 * — a hand-written CSP is fragile against real page content (external
 * images/videos, third-party embeds) and risks blocking legitimate content
 * without a way to fully test every case in advance. These four don't
 * restrict what a page can load, so they carry none of that risk.
 */
function applySecurityHeaders(headers: Headers, pathname: string): void {
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('X-Frame-Options', PREVIEW_ROUTE.test(pathname) ? 'SAMEORIGIN' : 'DENY');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), interest-cohort=()');
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;
	const isSetupPage = pathname === '/setup';
	const isLoginPage = pathname === '/login';

	event.locals.user = null;

	try {
		const { needsSetup } = await getSetupStatus(event);

		if (needsSetup) {
			if (!isSetupPage) redirect(303, '/setup');
			return resolve(event);
		}

		if (isSetupPage) redirect(303, '/login');
	} catch (err) {
		// Preserve redirects thrown by SvelteKit; only API/network failures become 503.
		if (isRedirect(err)) throw err;
		error(503, 'Tidak bisa memeriksa status instalasi CMS. Pastikan server API dan database berjalan.');
	}

	try {
		event.locals.user = await getMe(event);
	} catch {
		// API unreachable / 5xx — surface a clear error instead of a silent redirect loop.
		if (isLoginPage) {
			event.locals.user = null;
		} else {
			error(503, 'Tidak bisa terhubung ke server API. Coba beberapa saat lagi.');
		}
	}

	if (!isLoginPage && !event.locals.user) {
		redirect(303, `/login?redirect=${encodeURIComponent(pathname + search)}`);
	}

	if (isLoginPage && event.locals.user) {
		redirect(303, '/');
	}

	const response = await resolve(event);
	applySecurityHeaders(response.headers, pathname);
	return response;
};
