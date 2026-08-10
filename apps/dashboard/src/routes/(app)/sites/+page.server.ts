import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSite, listSites } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import { canDeleteSite } from '$lib/permissions';

export const load: PageServerLoad = async (event) => {
	// IA (PRD §8) scopes this listing page to super_admin; other roles reach their
	// site via the sidebar's active-site section instead.
	if (!event.locals.user!.isSuperAdmin) redirect(303, '/');

	const sites = await listSites(event);
	return { sites };
};

export const actions: Actions = {
	bulkDelete: async (event) => {
		if (!canDeleteSite(event.locals.user)) {
			error(403, 'Hanya super admin yang bisa menghapus site.');
		}

		const formData = await event.request.formData();
		const ids = formData.getAll('ids').map(String);

		try {
			await Promise.all(ids.map((id) => deleteSite(event, id)));
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	}
};
