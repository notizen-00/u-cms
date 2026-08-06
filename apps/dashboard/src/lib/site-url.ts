import { env } from '$env/dynamic/public';

/**
 * Host:port the public static site nginx listens on (see
 * deploy/docker-compose.yml + deploy/nginx/public.conf). `$env/dynamic/public`
 * (not `$lib/server/env`) so this is usable from `.svelte` files directly,
 * not just server code — the URL is just a link, nothing sensitive.
 */
const SITE_HOST = env.PUBLIC_SITE_HOST ?? 'localhost:8080';

/**
 * Domain-style preview URL for a published site: `http://{slug}.{SITE_HOST}/`.
 * nginx's `*.localhost` server block (public.conf) serves the site's
 * `current` release directly at "/" for this host — no /etc/hosts edit
 * needed, since `*.localhost` resolves to 127.0.0.1 in every modern browser
 * (RFC 6761). Falls back to nothing fancy in a real deployment: point
 * PUBLIC_SITE_HOST at the real public host if it's not "localhost:8080".
 */
export function siteVisitUrl(slug: string): string {
	return `http://${slug}.${SITE_HOST}/`;
}
