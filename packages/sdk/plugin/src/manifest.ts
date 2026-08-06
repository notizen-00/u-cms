import type { BaseManifest } from "@unej-cms/sdk-core";

/**
 * Capabilities a plugin manifest may declare. The host grants a subset of
 * these per-install; `sdk-plugin`'s loader refuses to activate a plugin
 * that declares a capability it wasn't granted (see `validatePlugin`).
 */
export type PluginCapability =
  | "route"
  | "cron"
  | "queue"
  | "migration"
  | "settings"
  | "storage"
  | "block"
  | "widget"
  | "action"
  | "trigger"
  | "permission"
  | "event";

export interface PluginManifest extends BaseManifest {
  readonly capabilities?: readonly PluginCapability[];
}
