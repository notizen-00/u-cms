import type { ThemeTokens } from "@unej-cms/sdk-theme";

/**
 * Fixed design tokens (distinct from `./settings.ts`, which are per-site and
 * admin-editable) — ported from the CSS custom properties already hardcoded
 * in `layouts.ts`'s `STYLES` block (`--ink`, `--muted`, `--line`, `--surface`,
 * `--bg`, `--radius`), so these are real values, not invented ones. The
 * Builder Runtime flattens these into `--theme-*` custom properties,
 * available in every layout via `it.tokensCss`.
 */
export const tokens: ThemeTokens = {
  colors: {
    background: "#f8fafc",
    foreground: "#0f172a",
    muted: "#64748b",
    // Theme-specific extras beyond the common set (see ThemeColorTokens'
    // index signature) — `surface`/`line` mirror this theme's own
    // `--surface`/`--line` custom properties.
    surface: "#ffffff",
    line: "#e2e8f0",
  },
  typography: {
    heading: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  radius: {
    card: "14px",
    button: "999px",
  },
  layout: {
    container: "1120px",
    narrow: "760px",
  },
  spacing: {
    section: "56px",
  },
};
