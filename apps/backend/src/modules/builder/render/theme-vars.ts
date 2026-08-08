import type { CmsTheme } from '@unej-cms/sdk-theme';

/**
 * Flattens a theme's settings schema into `{ [settingKey]: value }` — used as
 * `it.theme.<key>` in Eta templates or a `theme` prop in Svelte components,
 * generic across whatever settings a given theme declares (no per-theme
 * special-casing here; each theme's own templates only ever reference the
 * settings they themselves declared). Per-site overrides (see
 * modules/themes/themes.service.ts) win over schema defaults.
 *
 * Values can be any PropertySchema field kind — scalars (color/string/...)
 * as well as `array`/`object` fields (e.g. a repeatable logo-strip setting).
 * Overrides are trusted as-is: they only ever reach here already validated
 * against the schema by `validateThemeSettingsValues` at save time.
 *
 * Only reads `theme.settings`, so this is shared verbatim by every renderer
 * regardless of what `TRender` (Eta string vs. Svelte component) means for
 * that theme.
 */
export function resolveThemeVars(
  theme: CmsTheme<unknown>,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(theme.settings ?? {})) {
    if ('default' in field && field.default !== undefined) {
      vars[key] = field.default;
    }
    const override = overrides?.[key];
    if (override !== undefined) {
      vars[key] = override;
    }
  }
  return vars;
}
