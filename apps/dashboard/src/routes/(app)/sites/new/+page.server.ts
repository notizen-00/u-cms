import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import { canCreateSite } from '$lib/permissions';

export const load: PageServerLoad = async ({ locals }) => {
	if (!canCreateSite(locals.user)) error(403, 'Hanya super admin yang bisa membuat site.');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		if (!canCreateSite(event.locals.user)) error(403, 'Hanya super admin yang bisa membuat site.');

		const formData = await event.request.formData();
		const slug = String(formData.get('slug') ?? '').trim();
		const name = String(formData.get('name') ?? '').trim();
		const domain = String(formData.get('domain') ?? '').trim();
		const logoUrl = String(formData.get('logoUrl') ?? '').trim();
		const faviconUrl = String(formData.get('faviconUrl') ?? '').trim();

		try {
			const site = await createSite(event, {
				slug,
				name,
				domain: domain || undefined,
				logoUrl: logoUrl || undefined,
				faviconUrl: faviconUrl || undefined
			});
			redirect(303, `/sites/${site.id}`);
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
	}
};
