import type { BaseManifest } from "@unej-cms/sdk-core";

export interface ThemeManifest extends BaseManifest {
  /** Preview image URL shown in the Dashboard's theme picker. */
  readonly screenshot?: string;
}
