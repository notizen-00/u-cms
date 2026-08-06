import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createForm } from '$lib/server/api/forms';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import type { FormField } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const site = await getSite(event, event.params.siteId);
	return { site };
};

export const actions: Actions = {
	default: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const submitLabel = String(formData.get('submitLabel') ?? '').trim();
		const successMessage = String(formData.get('successMessage') ?? '').trim();
		const fieldsRaw = String(formData.get('fields') ?? '[]');

		let fields: FormField[];
		try {
			fields = JSON.parse(fieldsRaw);
		} catch {
			return fail(400, { message: 'Data field tidak valid.', title, submitLabel, successMessage });
		}

		if (!title) {
			return fail(400, { message: 'Judul wajib diisi.', title, submitLabel, successMessage, fields });
		}

		let created;
		try {
			created = await createForm(event, siteId, {
				title,
				fields,
				submitLabel: submitLabel || undefined,
				successMessage: successMessage || undefined
			});
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					message: err.fieldErrors ? undefined : err.message,
					errors: err.fieldErrors,
					title,
					submitLabel,
					successMessage,
					fields
				});
			}
			throw err;
		}

		redirect(303, `/sites/${siteId}/forms/${created.id}/edit`);
	}
};
