import type { CompatibilityRange } from "./version.js";
import type { JsonObject } from "./types.js";

/**
 * Compatibility window an extension declares against the two hosts that
 * matter: the CMS itself, and the Platform SDK it was built against.
 */
export interface ManifestCompatibility {
  readonly cms: CompatibilityRange;
  readonly sdk: CompatibilityRange;
}

export interface ManifestDependency {
  readonly id: string;
  readonly range: CompatibilityRange;
  readonly optional?: boolean;
}

export interface ManifestAuthor {
  readonly name: string;
  readonly email?: string;
  readonly url?: string;
}

/**
 * Fields shared by every manifest kind (Plugin Manifest, Theme Manifest,
 * Marketplace Manifest). Domain packages (`sdk-plugin`, future `sdk-theme`)
 * extend this with their own required capabilities.
 */
export interface BaseManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: ManifestAuthor;
  readonly description: string;
  readonly license: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly compatibility: ManifestCompatibility;
  readonly dependencies?: readonly ManifestDependency[];
  readonly capabilities?: readonly string[];
  /** Free-form metadata reserved for marketplace/registry use. Never read by the SDK itself. */
  readonly metadata?: JsonObject;
}
