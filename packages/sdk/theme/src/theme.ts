import { deepFreeze, validateBaseManifest } from "@unej-cms/sdk-core";
import type { BlockDefinition, PropertySchema } from "@unej-cms/sdk-ui";
import type { ThemeManifest } from "./manifest.js";
import type { LayoutDefinition } from "./layout.js";
import type { RegionDefinition } from "./region.js";
import type { MenuLocationDefinition } from "./menu-location.js";
import type { CmsStyle } from "./style.js";
import type { ThemeTokens } from "./tokens.js";
import type { ThemeTemplateDefinition } from "./template.js";

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
  /** Fixed design decisions (colors/typography/radius/layout/spacing), flattened into CSS custom properties by the Builder Runtime. Distinct from `settings`, which are admin-editable per site. */
  readonly tokens?: ThemeTokens;
  /** Named page templates editors can pick from, each mapping to one of `layouts[].id`. */
  readonly templates?: readonly ThemeTemplateDefinition[];
  /**
   * Blocks this theme contributes to the Page Builder, on top of the CMS's
   * own `core.*` catalog — the theme's signature sections (a video hero, a
   * mega menu) that only make sense while it is the active theme.
   *
   * Declaring them here is what keeps the Page Builder generic: it reads
   * every available block from the registry rather than hardcoding one
   * theme's components, so a new theme ships new blocks without touching
   * builder code. Each should set `fallback` to a `core.*` block so pages
   * authored with it still render after a theme switch.
   */
  readonly blocks?: readonly BlockDefinition<PropertySchema, TRender>[];
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
  const layoutIds = new Set(theme.layouts.map((layout) => layout.id));
  for (const template of theme.templates ?? []) {
    if (!layoutIds.has(template.layout)) {
      issues.push({
        path: `templates.${template.id}.layout`,
        message: `references unknown layout "${template.layout}"`,
      });
    }
  }
  if (issues.length > 0) {
    throw new ThemeDefinitionError(theme.manifest.id || "<unknown>", issues);
  }
  return deepFreeze(theme);
}
