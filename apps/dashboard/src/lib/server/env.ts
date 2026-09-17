import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * Server-to-server API address. It must be an absolute internal URL in Docker:
 * using the browser path `/api` with event.fetch re-enters SvelteKit's handle
 * hook and recursively calls setup/status until Node runs out of heap.
 */
export const API_URL = privateEnv.API_INTERNAL_URL ?? publicEnv.PUBLIC_API_URL ?? 'http://localhost:3000';

export const SESSION_COOKIE_NAME = 'unej_cms_session';
export const ACTIVE_SITE_COOKIE_NAME = 'active_site_id';
