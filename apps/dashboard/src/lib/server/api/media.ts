import type { RequestEvent } from '@sveltejs/kit';
import type { Media, MediaListResult, MediaTypeFilter } from '$lib/types';
import { apiFetch, apiUpload } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

/**
 * The backend returns `url` pointing at MinIO's internal Docker hostname (e.g.
 * `http://minio:9000/...`), which only resolves inside the compose network — the
 * browser can't reach it. Rewrite to `localhost` (same port/path) so uploaded
 * files actually load for the admin browsing from the host machine.
 */
function normalizeMediaUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname === 'minio') {
			parsed.hostname = 'localhost';
		}
		return parsed.toString();
	} catch {
		return url;
	}
}

function normalizeMedia(media: Media): Media {
	return { ...media, url: normalizeMediaUrl(media.url) };
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
