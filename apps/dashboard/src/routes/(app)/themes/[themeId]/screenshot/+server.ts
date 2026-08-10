import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canManageThemes } from '$lib/permissions';
import { ApiError } from '$lib/server/api/client';
import { removeThemeScreenshot, uploadThemeScreenshot } from '$lib/server/api/themes';

/**
 * Plain JSON `+server.ts` (not a form action) for the same reason as the media
 * upload route: the browser needs a `multipart/form-data` body forwarded to
 * the NestJS API, which a form action can't do without a full page navigation.
 */
export const POST: RequestHandler = async (event) => {
	if (!canManageThemes(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola tema.');

	const { themeId } = event.params;
	const formData = await event.request.formData();

	try {
		const result = await uploadThemeScreenshot(event, themeId!, formData);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message, errors: err.fieldErrors ?? null }, { status: err.status || 400 });
		}
		throw err;
	}
};

export const DELETE: RequestHandler = async (event) => {
	if (!canManageThemes(event.locals.user)) error(403, 'Hanya super admin yang bisa mengelola tema.');

	const { themeId } = event.params;

	try {
		const result = await removeThemeScreenshot(event, themeId!);
		return json(result);
	} catch (err) {
		if (err instanceof ApiError) {
			return json({ message: err.message }, { status: err.status || 400 });
		}
		throw err;
	}
};
