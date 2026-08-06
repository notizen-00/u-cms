import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createNews } from '$lib/server/api/news';
import { getSite } from '$lib/server/api/sites';
import { listForms } from '$lib/server/api/forms';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;
	try {
		const site = await getSite(event, siteId);
		// 403 here just means the form-builder plugin isn't active for this
		// site — the "Form" block simply has nothing to offer then, not an
		// error worth failing the whole page load over.
		const forms = await listForms(event, siteId).catch((err) => {
			if (err instanceof ApiError && err.status === 403) return [];
			throw err;
		});
		return { site, forms };
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
		const excerpt = String(formData.get('excerpt') ?? '').trim();
		const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '');
		const featuredImageUrl = String(formData.get('featuredImageUrl') ?? '').trim();

		try {
			const news = await createNews(event, siteId, {
				title,
				slug,
				excerpt: excerpt || undefined,
				bodyMarkdown,
				featuredImageUrl: featuredImageUrl || undefined
			});
			redirect(303, `/sites/${siteId}/news/${news.id}`);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					title,
					slug,
					excerpt,
					bodyMarkdown,
					featuredImageUrl,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}
	}
};
