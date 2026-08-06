import { deepFreeze, validateBaseManifest, type LifecycleHooks } from "@unej-cms/sdk-core";
import type { ActionDefinition, AssetDefinition, BlockDefinition, TriggerDefinition, WidgetDefinition } from "@unej-cms/sdk-ui";
import type { PermissionDefinition, RoleDefinition } from "@unej-cms/sdk-auth";
import type { PluginManifest } from "./manifest.js";
import type { PluginRuntimeContext } from "./context.js";

/**
 * Everything a plugin registers with the Builder/Dashboard, declared
 * up front instead of imperatively calling Core (Declarative Registration
 * principle).
 */
export interface PluginUiRegistrations {
  readonly blocks?: readonly BlockDefinition[];
  readonly widgets?: readonly WidgetDefinition[];
  readonly actions?: readonly ActionDefinition[];
  readonly triggers?: readonly TriggerDefinition[];
  readonly assets?: readonly AssetDefinition[];
}

export interface PluginAuthRegistrations {
  readonly permissions?: readonly PermissionDefinition[];
  readonly roles?: readonly RoleDefinition[];
}

export interface CmsPlugin<TContext = PluginRuntimeContext> {
  readonly manifest: PluginManifest;
  readonly ui?: PluginUiRegistrations;
  readonly auth?: PluginAuthRegistrations;
  readonly lifecycle?: LifecycleHooks<TContext>;
}

export class PluginDefinitionError extends Error {
  constructor(pluginId: string, public readonly issues: readonly { path: string; message: string }[]) {
    super(
      `Invalid plugin definition for "${pluginId}":\n` +
        issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join("\n"),
    );
    this.name = "PluginDefinitionError";
  }
}

/**
 * The only entry point a plugin author calls directly. Validates the
 * manifest eagerly (fail at declaration time, not at load time) and
 * freezes the definition so it can't be mutated after the fact.
 */
export function definePlugin<TContext = PluginRuntimeContext>(
  plugin: CmsPlugin<TContext>,
): CmsPlugin<TContext> {
  const issues = validateBaseManifest(plugin.manifest);
  if (issues.length > 0) {
    throw new PluginDefinitionError(plugin.manifest.id || "<unknown>", issues);
  }
  return deepFreeze(plugin);
}
