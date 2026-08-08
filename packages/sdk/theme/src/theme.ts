import { deepFreeze, validateBaseManifest } from "@unej-cms/sdk-core";
import type { PropertySchema } from "@unej-cms/sdk-ui";
import type { ThemeManifest } from "./manifest.js";
import type { LayoutDefinition } from "./layout.js";
import type { RegionDefinition } from "./region.js";
import type { MenuLocationDefinition } from "./menu-location.js";
import type { CmsStyle } from "./style.js";

/**
 * Everything a theme declares, up front (Declarative Registration). A theme
 * has no lifecycle and never touches a database — it may only register
 * layouts, regions, menu locations, settings, and assets
 * (docs/cms_sdk.md §15).
 */
export interface CmsTheme<TRender = unknown> {
  readonly manifest: ThemeManifest;
  readonly layouts: readonly LayoutDefinition<TRender>[];
  readonly regions?: readonly RegionDefinition[];
  readonly menuLocations?: readonly MenuLocationDefinition[];
  /** Configurable options (colors, toggles, ...) surfaced in the Dashboard's theme settings panel. */
  readonly settings?: PropertySchema;
  /** Separate stylesheet/script assets, emitted as their own files (asset/style/{css,js}/*). */
  readonly styles?: readonly CmsStyle[];
}

export class ThemeDefinitionError extends Error {
  constructor(
    themeId: string,
    public readonly issues: readonly { path: string; message: string }[],
  ) {
    super(
      `Invalid theme definition for "${themeId}":\n` +
        issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join("\n"),
    );
    this.name = "ThemeDefinitionError";
  }
}

/**
 * The only entry point a theme author calls directly. Validates the
 * manifest eagerly and freezes the definition so it can't be mutated after
 * the fact (mirrors `definePlugin` in `@unej-cms/sdk-plugin`).
 */
export function defineTheme<TRender = unknown>(
  theme: CmsTheme<TRender>,
): CmsTheme<TRender> {
  const issues = validateBaseManifest(theme.manifest);
  if (theme.layouts.length === 0) {
    issues.push({ path: "layouts", message: "a theme must declare at least one layout" });
  }
  if (issues.length > 0) {
    throw new ThemeDefinitionError(theme.manifest.id || "<unknown>", issues);
  }
  return deepFreeze(theme);
}
