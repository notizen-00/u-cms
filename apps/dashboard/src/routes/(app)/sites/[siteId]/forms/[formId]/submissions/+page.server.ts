import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getForm, listSubmissions } from '$lib/server/api/forms';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId, formId } = event.params;

	try {
		const [site, cmsForm, submissions] = await Promise.all([
			getSite(event, siteId),
			getForm(event, siteId, formId),
			listSubmissions(event, siteId, formId)
		]);
		return { site, cmsForm, submissions };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke formulir ini.' : 'Formulir tidak ditemukan.');
		}
		throw err;
	}
};
