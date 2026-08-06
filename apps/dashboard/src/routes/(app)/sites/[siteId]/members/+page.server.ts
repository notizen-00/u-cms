import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { addSiteMember, getSite, removeSiteMember } from '$lib/server/api/sites';
import { listUsers } from '$lib/server/api/users';
import { ApiError } from '$lib/server/api/client';
import { canManageMembers } from '$lib/permissions';
import { SITE_ROLES, type SiteRole } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	if (!canManageMembers(event.locals.user)) {
		error(403, 'Hanya super admin yang bisa mengelola anggota site.');
	}

	const { siteId } = event.params;
	// There is no GET /sites/:id/members on the backend (only add/remove exist) —
	// this page cannot show who currently has access; see the note in the UI.
	const [site, users] = await Promise.all([getSite(event, siteId), listUsers(event)]);

	return { site, users };
};

export const actions: Actions = {
	add: async (event) => {
		if (!canManageMembers(event.locals.user)) {
			error(403, 'Hanya super admin yang bisa mengelola anggota site.');
		}

		const formData = await event.request.formData();
		const userId = String(formData.get('userId') ?? '');
		const roleSlug = String(formData.get('role') ?? '') as SiteRole;

		if (!userId || !SITE_ROLES.includes(roleSlug)) {
			return fail(400, { message: 'Pilih user dan role yang valid.' });
		}

		try {
			await addSiteMember(event, event.params.siteId, { userId, roleSlug });
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message, errors: err.fieldErrors });
			}
			throw err;
		}

		return { success: true };
	},

	remove: async (event) => {
		if (!canManageMembers(event.locals.user)) {
			error(403, 'Hanya super admin yang bisa mengelola anggota site.');
		}

		const formData = await event.request.formData();
		const userId = String(formData.get('userId') ?? '');

		try {
			await removeSiteMember(event, event.params.siteId, userId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	}
};
