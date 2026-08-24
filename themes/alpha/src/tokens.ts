import type { ThemeTokens } from "@unej-cms/sdk-theme";

/**
 * Fixed design tokens (distinct from `./settings.ts`, which are per-site and
 * admin-editable). Flattened into `--theme-*` CSS custom properties by the
 * renderer, available via the `tokensCss` prop. Deliberately dark and
 * near-black — the tactical/esports look this theme is built around only
 * works with a dark base; a light-mode variant would need different tokens
 * entirely, not just an override.
 */
export const tokens: ThemeTokens = {
  colors: {
    background: "#0a0a0c",
    foreground: "#f4f4f2",
    muted: "#8b8b92",
    surface: "#16161a",
    line: "#2a2a30",
  },
  typography: {
    // Condensed, heavy-weight display face — the "military stencil" look
    // most battle-royale portals share for headings; Barlow Condensed for
    // body copy keeps long text readable without competing with it.
    heading: "'Rajdhani', 'Oswald', 'Arial Narrow', sans-serif",
    body: "'Barlow', 'Segoe UI', system-ui, sans-serif",
  },
  radius: {
    // Square, not rounded — this theme's cards/buttons use a clipped-corner
    // shape instead (see hero.css/.btn), so a near-zero radius here is the
    // deliberate baseline for anything that doesn't opt into that shape.
    card: "2px",
    button: "2px",
  },
  layout: {
    container: "1320px",
    narrow: "760px",
  },
  spacing: {
    section: "96px",
  },
};
