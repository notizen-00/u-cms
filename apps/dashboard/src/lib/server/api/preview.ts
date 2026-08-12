import type { RequestEvent } from '@sveltejs/kit';
import { API_URL } from '$lib/server/env';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

/**
 * Mints a short-lived preview token for one page
 * (docs/theme_aware_prd.md §22-§23). Minted server-side so the admin session
 * cookie never has to reach the preview iframe — the token alone authorises
 * it, and only for this page.
 */
export async function issuePreviewToken(
	event: MinimalEvent,
	siteId: string,
	pageId: string
): Promise<string> {
	const { token } = await apiFetch<{ token: string }>(
		event,
		`/sites/${siteId}/pages/${pageId}/preview-token`,
		{ method: 'POST' }
	);
	return token;
}

/** Absolute URL the preview iframe loads — points at the API, which renders through the real theme. */
export function previewUrl(pageId: string, token: string): string {
	return `${API_URL}/preview/pages/${pageId}?token=${encodeURIComponent(token)}`;
}

/**
 * Revokes every outstanding preview token for one page
 * (docs/theme_aware_prd.md §23's "dapat dicabut"). The proxy route mints and
 * spends a token within one request, so this mainly matters for a token that
 * escaped that flow — e.g. copied out of a network inspector.
 */
export async function revokePreviewTokens(
	event: MinimalEvent,
	siteId: string,
	pageId: string
): Promise<number> {
	const { revoked } = await apiFetch<{ revoked: number }>(
		event,
		`/sites/${siteId}/pages/${pageId}/preview-token/revoke`,
		{ method: 'POST' }
	);
	return revoked;
}
