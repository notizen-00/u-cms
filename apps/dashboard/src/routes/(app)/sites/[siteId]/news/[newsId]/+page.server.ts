import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteNews, getNewsItem, publishNews, updateNews } from '$lib/server/api/news';
import { getSite } from '$lib/server/api/sites';
import { listForms } from '$lib/server/api/forms';
import { listSitePlugins } from '$lib/server/api/plugins';
import { ApiError } from '$lib/server/api/client';
import type { ContentStatus } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { siteId, newsId } = event.params;

	try {
		const [site, news, plugins, forms] = await Promise.all([
			getSite(event, siteId),
			getNewsItem(event, siteId, newsId),
			listSitePlugins(event, siteId),
			listForms(event, siteId).catch((err) => {
				if (err instanceof ApiError && err.status === 403) return [];
				throw err;
			})
		]);
		// 403 here just means the form-builder plugin isn't active for this
		// site — the "Form" block simply has nothing to offer then.
		return {
			site,
			news,
			forms,
			pageBuilderActive: plugins.some((plugin) => plugin.slug === 'unej.page-builder' && plugin.isActive),
			formBuilderActive: plugins.some((plugin) => plugin.slug === 'unej.form-builder' && plugin.isActive)
		};
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses.' : 'Berita tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	update: async (event) => {
		const { siteId, newsId } = event.params;

		const formData = await event.request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const slug = String(formData.get('slug') ?? '').trim();
		const excerpt = String(formData.get('excerpt') ?? '').trim();
		const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '');
		const featuredImageUrl = String(formData.get('featuredImageUrl') ?? '').trim();
		const status = String(formData.get('status') ?? '') as ContentStatus;

		try {
			await updateNews(event, siteId, newsId, {
				title,
				slug,
				excerpt: excerpt || undefined,
				bodyMarkdown,
				featuredImageUrl: featuredImageUrl || undefined,
				status
			});
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					title,
					slug,
					excerpt,
					bodyMarkdown,
					featuredImageUrl,
					status,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}

		return { success: true, savedAt: Date.now() };
	},

	publish: async (event) => {
		const { siteId, newsId } = event.params;

		try {
			await publishNews(event, siteId, newsId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { published: true };
	},

	delete: async (event) => {
		const { siteId, newsId } = event.params;

		try {
			await deleteNews(event, siteId, newsId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		redirect(303, `/sites/${siteId}/news`);
	}
};
