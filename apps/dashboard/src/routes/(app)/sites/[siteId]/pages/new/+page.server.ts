import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createPage, listPages } from '$lib/server/api/pages';
import { getSite } from '$lib/server/api/sites';
import { listForms } from '$lib/server/api/forms';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;
	try {
		const [site, pages] = await Promise.all([getSite(event, siteId), listPages(event, siteId)]);
		// 403 here just means the form-builder plugin isn't active for this
		// site — the "Form" block simply has nothing to offer then.
		const forms = await listForms(event, siteId).catch((err) => {
			if (err instanceof ApiError && err.status === 403) return [];
			throw err;
		});
		return { site, pages, forms };
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
		const title = String(formData.get('title') ?? '').trim();
		const slug = String(formData.get('slug') ?? '').trim();
		const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '');
		const parentId = String(formData.get('parentId') ?? '').trim();
		const isHomepage = formData.get('isHomepage') === 'on';
		const order = Number(formData.get('order') ?? 0);

		try {
			const page = await createPage(event, siteId, {
				title,
				slug,
				bodyMarkdown,
				parentId: parentId || undefined,
				isHomepage,
				order: Number.isFinite(order) ? order : 0
			});
			redirect(303, `/sites/${siteId}/pages/${page.id}`);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					title,
					slug,
					bodyMarkdown,
					parentId,
					isHomepage,
					order,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}
	}
};
