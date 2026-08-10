import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteUser, listUsers } from '$lib/server/api/users';
import { canManageUsers } from '$lib/permissions';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	if (!canManageUsers(event.locals.user)) {
		error(403, 'Hanya super admin yang bisa mengelola users.');
	}
	const users = await listUsers(event);
	return { users };
};

export const actions: Actions = {
	delete: async (event) => {
		if (!canManageUsers(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola users.');

		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');

		try {
			await deleteUser(event, id);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	},

	bulkDelete: async (event) => {
		if (!canManageUsers(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola users.');

		const formData = await event.request.formData();
		const ids = formData.getAll('ids').map(String);

		try {
			await Promise.all(ids.map((id) => deleteUser(event, id)));
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	}
};
