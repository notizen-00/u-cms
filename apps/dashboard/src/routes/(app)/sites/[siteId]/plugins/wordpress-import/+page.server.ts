import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteWordpressImport, listWordpressImports } from '$lib/server/api/wordpress-import';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	try {
		const [site, imports] = await Promise.all([
			getSite(event, siteId),
			listWordpressImports(event, siteId)
		]);
		return { site, imports };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(
				err.status,
				err.status === 403
					? 'Anda tidak punya akses ke site ini, atau plugin WordPress Import belum aktif.'
					: 'Site tidak ditemukan.'
			);
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
			await deleteWordpressImport(event, siteId, id);
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
			await Promise.all(ids.map((id) => deleteWordpressImport(event, siteId, id)));
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	}
};
