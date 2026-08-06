import type { RequestEvent } from '@sveltejs/kit';
import type { ContentStatus, NewsItem } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listNews(event: MinimalEvent, siteId: string): Promise<NewsItem[]> {
	return apiFetch<NewsItem[]>(event, `/sites/${siteId}/news`);
}

export function getNewsItem(event: MinimalEvent, siteId: string, newsId: string): Promise<NewsItem> {
	return apiFetch<NewsItem>(event, `/sites/${siteId}/news/${newsId}`);
}

/** `excerpt`/`featuredImageUrl` are `.optional()`, NOT `.nullable()` (create-news.dto.ts) — omit rather than send `null`. */
export interface NewsInput {
	title: string;
	slug: string;
	excerpt?: string;
	bodyMarkdown: string;
	featuredImageUrl?: string;
	status?: ContentStatus;
}

export function createNews(event: MinimalEvent, siteId: string, input: NewsInput): Promise<NewsItem> {
	return apiFetch<NewsItem>(event, `/sites/${siteId}/news`, { method: 'POST', body: input });
}

export function updateNews(
	event: MinimalEvent,
	siteId: string,
	newsId: string,
	input: Partial<NewsInput>
): Promise<NewsItem> {
	return apiFetch<NewsItem>(event, `/sites/${siteId}/news/${newsId}`, { method: 'PATCH', body: input });
}

export function deleteNews(event: MinimalEvent, siteId: string, newsId: string): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/news/${newsId}`, { method: 'DELETE' });
}

export function publishNews(event: MinimalEvent, siteId: string, newsId: string): Promise<NewsItem> {
	return apiFetch<NewsItem>(event, `/sites/${siteId}/news/${newsId}/publish`, { method: 'POST' });
}
