import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function generateAiContent(
	event: MinimalEvent,
	siteId: string,
	prompt: string
): Promise<{ title: string; text: string }> {
	return apiFetch<{ title: string; text: string }>(event, `/sites/${siteId}/ai/generate`, {
		method: 'POST',
		body: { prompt }
	});
}
