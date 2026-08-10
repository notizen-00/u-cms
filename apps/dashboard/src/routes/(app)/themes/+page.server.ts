import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canManageThemes } from '$lib/permissions';
import { listThemes } from '$lib/server/api/themes';

export const load: PageServerLoad = async (event) => {
	if (!canManageThemes(event.locals.user)) {
		error(403, 'Hanya super admin yang bisa mengelola tema.');
	}
	const themes = await listThemes(event);
	return { themes };
};
