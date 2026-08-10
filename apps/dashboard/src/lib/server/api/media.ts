import type { RequestEvent } from '@sveltejs/kit';
import type { Media, MediaListResult, MediaTypeFilter } from '$lib/types';
import { apiFetch, apiUpload } from './client';
import { normalizeStorageUrl } from './storage-url';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

function normalizeMedia(media: Media): Media {
	return { ...media, url: normalizeStorageUrl(media.url) };
}

export interface ListMediaParams {
	page?: number;
	limit?: number;
	type?: MediaTypeFilter;
	search?: string;
}

export async function listMedia(event: MinimalEvent, siteId: string, params: ListMediaParams = {}): Promise<MediaListResult> {
	const query = new URLSearchParams();
	if (params.page) query.set('page', String(params.page));
	if (params.limit) query.set('limit', String(params.limit));
	if (params.type) query.set('type', params.type);
	if (params.search) query.set('search', params.search);
	const qs = query.toString();
	const result = await apiFetch<MediaListResult>(event, `/sites/${siteId}/media${qs ? `?${qs}` : ''}`);
	return { ...result, items: result.items.map(normalizeMedia) };
}

export async function getMediaItem(event: MinimalEvent, siteId: string, id: string): Promise<Media> {
	const media = await apiFetch<Media>(event, `/sites/${siteId}/media/${id}`);
	return normalizeMedia(media);
}

/** `formData` must contain `file` (binary) plus optional `altText`/`caption` text fields (media_guide.md §7). */
export async function uploadMedia(event: MinimalEvent, siteId: string, formData: FormData): Promise<Media> {
	const media = await apiUpload<Media>(event, `/sites/${siteId}/media`, formData);
	return normalizeMedia(media);
}

export interface MediaUpdateInput {
	altText?: string;
	caption?: string;
}

export async function updateMedia(event: MinimalEvent, siteId: string, id: string, input: MediaUpdateInput): Promise<Media> {
	const media = await apiFetch<Media>(event, `/sites/${siteId}/media/${id}`, { method: 'PATCH', body: input });
	return normalizeMedia(media);
}

export function deleteMedia(event: MinimalEvent, siteId: string, id: string): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/media/${id}`, { method: 'DELETE' });
}
