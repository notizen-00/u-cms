import type { ThemeTokens } from "@unej-cms/sdk-theme";

/**
 * Fixed design tokens (distinct from `./settings.ts`, which are per-site and
 * admin-editable). Flattened into `--theme-*` CSS custom properties by the
 * renderer, available via the `tokensCss` prop.
 */
export const tokens: ThemeTokens = {
  colors: {
    background: "#ffffff",
    foreground: "#0b1220",
    muted: "#5b6b82",
    surface: "#f4f7f8",
    line: "#e2e8f0",
  },
  typography: {
    heading: "'Poppins', 'Segoe UI', system-ui, sans-serif",
    body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  radius: {
    card: "14px",
    button: "999px",
  },
  layout: {
    container: "1240px",
    narrow: "760px",
  },
  spacing: {
    section: "80px",
  },
};
