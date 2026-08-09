import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deletePage, getPageItem, listPages, publishPage, updatePage } from '$lib/server/api/pages';
import { getSite } from '$lib/server/api/sites';
import { listForms } from '$lib/server/api/forms';
import { listSitePlugins } from '$lib/server/api/plugins';
import { ApiError } from '$lib/server/api/client';
import type { ContentStatus } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { siteId, pageId } = event.params;

	try {
		const [site, page, pages, plugins, forms] = await Promise.all([
			getSite(event, siteId),
			getPageItem(event, siteId, pageId),
			listPages(event, siteId),
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
			page,
			otherPages: pages.filter((p) => p.id !== pageId),
			forms,
			pageBuilderActive: plugins.some((plugin) => plugin.slug === 'unej.page-builder' && plugin.isActive),
			formBuilderActive: plugins.some((plugin) => plugin.slug === 'unej.form-builder' && plugin.isActive)
		};
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses.' : 'Halaman tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	update: async (event) => {
		const { siteId, pageId } = event.params;

		const formData = await event.request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const slug = String(formData.get('slug') ?? '').trim();
		const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '');
		const parentId = String(formData.get('parentId') ?? '').trim();
		const isHomepage = formData.get('isHomepage') === 'on';
		const order = Number(formData.get('order') ?? 0);
		const status = String(formData.get('status') ?? '') as ContentStatus;

		try {
			await updatePage(event, siteId, pageId, {
				title,
				slug,
				bodyMarkdown,
				// Omitting (rather than null) when cleared — the backend's PATCH schema
				// rejects `null` and has no way to clear an already-set parentId (see
				// $lib/server/api/pages.ts). Clearing the dropdown here is a no-op if a
				// parent was already set.
				parentId: parentId || undefined,
				isHomepage,
				order: Number.isFinite(order) ? order : 0,
				status
			});
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					title,
					slug,
					bodyMarkdown,
					parentId,
					isHomepage,
					order,
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
		const { siteId, pageId } = event.params;

		try {
			await publishPage(event, siteId, pageId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { published: true };
	},

	delete: async (event) => {
		const { siteId, pageId } = event.params;

		try {
			await deletePage(event, siteId, pageId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		redirect(303, `/sites/${siteId}/pages`);
	}
};
