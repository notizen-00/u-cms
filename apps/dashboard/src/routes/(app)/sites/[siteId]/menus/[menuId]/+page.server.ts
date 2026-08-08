import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getMenu, replaceMenuItems, updateMenu } from '$lib/server/api/menus';
import { listPages } from '$lib/server/api/pages';
import { listThemes } from '$lib/server/api/themes';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';
import type { MenuItemInput } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { siteId, menuId } = event.params;

	try {
		const [site, menu, pages, themes] = await Promise.all([
			getSite(event, siteId),
			getMenu(event, siteId, menuId),
			listPages(event, siteId),
			listThemes(event)
		]);
		const activeTheme = themes.find((theme) => theme.id === site.themeId);
		return { site, menu, pages, menuLocations: activeTheme?.menuLocations ?? [] };
	} catch (err) {
		if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
			error(err.status, err.status === 403 ? 'Anda tidak punya akses ke site ini.' : 'Menu tidak ditemukan.');
		}
		throw err;
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { siteId, menuId } = event.params;
		const formData = await event.request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const locationId = String(formData.get('locationId') ?? '').trim();
		const itemsRaw = String(formData.get('items') ?? '[]');

		if (!name) {
			return fail(400, { message: 'Nama menu wajib diisi.' });
		}

		let items: MenuItemInput[];
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			return fail(400, { message: 'Struktur menu tidak valid.' });
		}

		try {
			await updateMenu(event, siteId, menuId, { name, locationId: locationId || null });
			await replaceMenuItems(event, siteId, menuId, items);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}

		return { success: true };
	}
};
