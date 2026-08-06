import { dev } from '$app/environment';
import { SESSION_COOKIE_NAME } from '$lib/server/env';
import type { AuthUser, SessionInfo } from '$lib/types';
import { apiFetch, ApiError, rawApiFetch, toApiError } from './client';
import type { RequestEvent } from '@sveltejs/kit';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

function parseSetCookie(header: string, name: string): { value: string; maxAge?: number } | null {
	const [nameValue, ...attrs] = header.split(';').map((p) => p.trim());
	const eqIdx = nameValue.indexOf('=');
	if (eqIdx === -1 || nameValue.slice(0, eqIdx) !== name) return null;

	// Backend (auth.controller.ts) sets `expires` (a Date), not `max-age` — support both.
	let maxAge: number | undefined;
	let expires: Date | undefined;
	for (const attr of attrs) {
		const [attrName, attrValue] = attr.split('=');
		const lower = attrName?.toLowerCase();
		if (lower === 'max-age' && attrValue) maxAge = Number(attrValue);
		if (lower === 'expires' && attrValue) expires = new Date(attrValue);
	}
	if (maxAge === undefined && expires) {
		maxAge = Math.max(0, Math.round((expires.getTime() - Date.now()) / 1000));
	}

	return { value: nameValue.slice(eqIdx + 1), maxAge };
}

export function mirrorSessionCookie(
	event: MinimalEvent,
	response: Response,
	missingCookieMessage = 'Login berhasil tapi sesi tidak diterima dari server.'
): void {
	const setCookieHeaders =
		typeof response.headers.getSetCookie === 'function'
			? response.headers.getSetCookie()
			: response.headers.get('set-cookie')
				? [response.headers.get('set-cookie') as string]
				: [];

	const sessionCookie = setCookieHeaders
		.map((header) => parseSetCookie(header, SESSION_COOKIE_NAME))
		.find((parsed): parsed is { value: string; maxAge?: number } => parsed !== null);

	if (!sessionCookie) {
		throw new ApiError(500, missingCookieMessage);
	}

	event.cookies.set(SESSION_COOKIE_NAME, sessionCookie.value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: sessionCookie.maxAge ?? 60 * 60 * 24 * 7
	});
}

/**
 * Logs in against the API, then mirrors the API's Set-Cookie into the admin
 * app's own cookie jar (see plan §1: BFF proxy) so the browser only ever
 * talks to this app's origin, never the API directly.
 *
 * Response body is `{ user: AuthUser }` (auth.controller.ts `login()`), not a
 * bare AuthUser — confirmed against the real backend.
 */
export async function login(event: MinimalEvent, email: string, password: string): Promise<AuthUser> {
	const response = await rawApiFetch('/auth/login', {
		method: 'POST',
		body: { email, password },
		fetch: event.fetch
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new ApiError(401, 'Email atau password salah.');
		}
		if (response.status === 429) {
			throw new ApiError(429, 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.');
		}
		throw await toApiError(response);
	}

	mirrorSessionCookie(event, response);

	const body = (await response.json()) as { user: AuthUser };
	return body.user;
}

export async function logout(event: MinimalEvent): Promise<void> {
	try {
		await apiFetch(event, '/auth/logout', { method: 'POST' });
	} finally {
		event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	}
}

/** Returns `null` only when the caller genuinely isn't authenticated (401). Network/5xx errors are rethrown so hooks.server.ts can show a "can't reach API" state instead of a silent logout. */
export async function getMe(event: MinimalEvent): Promise<AuthUser | null> {
	try {
		const body = await apiFetch<{ user: AuthUser }>(event, '/auth/me');
		return body.user;
	} catch (err) {
		if (err instanceof ApiError && err.status === 401) {
			return null;
		}
		throw err;
	}
}

export function listSessions(event: MinimalEvent): Promise<SessionInfo[]> {
	return apiFetch<SessionInfo[]>(event, '/auth/sessions');
}

export function revokeSession(event: MinimalEvent, sessionId: string): Promise<void> {
	return apiFetch(event, `/auth/sessions/${sessionId}`, { method: 'DELETE' });
}
