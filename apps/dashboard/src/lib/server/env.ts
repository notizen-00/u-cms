import { env } from '$env/dynamic/public';

/** Runtime-configurable (not build-time) so the same Docker image can point at different API hosts. */
export const API_URL = env.PUBLIC_API_URL ?? 'http://localhost:3000';

export const SESSION_COOKIE_NAME = 'unej_cms_session';
export const ACTIVE_SITE_COOKIE_NAME = 'active_site_id';
