import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSubmission, getForm, listSubmissions } from '$lib/server/api/forms';
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

export const actions: Actions = {
	delete: async (event) => {
		const { siteId, formId } = event.params;
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');

		try {
			await deleteSubmission(event, siteId, formId, id);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	},

	bulkDelete: async (event) => {
		const { siteId, formId } = event.params;
		const formData = await event.request.formData();
		const ids = formData.getAll('ids').map(String);

		try {
			await Promise.all(ids.map((id) => deleteSubmission(event, siteId, formId, id)));
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	}
};
