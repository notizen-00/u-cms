import type { Logger } from "@unej-cms/sdk-core";
import type { AuthContext } from "@unej-cms/sdk-auth";
import type { EventBus, HookBus } from "@unej-cms/sdk-events";
import type { StorageDriver } from "@unej-cms/sdk-storage";
import type { PluginManifest } from "./manifest.js";

/**
 * What a Runtime (Backend/Dashboard/Builder) must inject into a plugin's
 * lifecycle hooks. Every field is a contract from another `sdk-*` package —
 * the plugin never sees the Runtime's concrete implementation
 * (Runtime Independent principle).
 */
export interface PluginRuntimeContext {
  readonly manifest: PluginManifest;
  readonly logger: Logger;
  readonly events: EventBus;
  readonly hooks: HookBus;
  readonly auth: AuthContext;
  readonly storage: StorageDriver;
}
