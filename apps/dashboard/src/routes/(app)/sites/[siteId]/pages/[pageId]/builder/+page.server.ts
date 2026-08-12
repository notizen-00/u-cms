import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPageItem, publishPageBlocks, updatePage } from '$lib/server/api/pages';
import { getSite } from '$lib/server/api/sites';
import { checkBlockCompatibility, listSiteBlocks } from '$lib/server/api/blocks';
import { revokePreviewTokens } from '$lib/server/api/preview';
import { ApiError } from '$lib/server/api/client';
import type { PageBlock } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { siteId, pageId } = event.params;

	try {
		const [site, page, registry] = await Promise.all([
			getSite(event, siteId),
			getPageItem(event, siteId, pageId),
			listSiteBlocks(event, siteId)
		]);

		// Resolves what each block type falls back to — the builder can't work
		// that out on its own, since the registry only lists blocks the active
		// theme *does* support.
		const types = [...new Set((page.blocks ?? []).map((block) => block.type))];
		const compatibility = types.length
			? await checkBlockCompatibility(event, siteId, site.themeId, types).catch(() => [])
			: [];

		return {
			site,
			page,
			registry,
			compatibility,
			// Same-origin proxy, not the API directly — see that route for why.
			previewUrl: `/sites/${siteId}/pages/${pageId}/preview`
		};
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses.' : 'Halaman tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	save: async (event) => {
		const { siteId, pageId } = event.params;
		const formData = await event.request.formData();
		const raw = String(formData.get('blocks') ?? '[]');

		let blocks: PageBlock[];
		try {
			blocks = JSON.parse(raw) as PageBlock[];
		} catch {
			return fail(400, { message: 'Struktur blok tidak valid.' });
		}

		try {
			// Only `blocks` is sent: this route edits structured content, and
			// PATCH leaves untouched fields alone, so the page's title/slug/
			// status stay owned by the main editor screen.
			await updatePage(event, siteId, pageId, { blocks });
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, {
					message: err.fieldErrors ? 'Struktur blok ditolak server.' : err.message
				});
			}
			throw err;
		}

		return { success: true, savedAt: Date.now() };
	},

	/**
	 * Snapshots draft `blocks` into `publishedBlocks` (docs/theme_aware_prd.md
	 * §16) — the one action that pushes Builder edits to the live site. Always
	 * saves first: publishing whatever was last saved instead of whatever is
	 * currently in the form would silently drop the change that prompted the
	 * click.
	 */
	publish: async (event) => {
		const { siteId, pageId } = event.params;
		const formData = await event.request.formData();
		const raw = String(formData.get('blocks') ?? '[]');

		let blocks: PageBlock[];
		try {
			blocks = JSON.parse(raw) as PageBlock[];
		} catch {
			return fail(400, { message: 'Struktur blok tidak valid.' });
		}

		try {
			await updatePage(event, siteId, pageId, { blocks });
			await publishPageBlocks(event, siteId, pageId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { published: true, publishedAt: Date.now() };
	},

	/**
	 * Revokes every outstanding preview token for this page
	 * (docs/theme_aware_prd.md §23's "dapat dicabut"). Does not touch draft or
	 * published content — only kills any preview link currently in flight.
	 */
	revokePreview: async (event) => {
		const { siteId, pageId } = event.params;

		try {
			const revoked = await revokePreviewTokens(event, siteId, pageId);
			return { revoked };
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}
	}
};
