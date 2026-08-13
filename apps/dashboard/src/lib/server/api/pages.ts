import type { RequestEvent } from '@sveltejs/kit';
import type { ContentStatus, PageBlock, PageItem } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listPages(event: MinimalEvent, siteId: string): Promise<PageItem[]> {
	return apiFetch<PageItem[]>(event, `/sites/${siteId}/pages`);
}

/** No dedicated backend endpoint for this — same `listPages` + find idiom used elsewhere (e.g. pages/[pageId]/+page.svelte's `otherPages`). */
export async function getHomepagePage(event: MinimalEvent, siteId: string): Promise<PageItem | null> {
	const pages = await listPages(event, siteId);
	return pages.find((page) => page.isHomepage) ?? null;
}

export function getPageItem(event: MinimalEvent, siteId: string, pageId: string): Promise<PageItem> {
	return apiFetch<PageItem>(event, `/sites/${siteId}/pages/${pageId}`);
}

/**
 * `parentId` is `.optional()`, NOT `.nullable()` (create-page.dto.ts / update-page.dto.ts)
 * — omit rather than send `null`. Note this means there is currently no way to CLEAR
 * an already-set parentId back to "no parent" via this API (omitting the key on PATCH
 * leaves the existing value untouched, and `null` is rejected) — a real backend gap.
 */
export interface PageInput {
	title: string;
	slug: string;
	bodyMarkdown: string;
	/** Structured block content (docs/theme_aware_prd.md §8) — sent by the theme-aware builder. */
	blocks?: PageBlock[];
	parentId?: string;
	isHomepage?: boolean;
	order?: number;
	status?: ContentStatus;
}

export function createPage(event: MinimalEvent, siteId: string, input: PageInput): Promise<PageItem> {
	return apiFetch<PageItem>(event, `/sites/${siteId}/pages`, { method: 'POST', body: input });
}

export function updatePage(
	event: MinimalEvent,
	siteId: string,
	pageId: string,
	input: Partial<PageInput>
): Promise<PageItem> {
	return apiFetch<PageItem>(event, `/sites/${siteId}/pages/${pageId}`, { method: 'PATCH', body: input });
}

export function deletePage(event: MinimalEvent, siteId: string, pageId: string): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/pages/${pageId}`, { method: 'DELETE' });
}

export function publishPage(event: MinimalEvent, siteId: string, pageId: string): Promise<PageItem> {
	return apiFetch<PageItem>(event, `/sites/${siteId}/pages/${pageId}/publish`, { method: 'POST' });
}

/** Publishes the Builder's draft `blocks` (docs/theme_aware_prd.md §16) — distinct from `publishPage`, which has no notion of a blocks snapshot. */
export function publishPageBlocks(
	event: MinimalEvent,
	siteId: string,
	pageId: string
): Promise<PageItem> {
	return apiFetch<PageItem>(event, `/sites/${siteId}/pages/${pageId}/publish-blocks`, {
		method: 'POST'
	});
}
