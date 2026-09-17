import type { LayoutServerLoad } from './$types';
import { listSites } from '$lib/server/api/sites';
import { getHomepagePage } from '$lib/server/api/pages';
import { listThemes } from '$lib/server/api/themes';

export const load: LayoutServerLoad = async (event) => {
	// hooks.server.ts already redirected to /login when there's no session.
	const user = event.locals.user!;
	const sites = await listSites(event);

	// The backend permits exactly one site. Do not let a browser cookie select a
	// different site; the database record is the source of truth for the active site.
	const activeSiteId = sites[0]?.id ?? null;

	const activeSite = sites.find((site) => site.id === activeSiteId) ?? null;

	// Feeds the topbar's "active theme → open Builder" shortcut (Header.svelte).
	// Piggybacks on this layout's already-unconditional `listSites` call rather
	// than a dedicated per-site layout — see the plan doc for why plain-await
	// (not streamed) is the right tradeoff here.
	let activeTheme = null;
	let homepagePageId: string | null = null;
	if (activeSite) {
		const [themes, homepage] = await Promise.all([
			listThemes(event),
			getHomepagePage(event, activeSite.id)
		]);
		activeTheme = themes.find((theme) => theme.id === activeSite.themeId) ?? null;
		homepagePageId = homepage?.id ?? null;
	}

	return { user, sites, activeSiteId, activeTheme, homepagePageId };
};
