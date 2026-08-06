import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ACTIVE_SITE_COOKIE_NAME } from '$lib/server/env';
import { safeLocalRedirect } from '$lib/server/redirect';

export const GET: RequestHandler = async ({ params, cookies, url }) => {
	cookies.set(ACTIVE_SITE_COOKIE_NAME, params.siteId, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax'
	});

	const back = url.searchParams.get('back');
	redirect(303, safeLocalRedirect(back));
};
