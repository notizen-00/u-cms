import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSite, updateSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	// No client-knowable site_admin-tier signal exists ahead of the call (see
	// $lib/permissions.ts) — membership is enforced by getSite's own 403/404,
	// and the site_admin-only PATCH below is gated by the backend's SiteAdminGuard.
	try {
		const site = await getSite(event, siteId);
		return { site };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { siteId } = event.params;

		const formData = await event.request.formData();
		const slug = String(formData.get('slug') ?? '').trim();
		const name = String(formData.get('name') ?? '').trim();
		const domain = String(formData.get('domain') ?? '').trim();
		const logoUrl = String(formData.get('logoUrl') ?? '').trim();
		const faviconUrl = String(formData.get('faviconUrl') ?? '').trim();

		try {
			await updateSite(event, siteId, {
				slug,
				name,
				domain: domain || undefined,
				logoUrl: logoUrl || undefined,
				faviconUrl: faviconUrl || undefined
			});
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					slug,
					name,
					domain,
					logoUrl,
					faviconUrl,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}

		redirect(303, `/sites/${siteId}`);
	}
};
