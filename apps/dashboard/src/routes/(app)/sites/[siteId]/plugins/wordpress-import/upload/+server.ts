import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadWordpressImport } from '$lib/server/api/wordpress-import';
import { ApiError } from '$lib/server/api/client';

/**
 * Plain `+server.ts` (not a form action) so the page can `fetch` it directly
 * and read the JSON response for the freshly-queued import row — same
 * reasoning as `media/upload/+server.ts`. Never touches the backend
 * directly from the browser: this forwards the multipart body server-side
 * with the admin's own session cookie attached.
 */
export const POST: RequestHandler = async (event) => {
	const { siteId } = event.params;
	const formData = await event.request.formData();

	try {
		const importRow = await uploadWordpressImport(event, siteId, formData);
		return json(importRow, { status: 201 });
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message }, { status: err.status || 400 });
		}
		throw err;
	}
};
