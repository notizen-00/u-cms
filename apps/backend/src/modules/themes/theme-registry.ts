import { discoverThemes, type CmsTheme, type ThemeMetadata } from '@unej-cms/sdk-theme';
import defaultTheme from '@unej-cms/theme-default';
import premiumTheme from '@unej-cms/theme-premium';

// Official themes only, same philosophy as modules/plugins/plugin-registry.ts
// ("Plugin hanya dari tim CMS", docs/PRD.md §9): adding a theme means
// shipping its package under the monorepo's `themes/` workspace and
// importing it here — one line per theme, never a runtime/user action.
//
// `CmsTheme<string>`: every theme this Runtime loads renders as a raw Eta
// template string (see EtaSiteRenderer) — this Runtime's own convention, not
// something the SDK mandates (TRender is opaque there).
const INSTALLED_THEMES: readonly CmsTheme<string>[] = [defaultTheme, premiumTheme];

export const DEFAULT_THEME_ID: string = defaultTheme.manifest.id;

export const THEME_CATALOG: readonly ThemeMetadata[] = discoverThemes(INSTALLED_THEMES);

export function findTheme(themeId: string): CmsTheme<string> | undefined {
  return INSTALLED_THEMES.find((theme) => theme.manifest.id === themeId);
}

export function findThemeMetadata(themeId: string): ThemeMetadata | undefined {
  return THEME_CATALOG.find((theme) => theme.id === themeId);
}

/** Falls back to the default theme so a build never crashes on an unknown/removed themeId. */
export function resolveTheme(themeId: string): CmsTheme<string> {
  return findTheme(themeId) ?? findTheme(DEFAULT_THEME_ID)!;
}
