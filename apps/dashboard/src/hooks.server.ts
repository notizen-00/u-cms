import type { Handle } from '@sveltejs/kit';
import { error, isRedirect, redirect } from '@sveltejs/kit';
import { getMe } from '$lib/server/api/auth';
import { getSetupStatus } from '$lib/server/api/setup';

/**
 * Baseline headers for every admin response. No Content-Security-Policy here
 * (unlike the public sites this CMS builds, which get one per theme — see
 * `apps/backend`'s `render/security-headers.ts`): the dashboard is a live
 * SvelteKit app rather than static HTML, and a hand-written CSP risks
 * silently breaking its own bundle in ways that are hard to catch without a
 * full production smoke test. These four have no such downside.
 */
function applySecurityHeaders(headers: Headers): void {
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('X-Frame-Options', 'DENY');
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
	applySecurityHeaders(response.headers);
	return response;
};
