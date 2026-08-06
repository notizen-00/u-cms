import type { RequestEvent } from '@sveltejs/kit';
import type { SetupInitInput, SetupStatus } from '$lib/types';
import { rawApiFetch, toApiError } from './client';
import { mirrorSessionCookie } from './auth';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export async function getSetupStatus(event: Pick<RequestEvent, 'fetch'>): Promise<SetupStatus> {
	const response = await rawApiFetch('/setup/status', { fetch: event.fetch });

	if (!response.ok) {
		throw await toApiError(response);
	}

	return (await response.json()) as SetupStatus;
}

export async function initializeSetup(
	event: MinimalEvent,
	input: SetupInitInput,
	setupToken?: string
): Promise<void> {
	const response = await rawApiFetch('/setup/init', {
		method: 'POST',
		body: input,
		fetch: event.fetch,
		headers: setupToken ? { 'X-Setup-Token': setupToken } : undefined
	});

	if (!response.ok) {
		throw await toApiError(response);
	}

	mirrorSessionCookie(event, response, 'Setup berhasil, tetapi sesi login tidak diterima dari server.');
}
