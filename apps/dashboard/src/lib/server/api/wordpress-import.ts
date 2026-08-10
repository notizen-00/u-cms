import type { RequestEvent } from '@sveltejs/kit';
import type { WordpressImport } from '$lib/types';
import { apiFetch, apiUpload } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listWordpressImports(event: MinimalEvent, siteId: string): Promise<WordpressImport[]> {
	return apiFetch<WordpressImport[]>(event, `/sites/${siteId}/wordpress-import`);
}

export function getWordpressImport(event: MinimalEvent, siteId: string, id: string): Promise<WordpressImport> {
	return apiFetch<WordpressImport>(event, `/sites/${siteId}/wordpress-import/${id}`);
}

/** `formData` must contain `file` (the WXR `.xml` export). */
export function uploadWordpressImport(
	event: MinimalEvent,
	siteId: string,
	formData: FormData
): Promise<WordpressImport> {
	return apiUpload<WordpressImport>(event, `/sites/${siteId}/wordpress-import`, formData);
}
