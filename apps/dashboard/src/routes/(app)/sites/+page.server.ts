import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listSites } from '$lib/server/api/sites';

export const load: PageServerLoad = async (event) => {
	// IA (PRD §8) scopes this listing page to super_admin; other roles reach their
	// site via the sidebar's active-site section instead.
	if (!event.locals.user!.isSuperAdmin) redirect(303, '/');

	const sites = await listSites(event);
	return { sites };
};
