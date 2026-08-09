import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { deleteNews, getNewsItem, publishNews, updateNews } from '$lib/server/api/news';
import { getSite } from '$lib/server/api/sites';
import { listForms } from '$lib/server/api/forms';
import { listSitePlugins } from '$lib/server/api/plugins';
import { createCategory, createTag, listCategories, listTags } from '$lib/server/api/taxonomies';
import { ApiError } from '$lib/server/api/client';
import type { ContentStatus } from '$lib/types';

/** Taxonomy ids arrive as repeated fields from TaxonomyPanel's hidden inputs. */
function taxonomyIds(formData: FormData, field: string): string[] {
	return formData.getAll(field).map(String).filter(Boolean);
}

export const load: PageServerLoad = async (event) => {
	const { siteId, newsId } = event.params;

	try {
		const [site, news, plugins, forms, categories, tags] = await Promise.all([
			getSite(event, siteId),
			getNewsItem(event, siteId, newsId),
			listSitePlugins(event, siteId),
			listForms(event, siteId).catch((err) => {
				if (err instanceof ApiError && err.status === 403) return [];
				throw err;
			}),
			listCategories(event, siteId),
			listTags(event, siteId)
		]);
		// 403 on forms just means the form-builder plugin isn't active for this
		// site — the "Form" block simply has nothing to offer then.
		return {
			site,
			news,
			forms,
			categories,
			tags,
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
		const categoryIds = taxonomyIds(formData, 'categoryIds');
		const tagIds = taxonomyIds(formData, 'tagIds');

		try {
			await updateNews(event, siteId, newsId, {
				title,
				slug,
				excerpt: excerpt || undefined,
				bodyMarkdown,
				featuredImageUrl: featuredImageUrl || undefined,
				status,
				// Always sent: the backend replaces the whole set, so an empty
				// array is the only way to clear the last category or tag.
				categoryIds,
				tagIds
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
					categoryIds,
					tagIds,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}

		return { success: true, savedAt: Date.now() };
	},

	// Called by TaxonomyPanel via fetch so a new term can be added without
	// leaving the editor or losing unsaved body content to a page reload.
	createCategory: (event) => createTerm(event, 'category'),
	createTag: (event) => createTerm(event, 'tag'),

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

async function createTerm(event: RequestEvent, kind: 'category' | 'tag') {
	const formData = await event.request.formData();
	const name = String(formData.get('name') ?? '').trim();
	const slug = String(formData.get('slug') ?? '').trim();
	const parentId = String(formData.get('parentId') ?? '').trim();

	if (!name || !slug) {
		return fail(400, { message: 'Nama tidak valid — gunakan huruf atau angka.' });
	}

	try {
		if (kind === 'tag') {
			return { tag: await createTag(event, event.params.siteId, { name, slug }) };
		}
		return {
			category: await createCategory(event, event.params.siteId, {
				name,
				slug,
				parentId: parentId || undefined
			})
		};
	} catch (err) {
		if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
		throw err;
	}
}
