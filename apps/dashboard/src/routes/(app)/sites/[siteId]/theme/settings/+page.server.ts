import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getThemeSettings, updateThemeSettings } from '$lib/server/api/themes';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import type { PropertySchema } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	try {
		const [site, settings] = await Promise.all([getSite(event, siteId), getThemeSettings(event, siteId)]);
		return { site, settings };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

/** Coerces FormData strings back into the shape each field's schema expects before sending to the backend. */
function valuesFromFormData(schema: PropertySchema, formData: FormData): Record<string, unknown> {
	const values: Record<string, unknown> = {};

	for (const [key, field] of Object.entries(schema)) {
		if (field.type === 'boolean') {
			values[key] = formData.get(key) === 'on';
			continue;
		}

		const raw = formData.get(key);
		if (raw === null) continue;
		const text = String(raw);

		if (field.type === 'number') {
			if (text.trim() === '') continue;
			const num = Number(text);
			if (!Number.isNaN(num)) values[key] = num;
			continue;
		}

		if (field.type === 'array' || field.type === 'object') {
			if (text.trim() === '') continue;
			values[key] = JSON.parse(text);
			continue;
		}

		values[key] = text;
	}

	return values;
}

export const actions: Actions = {
	default: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();

		let current;
		try {
			current = await getThemeSettings(event, siteId);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}

		let values: Record<string, unknown>;
		try {
			values = valuesFromFormData(current.schema, formData);
		} catch {
			return fail(400, { message: 'Salah satu nilai berupa JSON yang tidak valid.' });
		}

		try {
			await updateThemeSettings(event, siteId, values);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message, errors: err.fieldErrors });
			throw err;
		}

		return { success: true };
	}
};
