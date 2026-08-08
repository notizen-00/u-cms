import {
  checkCompatibility,
  err,
  ok,
  toThemeId,
  validateBaseManifest,
  type Result,
  type ValidationIssue,
} from "@unej-cms/sdk-core";
import type { CmsTheme } from "./theme.js";
import type { ThemeRegistry } from "./registry.js";

export interface ThemeMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly screenshot?: string | undefined;
  /** Configurable options this theme declares — surfaced by the Dashboard's theme settings panel. */
  readonly settings?: CmsTheme["settings"];
  /** Named nav slots this theme renders (e.g. "primary", "footer") — surfaced by the Dashboard's Menus screen so editors can assign a menu to one. */
  readonly menuLocations?: CmsTheme["menuLocations"];
}

/** Extracts lightweight listing info from already-loaded theme modules. */
export function discoverThemes(themes: readonly CmsTheme[]): readonly ThemeMetadata[] {
  return themes.map((theme) => toThemeMetadata(theme));
}

export function toThemeMetadata(theme: CmsTheme): ThemeMetadata {
  const { manifest } = theme;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    author: manifest.author.name,
    description: manifest.description,
    screenshot: manifest.screenshot,
    settings: theme.settings,
    menuLocations: theme.menuLocations,
  };
}

export interface ThemeHostInfo {
  readonly cmsVersion: string;
  readonly sdkVersion: string;
}

export interface ValidateThemeOptions {
  readonly host: ThemeHostInfo;
}

/** Manifest shape + CMS/SDK compatibility range. Themes have no capabilities/dependencies to check. */
export function validateTheme(
  theme: CmsTheme,
  options: ValidateThemeOptions,
): Result<true, ValidationIssue[]> {
  const issues: ValidationIssue[] = [...validateBaseManifest(theme.manifest)];

  const cmsCheck = checkCompatibility("CMS", options.host.cmsVersion, theme.manifest.compatibility.cms);
  if (!cmsCheck.compatible) {
    issues.push({ path: "compatibility.cms", message: cmsCheck.reason ?? "incompatible CMS version" });
  }

  const sdkCheck = checkCompatibility("SDK", options.host.sdkVersion, theme.manifest.compatibility.sdk);
  if (!sdkCheck.compatible) {
    issues.push({ path: "compatibility.sdk", message: sdkCheck.reason ?? "incompatible SDK version" });
  }

  return issues.length === 0 ? ok(true) : err(issues);
}

/** Registers an already-validated theme. Throws if the theme id is already registered. */
export function registerTheme(registry: ThemeRegistry, theme: CmsTheme): void {
  registry.register(toThemeId(theme.manifest.id), theme as CmsTheme<unknown>);
}
