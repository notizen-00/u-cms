import type { RequestEvent } from '@sveltejs/kit';
import type { Theme, ThemeSettings } from '$lib/types';
import { apiFetch, apiUpload } from './client';
import { normalizeStorageUrl } from './storage-url';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export async function listThemes(event: MinimalEvent): Promise<Theme[]> {
	const themes = await apiFetch<Theme[]>(event, '/themes');
	return themes.map((theme) =>
		theme.screenshot ? { ...theme, screenshot: normalizeStorageUrl(theme.screenshot) } : theme
	);
}

/** `formData` must contain `file` (binary). Super admin only — enforced by the backend's SuperAdminGuard. */
export async function uploadThemeScreenshot(
	event: MinimalEvent,
	themeId: string,
	formData: FormData
): Promise<{ themeId: string; screenshotUrl: string }> {
	const result = await apiUpload<{ themeId: string; screenshotUrl: string }>(
		event,
		`/themes/${themeId}/screenshot`,
		formData
	);
	return { ...result, screenshotUrl: normalizeStorageUrl(result.screenshotUrl) };
}

export function removeThemeScreenshot(
	event: MinimalEvent,
	themeId: string
): Promise<{ themeId: string; screenshotUrl: null }> {
	return apiFetch(event, `/themes/${themeId}/screenshot`, { method: 'DELETE' });
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
