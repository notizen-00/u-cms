import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listPages } from '$lib/server/api/pages';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	try {
		const [site, pages] = await Promise.all([getSite(event, siteId), listPages(event, siteId)]);
		return { site, pages: pages.sort((a, b) => a.order - b.order) };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};
