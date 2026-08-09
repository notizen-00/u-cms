import { discoverPlugins, type CmsPlugin } from '@unej-cms/sdk-plugin';
import autoAvifPlugin from '@unej-cms/plugin-auto-avif';
import formBuilderPlugin from '@unej-cms/plugin-form-builder';

export interface PluginDefinition {
  slug: string;
  name: string;
  description: string;
  version: string;
}

// Official plugins only — "Plugin hanya dari tim CMS" (docs/PRD.md §9). No
// marketplace, no filesystem scanning: adding a plugin means shipping its
// package under the monorepo's `plugins/` workspace and importing it here —
// one line per plugin, never a runtime/user action.
const SHIPPED_PLUGINS: readonly CmsPlugin[] = [
  formBuilderPlugin,
  autoAvifPlugin,
];

export const PLUGIN_REGISTRY: PluginDefinition[] = discoverPlugins(
  SHIPPED_PLUGINS,
).map((metadata) => ({
  slug: metadata.id,
  name: metadata.name,
  description: metadata.description,
  version: metadata.version,
}));

export function findPluginDefinition(
  slug: string,
): PluginDefinition | undefined {
  return PLUGIN_REGISTRY.find((plugin) => plugin.slug === slug);
}

/** Returns the shipped code implementation, including its declarative UI assets. */
export function findPluginImplementation(slug: string): CmsPlugin | undefined {
  return SHIPPED_PLUGINS.find((plugin) => plugin.manifest.id === slug);
}

/**
 * Resolves database slugs in registry order. Unknown/stale rows are ignored so
 * removing an official plugin package cannot make every site build fail.
 */
export function resolvePluginImplementations(slugs: readonly string[]): readonly CmsPlugin[] {
  const requested = new Set(slugs);
  return SHIPPED_PLUGINS.filter((plugin) => requested.has(plugin.manifest.id));
}
