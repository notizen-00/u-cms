import type { ThemeTokens } from "@unej-cms/sdk-theme";

/**
 * Fixed design tokens (distinct from `./settings.ts`, which are per-site and
 * admin-editable — colors live in settings for this theme since institutions
 * reasonably want their own brand colors, but typography/radius/spacing are
 * the theme author's fixed design decisions). Flattened into `--theme-*` CSS
 * custom properties by the renderer, available via the `tokensCss` prop.
 */
export const tokens: ThemeTokens = {
  colors: {
    background: "#ffffff",
    foreground: "#0b1526",
    muted: "#5b6b82",
    surface: "#f6f8fb",
    line: "#e2e8f0",
  },
  typography: {
    heading: "'Poppins', 'Segoe UI', system-ui, sans-serif",
    body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  radius: {
    card: "16px",
    button: "999px",
  },
  layout: {
    container: "1180px",
    narrow: "760px",
  },
  spacing: {
    section: "88px",
  },
};
