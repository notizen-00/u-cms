import { discoverThemes, type CmsTheme, type ThemeMetadata } from '@unej-cms/sdk-theme';
import { join } from 'node:path';
import defaultTheme from '@unej-cms/theme-default';
import facultyTheme from '@unej-cms/theme-faculty';
import joyTheme from '@unej-cms/theme-joy';
import premiumTheme from '@unej-cms/theme-premium';
import universityTheme from '@unej-cms/theme-university';

/** Which `SiteRenderer` implementation (see modules/builder/render/) knows how to interpret a theme's `layouts[].render`. */
export type ThemeRenderKind = 'eta' | 'svelte';

interface InstalledTheme {
  readonly theme: CmsTheme<unknown>;
  readonly renderKind: ThemeRenderKind;
  /** `themes/<slug>` — this repo's on-disk folder name, not the theme's manifest id. Used to locate its `assets/` dir (see resolveThemeAssetsDir below). */
  readonly slug: string;
}

// Official themes only, same philosophy as modules/plugins/plugin-registry.ts
// ("Plugin hanya dari tim CMS", docs/PRD.md §9): adding a theme means
// shipping its package under the monorepo's `themes/` workspace and
// importing it here — one line per theme, never a runtime/user action.
//
// `renderKind` is this Runtime's own bookkeeping (not part of the SDK
// contract): it tells BuildProcessor which SiteRenderer to hand the theme
// to, since `CmsTheme<TRender>`'s `TRender` is erased to `unknown` once
// themes of different kinds sit in one list together.
const INSTALLED_THEMES: readonly InstalledTheme[] = [
  { theme: defaultTheme as CmsTheme<unknown>, renderKind: 'eta', slug: 'default' },
  { theme: premiumTheme as CmsTheme<unknown>, renderKind: 'eta', slug: 'premium' },
  { theme: universityTheme as CmsTheme<unknown>, renderKind: 'svelte', slug: 'university' },
  { theme: facultyTheme as CmsTheme<unknown>, renderKind: 'svelte', slug: 'faculty' },
  { theme: joyTheme as CmsTheme<unknown>, renderKind: 'svelte', slug: 'joy' },
];

/**
 * Repo root, computed relative to this compiled file's own location — same
 * technique as SvelteSiteRenderer's CACHE_DIR (see
 * modules/builder/render/svelte-site-renderer.ts): whether this runs from
 * `src/` (ts-node/nest --watch) or `dist/` (built), the directory depth from
 * here down to the repo root is identical, so one relative path works both
 * ways. Themes are always monorepo siblings here (workspace packages built
 * from source, never installed from the npm registry — see docs/PRD.md), so
 * this holds in every deployment mode this codebase actually supports.
 */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

export const DEFAULT_THEME_ID: string = defaultTheme.manifest.id;

export const THEME_CATALOG: readonly ThemeMetadata[] = discoverThemes(
  INSTALLED_THEMES.map((installed) => installed.theme),
);

function findInstalledTheme(themeId: string): InstalledTheme | undefined {
  return INSTALLED_THEMES.find((installed) => installed.theme.manifest.id === themeId);
}

export function findTheme(themeId: string): CmsTheme<unknown> | undefined {
  return findInstalledTheme(themeId)?.theme;
}

export function findThemeMetadata(themeId: string): ThemeMetadata | undefined {
  return THEME_CATALOG.find((theme) => theme.id === themeId);
}

/** Falls back to the default theme so a build never crashes on an unknown/removed themeId. */
export function resolveTheme(themeId: string): CmsTheme<unknown> {
  return findTheme(themeId) ?? findTheme(DEFAULT_THEME_ID)!;
}

/** Falls back to "eta" (the default theme's kind) alongside `resolveTheme`'s own fallback. */
export function resolveThemeRenderKind(themeId: string): ThemeRenderKind {
  return findInstalledTheme(themeId)?.renderKind ?? findInstalledTheme(DEFAULT_THEME_ID)!.renderKind;
}

/**
 * Absolute path to a theme's static `assets/` directory, for
 * ThemeAssetsController's public `/theme-assets/:themeId/*` route.
 * `undefined` for an unrecognized `themeId` — deliberately does *not* fall
 * back to the default theme the way `resolveTheme`/`resolveThemeRenderKind`
 * do, since serving an unknown theme's "assets" as if they were another
 * theme's would be confusing at best.
 */
export function resolveThemeAssetsDir(themeId: string): string | undefined {
  const installed = findInstalledTheme(themeId);
  return installed && join(REPO_ROOT, 'themes', installed.slug, 'assets');
}
