import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logout } from '$lib/server/api/auth';

export const POST: RequestHandler = async (event) => {
	try {
		await logout(event);
	} catch {
		// The local cookie is cleared in logout() even when the API is unavailable.
	}
	redirect(303, '/login');
};
