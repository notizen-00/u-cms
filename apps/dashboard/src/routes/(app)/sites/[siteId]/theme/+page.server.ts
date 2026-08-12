import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listThemes, setSiteTheme } from '$lib/server/api/themes';
import { getSite } from '$lib/server/api/sites';
import { scanSiteCompatibility } from '$lib/server/api/blocks';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	// No client-knowable site_admin-tier signal exists ahead of the call (see
	// $lib/permissions.ts) — membership is enforced by getSite's own 403/404,
	// and the site_admin-only apply below is gated by the backend's SiteAdminGuard.
	try {
		const [site, themes] = await Promise.all([getSite(event, siteId), listThemes(event)]);
		return { site, themes };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	/**
	 * Reports what a switch to `themeId` would cost, without switching
	 * (docs/theme_aware_prd.md §11, §25). Separate from `apply` so the admin
	 * confirms an informed choice rather than discovering missing sections on
	 * the live site afterwards.
	 */
	check: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const themeId = String(formData.get('themeId') ?? '');

		try {
			return { report: await scanSiteCompatibility(event, siteId, themeId) };
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}
	},

	apply: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const themeId = String(formData.get('themeId') ?? '');

		try {
			await setSiteTheme(event, siteId, themeId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	}
};
