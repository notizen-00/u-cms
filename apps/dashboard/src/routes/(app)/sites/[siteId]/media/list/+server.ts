import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listMedia } from '$lib/server/api/media';
import { ApiError } from '$lib/server/api/client';
import type { MediaTypeFilter } from '$lib/types';

/** Client-fetchable JSON list endpoint — used by MediaPicker.svelte, which opens as a modal from
 * other routes (News/Site forms) and so can't rely on this route's own SSR `load` for data. */
export const GET: RequestHandler = async (event) => {
	const { siteId } = event.params;
	const { searchParams } = event.url;
	const page = Number(searchParams.get('page')) || undefined;
	const limit = Number(searchParams.get('limit')) || undefined;
	const type = (searchParams.get('type') as MediaTypeFilter | null) ?? undefined;
	const search = searchParams.get('search') ?? undefined;

	try {
		const result = await listMedia(event, siteId, { page, limit, type, search });
		return json(result);
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message }, { status: err.status || 400 });
		}
		throw err;
	}
};
