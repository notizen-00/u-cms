/**
 * Design tokens a theme declares up front (in source, via `defineTheme()`)
 * — distinct from `CmsTheme.settings`, which are admin-editable per site
 * through the Dashboard's theme settings panel. Tokens are the theme
 * author's fixed design decisions; settings are the site owner's choices
 * within whatever range the theme exposes.
 *
 * Each group carries a handful of well-known keys (for editor autocomplete
 * and so the PRD's own examples type-check as-is) plus an index signature so
 * a theme can declare additional theme-specific tokens beyond the common set.
 */
export interface ThemeColorTokens {
  readonly primary?: string;
  readonly secondary?: string;
  readonly background?: string;
  readonly foreground?: string;
  readonly muted?: string;
  readonly [key: string]: string | undefined;
}

export interface ThemeTypographyTokens {
  readonly heading?: string;
  readonly body?: string;
  readonly [key: string]: string | undefined;
}

export interface ThemeRadiusTokens {
  readonly card?: string;
  readonly button?: string;
  readonly [key: string]: string | undefined;
}

export interface ThemeLayoutTokens {
  readonly container?: string;
  readonly narrow?: string;
  readonly [key: string]: string | undefined;
}

export interface ThemeSpacingTokens {
  readonly section?: string;
  readonly [key: string]: string | undefined;
}

export interface ThemeTokens {
  readonly colors?: ThemeColorTokens;
  readonly typography?: ThemeTypographyTokens;
  readonly radius?: ThemeRadiusTokens;
  readonly layout?: ThemeLayoutTokens;
  readonly spacing?: ThemeSpacingTokens;
}

const TOKEN_GROUPS = ["colors", "typography", "radius", "layout", "spacing"] as const;

/**
 * Flattens design tokens into CSS custom property names/values. Colors flatten
 * directly (`colors.primary` -> `--theme-primary`) since they're referenced
 * constantly; every other group keeps its group name in the variable
 * (`radius.card` -> `--theme-radius-card`) to avoid collisions between groups
 * that might reuse a key name. This is a deliberate, deterministic convention
 * — not a literal reproduction of the PRD's own (inconsistent) illustrative
 * CSS examples.
 */
export function themeTokensToCssVars(tokens: ThemeTokens | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!tokens) return vars;

  for (const group of TOKEN_GROUPS) {
    const values = tokens[group];
    if (!values) continue;
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue;
      const varName = group === "colors" ? `--theme-${key}` : `--theme-${group}-${key}`;
      vars[varName] = value;
    }
  }

  return vars;
}

/** Ready-to-embed `:root{...}` CSS text, or `''` if the theme declares no tokens. */
export function renderTokensCss(tokens: ThemeTokens | undefined): string {
  const vars = themeTokensToCssVars(tokens);
  const entries = Object.entries(vars);
  if (entries.length === 0) return "";

  const declarations = entries.map(([name, value]) => `${name}:${value};`).join("");
  return `:root{${declarations}}`;
}
