import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSite, getSite } from '$lib/server/api/sites';
import { listNews } from '$lib/server/api/news';
import { listPages } from '$lib/server/api/pages';
import { ApiError } from '$lib/server/api/client';
import { canDeleteSite } from '$lib/permissions';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	// No client-knowable membership signal exists ahead of the call (see
	// $lib/permissions.ts) — the backend's own 403/404 on these calls is the guard.
	try {
		const [site, news, pages] = await Promise.all([
			getSite(event, siteId),
			listNews(event, siteId),
			listPages(event, siteId)
		]);

		return { site, newsCount: news.length, pagesCount: pages.length };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	delete: async (event) => {
		if (!canDeleteSite(event.locals.user)) {
			error(403, 'Hanya super admin yang bisa menghapus site.');
		}

		try {
			await deleteSite(event, event.params.siteId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		redirect(303, '/sites');
	}
};
