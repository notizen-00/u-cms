import {
  checkCompatibility,
  err,
  ok,
  toPluginId,
  validateBaseManifest,
  validateCapabilities,
  validateDependencies,
  type Result,
  type ValidationIssue,
} from "@unej-cms/sdk-core";
import type { CmsPlugin } from "./plugin.js";
import type { PluginRegistry } from "./registry.js";

export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
}

/** Extracts lightweight listing info from already-loaded plugin modules. */
export function discoverPlugins(plugins: readonly CmsPlugin[]): readonly PluginMetadata[] {
  return plugins.map((plugin) => toPluginMetadata(plugin));
}

export function toPluginMetadata(plugin: CmsPlugin): PluginMetadata {
  const { manifest } = plugin;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    author: manifest.author.name,
    description: manifest.description,
  };
}

export interface PluginHostInfo {
  readonly cmsVersion: string;
  readonly sdkVersion: string;
}

export interface ValidatePluginOptions {
  readonly host: PluginHostInfo;
  readonly grantedCapabilities: ReadonlySet<string>;
  readonly resolveInstalledVersion: (pluginId: string) => string | undefined;
}

/**
 * Full pre-activation validation: manifest shape, CMS/SDK compatibility
 * range, granted capabilities, and dependency resolution.
 */
export function validatePlugin(
  plugin: CmsPlugin,
  options: ValidatePluginOptions,
): Result<true, ValidationIssue[]> {
  const issues: ValidationIssue[] = [...validateBaseManifest(plugin.manifest)];

  const cmsCheck = checkCompatibility("CMS", options.host.cmsVersion, plugin.manifest.compatibility.cms);
  if (!cmsCheck.compatible) {
    issues.push({ path: "compatibility.cms", message: cmsCheck.reason ?? "incompatible CMS version" });
  }

  const sdkCheck = checkCompatibility("SDK", options.host.sdkVersion, plugin.manifest.compatibility.sdk);
  if (!sdkCheck.compatible) {
    issues.push({ path: "compatibility.sdk", message: sdkCheck.reason ?? "incompatible SDK version" });
  }

  issues.push(
    ...validateCapabilities(plugin.manifest.capabilities ?? [], options.grantedCapabilities),
  );

  issues.push(
    ...validateDependencies(plugin.manifest.dependencies ?? [], options.resolveInstalledVersion),
  );

  return issues.length === 0 ? ok(true) : err(issues);
}

/** Registers an already-validated plugin. Throws if the plugin id is already registered. */
export function registerPlugin(registry: PluginRegistry, plugin: CmsPlugin): void {
  registry.register(toPluginId(plugin.manifest.id), plugin as CmsPlugin<unknown>);
}
