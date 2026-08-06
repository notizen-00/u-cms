import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteUser, getUser, updateUser } from '$lib/server/api/users';
import { ApiError } from '$lib/server/api/client';
import { canManageUsers } from '$lib/permissions';

export const load: PageServerLoad = async (event) => {
	if (!canManageUsers(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola users.');
	const user = await getUser(event, event.params.userId);
	return { targetUser: user };
};

export const actions: Actions = {
	update: async (event) => {
		if (!canManageUsers(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola users.');

		const formData = await event.request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const isSuperAdmin = formData.get('isSuperAdmin') === 'on';

		try {
			await updateUser(event, event.params.userId, {
				name: name || undefined,
				password: password || undefined,
				isSuperAdmin
			});
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					name,
					isSuperAdmin,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}

		return { success: true, savedAt: Date.now() };
	},

	delete: async (event) => {
		if (!canManageUsers(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola users.');

		try {
			await deleteUser(event, event.params.userId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		redirect(303, '/users');
	}
};
