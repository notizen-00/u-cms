import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWordpressImport } from '$lib/server/api/wordpress-import';
import { ApiError } from '$lib/server/api/client';

/** Same-origin proxy the page's client-side status poll hits, so the admin's session cookie stays server-side. */
export const GET: RequestHandler = async (event) => {
	const { siteId, id } = event.params;

	try {
		const importRow = await getWordpressImport(event, siteId, id as string);
		return json(importRow);
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message }, { status: err.status || 400 });
		}
		throw err;
	}
};
