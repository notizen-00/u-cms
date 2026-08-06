import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getForm, updateForm } from '$lib/server/api/forms';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import type { FormField } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { siteId, formId } = event.params;

	try {
		const [site, cmsForm] = await Promise.all([getSite(event, siteId), getForm(event, siteId, formId)]);
		return { site, cmsForm };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke formulir ini.' : 'Formulir tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { siteId, formId } = event.params;
		const formData = await event.request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const submitLabel = String(formData.get('submitLabel') ?? '').trim();
		const successMessage = String(formData.get('successMessage') ?? '').trim();
		const fieldsRaw = String(formData.get('fields') ?? '[]');

		let fields: FormField[];
		try {
			fields = JSON.parse(fieldsRaw);
		} catch {
			return fail(400, { message: 'Data field tidak valid.' });
		}

		if (!title) {
			return fail(400, { message: 'Judul wajib diisi.' });
		}

		try {
			await updateForm(event, siteId, formId, {
				title,
				fields,
				submitLabel: submitLabel || undefined,
				successMessage: successMessage || undefined
			});
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message, errors: err.fieldErrors });
			}
			throw err;
		}

		return { success: true };
	}
};
