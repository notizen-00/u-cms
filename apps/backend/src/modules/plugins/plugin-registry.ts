import { discoverPlugins, type CmsPlugin } from '@unej-cms/sdk-plugin';
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
const INSTALLED_PLUGINS: readonly CmsPlugin[] = [formBuilderPlugin];

export const PLUGIN_REGISTRY: PluginDefinition[] = discoverPlugins(
  INSTALLED_PLUGINS,
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
