import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createMenu, deleteMenu, listMenus } from '$lib/server/api/menus';
import { listThemes } from '$lib/server/api/themes';
import { getSite } from '$lib/server/api/sites';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const { siteId } = event.params;

	try {
		const [site, menus, themes] = await Promise.all([
			getSite(event, siteId),
			listMenus(event, siteId),
			listThemes(event)
		]);
		const activeTheme = themes.find((theme) => theme.id === site.themeId);
		return { site, menus, menuLocations: activeTheme?.menuLocations ?? [] };
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
		const name = String(formData.get('name') ?? '').trim();
		const locationId = String(formData.get('locationId') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Nama menu wajib diisi.' });
		}

		let created;
		try {
			created = await createMenu(event, siteId, { name, locationId: locationId || null });
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}

		redirect(303, `/sites/${siteId}/menus/${created.id}`);
	},

	delete: async (event) => {
		const { siteId } = event.params;
		const formData = await event.request.formData();
		const menuId = String(formData.get('menuId') ?? '');

		try {
			await deleteMenu(event, siteId, menuId);
		} catch (err) {
			if (err instanceof ApiError) return fail(err.status || 400, { message: err.message });
			throw err;
		}

		return { success: true };
	}
};
