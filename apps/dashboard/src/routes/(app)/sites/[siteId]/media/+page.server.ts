import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteMedia, listMedia, updateMedia } from '$lib/server/api/media';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import type { MediaTypeFilter } from '$lib/types';

const LIMIT = 20;

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;
	const page = Number(event.url.searchParams.get('page')) || 1;
	const type = (event.url.searchParams.get('type') as MediaTypeFilter | null) ?? undefined;
	const search = event.url.searchParams.get('search') ?? undefined;

	try {
		const [site, media] = await Promise.all([
			getSite(event, siteId),
			listMedia(event, siteId, { page, limit: LIMIT, type, search })
		]);
		return { site, media, filters: { type: type ?? 'all', search: search ?? '' } };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	update: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');
		const altText = String(formData.get('altText') ?? '').trim();
		const caption = String(formData.get('caption') ?? '').trim();

		try {
			await updateMedia(event, siteId, id, { altText, caption });
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}

		return { success: true };
	},

	delete: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');

		try {
			await deleteMedia(event, siteId, id);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	}
};
