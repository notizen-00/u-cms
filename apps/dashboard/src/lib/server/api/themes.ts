import type { RequestEvent } from '@sveltejs/kit';
import type { Theme, ThemeSettings } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listThemes(event: MinimalEvent): Promise<Theme[]> {
	return apiFetch<Theme[]>(event, '/themes');
}

export function setSiteTheme(
	event: MinimalEvent,
	siteId: string,
	themeId: string
): Promise<{ id: string; themeId: string }> {
	return apiFetch(event, `/sites/${siteId}/theme`, { method: 'PATCH', body: { themeId } });
}

export function getThemeSettings(event: MinimalEvent, siteId: string): Promise<ThemeSettings> {
	return apiFetch(event, `/sites/${siteId}/theme/settings`);
}

export function updateThemeSettings(
	event: MinimalEvent,
	siteId: string,
	values: Record<string, unknown>
): Promise<{ themeId: string; values: Record<string, unknown> }> {
	return apiFetch(event, `/sites/${siteId}/theme/settings`, { method: 'PATCH', body: values });
}
