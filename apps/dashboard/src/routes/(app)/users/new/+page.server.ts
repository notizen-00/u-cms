import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createUser } from '$lib/server/api/users';
import { ApiError } from '$lib/server/api/client';
import { canManageUsers } from '$lib/permissions';

export const load: PageServerLoad = async ({ locals }) => {
	if (!canManageUsers(locals.user)) error(403, 'Hanya super admin yang bisa membuat user.');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		if (!canManageUsers(event.locals.user)) error(403, 'Hanya super admin yang bisa membuat user.');

		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const name = String(formData.get('name') ?? '').trim();
		const isSuperAdmin = formData.get('isSuperAdmin') === 'on';

		try {
			const user = await createUser(event, { email, password, name, isSuperAdmin });
			redirect(303, `/users/${user.id}/edit`);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					email,
					name,
					isSuperAdmin,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}
	}
};
