import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteNews, listNews } from '$lib/server/api/news';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	try {
		const [site, news] = await Promise.all([getSite(event, siteId), listNews(event, siteId)]);
		return { site, news };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	delete: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');

		try {
			await deleteNews(event, siteId, id);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	},

	bulkDelete: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const ids = formData.getAll('ids').map(String);

		try {
			await Promise.all(ids.map((id) => deleteNews(event, siteId, id)));
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	}
};
