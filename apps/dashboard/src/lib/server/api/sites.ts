import type { RequestEvent } from '@sveltejs/kit';
import type { AddSiteMemberInput, Site } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listSites(event: MinimalEvent): Promise<Site[]> {
	return apiFetch<Site[]>(event, '/sites');
}

export function getSite(event: MinimalEvent, siteId: string): Promise<Site> {
	return apiFetch<Site>(event, `/sites/${siteId}`);
}

/**
 * `domain`/`logoUrl`/`faviconUrl` are `.optional()` in the backend's Zod schema,
 * NOT `.nullable()` (create-site.dto.ts) — sending `null` fails validation with a
 * 400. Omit the key entirely (leave it `undefined`) instead of passing `null`.
 */
export interface SiteInput {
	slug: string;
	name: string;
	domain?: string;
	logoUrl?: string;
	faviconUrl?: string;
}

export function createSite(event: MinimalEvent, input: SiteInput): Promise<Site> {
	return apiFetch<Site>(event, '/sites', { method: 'POST', body: input });
}

export function updateSite(event: MinimalEvent, siteId: string, input: Partial<SiteInput>): Promise<Site> {
	return apiFetch<Site>(event, `/sites/${siteId}`, { method: 'PATCH', body: input });
}

export function deleteSite(event: MinimalEvent, siteId: string): Promise<void> {
	return apiFetch(event, `/sites/${siteId}`, { method: 'DELETE' });
}

/**
 * Confirmed against sites.controller.ts: there is NO `GET /sites/:id/members` —
 * only add/remove exist. The backend genuinely cannot list a site's current
 * members in Phase 1; this is a real gap beyond PRD §13's documented list.
 */
export function addSiteMember(event: MinimalEvent, siteId: string, input: AddSiteMemberInput): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/members`, { method: 'POST', body: input });
}

export function removeSiteMember(event: MinimalEvent, siteId: string, userId: string): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/members/${userId}`, { method: 'DELETE' });
}
