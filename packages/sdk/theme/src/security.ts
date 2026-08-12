/**
 * A theme's CSP additions, layered over the CMS-wide baseline every theme
 * gets for free (self-hosted scripts/styles, the two iframe hosts the embed
 * block sanitizes down to, https images) before being emitted as a
 * `<meta http-equiv="Content-Security-Policy">` tag on every generated page —
 * see `apps/backend`'s `render/security-headers.ts`, the single place the
 * baseline is defined. Keys are CSP directive names; a theme's sources are
 * unioned with (never replace) the baseline's own sources for that directive,
 * so a theme only needs to declare what it adds (e.g. an external font host),
 * not the whole policy.
 */
export interface ThemeSecurityDefaults {
  readonly contentSecurityPolicy?: Readonly<Record<string, readonly string[]>>;
}
