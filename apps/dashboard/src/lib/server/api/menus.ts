import type { RequestEvent } from '@sveltejs/kit';
import type { Menu, MenuItemInput, MenuWithItems } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listMenus(event: MinimalEvent, siteId: string): Promise<Menu[]> {
	return apiFetch(event, `/sites/${siteId}/menus`);
}

export function getMenu(event: MinimalEvent, siteId: string, menuId: string): Promise<MenuWithItems> {
	return apiFetch(event, `/sites/${siteId}/menus/${menuId}`);
}

export function createMenu(
	event: MinimalEvent,
	siteId: string,
	input: { name: string; locationId?: string | null }
): Promise<Menu> {
	return apiFetch(event, `/sites/${siteId}/menus`, { method: 'POST', body: input });
}

export function updateMenu(
	event: MinimalEvent,
	siteId: string,
	menuId: string,
	input: { name?: string; locationId?: string | null }
): Promise<Menu> {
	return apiFetch(event, `/sites/${siteId}/menus/${menuId}`, { method: 'PATCH', body: input });
}

export function deleteMenu(
	event: MinimalEvent,
	siteId: string,
	menuId: string
): Promise<{ success: boolean }> {
	return apiFetch(event, `/sites/${siteId}/menus/${menuId}`, { method: 'DELETE' });
}

export function replaceMenuItems(
	event: MinimalEvent,
	siteId: string,
	menuId: string,
	items: MenuItemInput[]
): Promise<MenuWithItems> {
	return apiFetch(event, `/sites/${siteId}/menus/${menuId}/items`, {
		method: 'PUT',
		body: { items }
	});
}
