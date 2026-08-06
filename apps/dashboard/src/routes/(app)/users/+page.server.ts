import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listUsers } from '$lib/server/api/users';
import { canManageUsers } from '$lib/permissions';

export const load: PageServerLoad = async (event) => {
	if (!canManageUsers(event.locals.user)) {
		error(403, 'Hanya super admin yang bisa mengelola users.');
	}
	const users = await listUsers(event);
	return { users };
};
