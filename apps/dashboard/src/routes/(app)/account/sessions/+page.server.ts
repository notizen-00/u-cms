import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listSessions, revokeSession } from '$lib/server/api/auth';
import { ApiError } from '$lib/server/api/client';

export const load: PageServerLoad = async (event) => {
	const sessions = await listSessions(event);
	return { sessions };
};

export const actions: Actions = {
	revoke: async (event) => {
		const formData = await event.request.formData();
		const sessionId = String(formData.get('sessionId') ?? '');

		try {
			await revokeSession(event, sessionId);
		} catch (err) {
			if (err instanceof ApiError) {
				return fail(err.status || 400, { message: err.message });
			}
			throw err;
		}

		return { success: true };
	}
};
