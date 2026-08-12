import type { CmsTheme } from '@unej-cms/sdk-theme';

/**
 * CSP every theme gets for free, before its own `security.contentSecurityPolicy`
 * additions are unioned in: same-origin scripts/styles, the exact two iframe
 * hosts the embed block sanitizes down to (`ALLOWED_IFRAME_HOSTNAMES` in
 * `content-renderer.ts`), and https images — a site's media can live on
 * whatever host `MINIO_PUBLIC_URL` points at, which varies per deployment.
 *
 * `frame-ancestors` is deliberately absent: browsers ignore that directive
 * when CSP is delivered via `<meta>` (its only delivery method here, since
 * this is baked into static HTML, not an HTTP response this Builder controls).
 * Clickjacking protection is instead nginx's `X-Frame-Options`, set once for
 * every site in `deploy/nginx/public.conf`.
 */
const BASE_CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'frame-src': ['https://www.youtube.com', 'https://player.vimeo.com'],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
};

export function buildContentSecurityPolicy(theme: CmsTheme<unknown>): string {
  const merged = new Map<string, Set<string>>();
  for (const [directive, sources] of Object.entries(BASE_CSP_DIRECTIVES)) {
    merged.set(directive, new Set(sources));
  }
  for (const [directive, sources] of Object.entries(
    theme.security?.contentSecurityPolicy ?? {},
  )) {
    const set = merged.get(directive) ?? new Set<string>();
    for (const source of sources) set.add(source);
    merged.set(directive, set);
  }
  return [...merged.entries()]
    .map(([directive, sources]) => `${directive} ${[...sources].join(' ')}`)
    .join('; ');
}

/**
 * `<meta>` tags for the response headers that have an HTML-level equivalent.
 * X-Frame-Options, X-Content-Type-Options, Permissions-Policy and
 * Strict-Transport-Security have no `<meta>` form and are instead set once,
 * for every site regardless of theme, by nginx in front of this static
 * output (`deploy/nginx/public.conf`).
 */
export function renderSecurityMetaTags(theme: CmsTheme<unknown>): string {
  return [
    `<meta http-equiv="Content-Security-Policy" content="${buildContentSecurityPolicy(theme)}">`,
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
  ].join('\n');
}
