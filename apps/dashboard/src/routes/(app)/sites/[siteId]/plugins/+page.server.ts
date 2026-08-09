import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	activateSitePlugin,
	deactivateSitePlugin,
	listSitePlugins,
	uninstallSitePlugin
} from '$lib/server/api/plugins';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	// No client-knowable site_admin-tier signal exists ahead of the call (see
	// $lib/permissions.ts) — membership is enforced by getSite's own 403/404,
	// and the site_admin-only activate/deactivate below is gated by the
	// backend's SiteAdminGuard.
	try {
		const [site, plugins] = await Promise.all([getSite(event, siteId), listSitePlugins(event, siteId)]);
		return { site, plugins };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	activate: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const slug = String(formData.get('slug') ?? '');

		try {
			await activateSitePlugin(event, siteId, slug);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	},

	deactivate: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const slug = String(formData.get('slug') ?? '');

		try {
			await deactivateSitePlugin(event, siteId, slug);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	},

	uninstall: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const slug = String(formData.get('slug') ?? '');

		try {
			await uninstallSitePlugin(event, siteId, slug);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	}
};
