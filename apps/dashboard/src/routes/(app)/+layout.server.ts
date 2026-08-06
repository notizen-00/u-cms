import type { LayoutServerLoad } from './$types';
import { listSites } from '$lib/server/api/sites';
import { ACTIVE_SITE_COOKIE_NAME } from '$lib/server/env';

export const load: LayoutServerLoad = async (event) => {
	// hooks.server.ts already redirected to /login when there's no session.
	const user = event.locals.user!;
	const sites = await listSites(event);

	let activeSiteId = event.cookies.get(ACTIVE_SITE_COOKIE_NAME) ?? null;
	if (!activeSiteId || !sites.some((site) => site.id === activeSiteId)) {
		activeSiteId = sites[0]?.id ?? null;
	}

	return { user, sites, activeSiteId };
};
