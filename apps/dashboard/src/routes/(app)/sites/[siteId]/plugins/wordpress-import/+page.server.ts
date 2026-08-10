import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listWordpressImports } from '$lib/server/api/wordpress-import';
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
