import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadMedia } from '$lib/server/api/media';
import { ApiError } from '$lib/server/api/client';

/**
 * Plain JSON `+server.ts` (not a form action) so the browser can upload via `XMLHttpRequest`
 * and get real `upload.onprogress` events — native `fetch`/form actions expose no upload
 * progress (media_guide.md §8). Still never touches MinIO directly: this just forwards the
 * multipart body to the NestJS API with the admin session cookie attached server-side.
 */
export const POST: RequestHandler = async (event) => {
	const { siteId } = event.params;
	const formData = await event.request.formData();

	try {
		const media = await uploadMedia(event, siteId, formData);
		return json(media, { status: 201 });
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message, errors: err.fieldErrors ?? null }, { status: err.status || 400 });
		}
		throw err;
	}
};
