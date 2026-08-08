import type { ThemeTokens } from "@unej-cms/sdk-theme";

/**
 * Fixed design tokens (distinct from `./settings.ts`, which are per-site and
 * admin-editable). The Builder Runtime flattens these into `--theme-*` CSS
 * custom properties, available in every layout via `it.tokensCss` — see
 * `layouts.ts`'s `<style>` block.
 */
export const tokens: ThemeTokens = {
  colors: {
    background: "#ffffff",
    foreground: "#111827",
    muted: "#dfe5ed",
  },
  typography: {
    heading: "system-ui, -apple-system, sans-serif",
    body: "system-ui, -apple-system, sans-serif",
  },
  radius: {
    card: ".375rem",
    button: ".375rem",
  },
  layout: {
    container: "1100px",
    narrow: "760px",
  },
  spacing: {
    section: "48px",
  },
};
