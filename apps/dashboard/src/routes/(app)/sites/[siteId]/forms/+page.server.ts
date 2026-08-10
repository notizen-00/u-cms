import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteForm, listForms } from '$lib/server/api/forms';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;
	const site = await getSite(event, siteId);

	try {
		const forms = await listForms(event, siteId);
		return { site, forms, pluginActive: true as const };
	} catch (err) {
		// PluginActiveGuard responds 403 when "unej.form-builder" isn't
		// activated for this site — degrade to a friendly prompt instead of
		// an error page (mirrors how the members page handles a known gap).
		if (err instanceof ApiError && err.status === 403) {
			return { site, forms: [], pluginActive: false as const };
		}
		throw err;
	}
};

export const actions: Actions = {
	delete: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const formId = String(formData.get('formId') ?? '');

		try {
			await deleteForm(event, siteId, formId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	},

	bulkDelete: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const ids = formData.getAll('ids').map(String);

		try {
			await Promise.all(ids.map((id) => deleteForm(event, siteId, id)));
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}
		return { success: true };
	}
};
