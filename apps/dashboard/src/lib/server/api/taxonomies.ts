import type { RequestEvent } from '@sveltejs/kit';
import type { Category, Tag } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

/** Backend orders categories by name already (`categories.service.ts`). */
export function listCategories(event: MinimalEvent, siteId: string): Promise<Category[]> {
	return apiFetch<Category[]>(event, `/sites/${siteId}/categories`);
}

export interface CategoryInput {
	name: string;
	slug: string;
	parentId?: string | null;
}

export function createCategory(
	event: MinimalEvent,
	siteId: string,
	input: CategoryInput
): Promise<Category> {
	return apiFetch<Category>(event, `/sites/${siteId}/categories`, { method: 'POST', body: input });
}

export function listTags(event: MinimalEvent, siteId: string): Promise<Tag[]> {
	return apiFetch<Tag[]>(event, `/sites/${siteId}/tags`);
}

export function createTag(
	event: MinimalEvent,
	siteId: string,
	input: { name: string; slug: string }
): Promise<Tag> {
	return apiFetch<Tag>(event, `/sites/${siteId}/tags`, { method: 'POST', body: input });
}
