import { createRegistry, type PluginID, type Registry } from "@unej-cms/sdk-core";
import type { CmsPlugin } from "./plugin.js";

export type PluginRegistry = Registry<PluginID, CmsPlugin<unknown>>;

export const createPluginRegistry = (): PluginRegistry =>
  createRegistry({ name: "PluginRegistry" });
