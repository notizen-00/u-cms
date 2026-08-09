import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { createNews } from '$lib/server/api/news';
import { getSite } from '$lib/server/api/sites';
import { listForms } from '$lib/server/api/forms';
import { listSitePlugins } from '$lib/server/api/plugins';
import { createCategory, createTag, listCategories, listTags } from '$lib/server/api/taxonomies';
import { ApiError } from '$lib/server/api/client';

/** Taxonomy ids arrive as repeated fields from TaxonomyPanel's hidden inputs. */
function taxonomyIds(formData: FormData, field: string): string[] {
	return formData.getAll(field).map(String).filter(Boolean);
}

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;
	try {
		const [site, plugins, forms, categories, tags] = await Promise.all([
			getSite(event, siteId),
			listSitePlugins(event, siteId),
			listForms(event, siteId).catch((err) => {
				if (err instanceof ApiError && err.status === 403) return [];
				throw err;
			}),
			listCategories(event, siteId),
			listTags(event, siteId)
		]);
		// 403 on forms just means the form-builder plugin isn't active for this
		// site — the "Form" block simply has nothing to offer then, not an
		// error worth failing the whole page load over.
		return {
			site,
			forms,
			categories,
			tags,
			pageBuilderActive: plugins.some((plugin) => plugin.slug === 'unej.page-builder' && plugin.isActive),
			formBuilderActive: plugins.some((plugin) => plugin.slug === 'unej.form-builder' && plugin.isActive)
		};
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Site tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	create: async (event) => {
		const { siteId } = event.params;

		const formData = await event.request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const slug = String(formData.get('slug') ?? '').trim();
		const excerpt = String(formData.get('excerpt') ?? '').trim();
		const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '');
		const featuredImageUrl = String(formData.get('featuredImageUrl') ?? '').trim();
		const categoryIds = taxonomyIds(formData, 'categoryIds');
		const tagIds = taxonomyIds(formData, 'tagIds');

		let newsId: string;
		try {
			const news = await createNews(event, siteId, {
				title,
				slug,
				excerpt: excerpt || undefined,
				bodyMarkdown,
				featuredImageUrl: featuredImageUrl || undefined,
				categoryIds,
				tagIds
			});
			newsId = news.id;
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					title,
					slug,
					excerpt,
					bodyMarkdown,
					featuredImageUrl,
					categoryIds,
					tagIds,
					errors: err.fieldErrors,
					message: err.fieldErrors ? undefined : err.message
				});
			}
			throw err;
		}

		redirect(303, `/sites/${siteId}/news/${newsId}`);
	},

	// Called by TaxonomyPanel via fetch so a new term can be added without
	// leaving the editor or losing unsaved body content to a page reload.
	createCategory: (event) => createTerm(event, 'category'),
	createTag: (event) => createTerm(event, 'tag')
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
