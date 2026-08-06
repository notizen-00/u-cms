import type { PluginManifest } from "@unej-cms/sdk-plugin";

export const PLUGIN_ID = "unej.form-builder";
export const PLUGIN_VERSION = "1.0.0";

export const manifest: PluginManifest = {
  id: PLUGIN_ID,
  name: "Form Builder",
  version: PLUGIN_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Drag-and-drop form block with configurable fields, validation, permissions, and submission storage.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "2.0.0" },
    sdk: { min: "1.0.0" },
  },
  capabilities: ["block", "action", "trigger", "permission", "storage", "event"],
};
