import type { RequestEvent } from '@sveltejs/kit';
import type { SitePlugin } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listSitePlugins(event: MinimalEvent, siteId: string): Promise<SitePlugin[]> {
	return apiFetch<SitePlugin[]>(event, `/sites/${siteId}/plugins`);
}

export function activateSitePlugin(event: MinimalEvent, siteId: string, slug: string): Promise<SitePlugin> {
	return apiFetch<SitePlugin>(event, `/sites/${siteId}/plugins/${slug}/activate`, { method: 'POST' });
}

export function deactivateSitePlugin(event: MinimalEvent, siteId: string, slug: string): Promise<SitePlugin> {
	return apiFetch<SitePlugin>(event, `/sites/${siteId}/plugins/${slug}/deactivate`, { method: 'POST' });
}

export function uninstallSitePlugin(
	event: MinimalEvent,
	siteId: string,
	slug: string
): Promise<{ success: boolean }> {
	return apiFetch<{ success: boolean }>(event, `/sites/${siteId}/plugins/${slug}`, { method: 'DELETE' });
}
