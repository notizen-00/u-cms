import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAiContent } from '$lib/server/api/ai';
import { ApiError } from '$lib/server/api/client';

/** Client-fetchable proxy the block editor's "Buat dengan AI" dialog hits, so the
 * chat.unej.id bearer token (held by the backend) never reaches the browser. */
export const POST: RequestHandler = async (event) => {
	const { siteId } = event.params;
	const body = await event.request.json().catch(() => null);
	const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

	if (!prompt) {
		return json({ message: 'Prompt tidak boleh kosong.' }, { status: 400 });
	}

	try {
		const result = await generateAiContent(event, siteId, prompt);
		return json(result);
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message }, { status: err.status || 400 });
		}
		throw err;
	}
};
