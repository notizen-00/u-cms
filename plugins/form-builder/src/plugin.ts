import { definePlugin, type PluginRuntimeContext } from "@unej-cms/sdk-plugin";
import { submitFormAction } from "./actions.js";
import { formBuilderScriptAsset, formBuilderStyleAsset } from "./assets.js";
import { manifest } from "./manifest.js";
import {
  exportSubmissionsPermission,
  formManagerRole,
  manageFormsPermission,
  viewSubmissionsPermission,
} from "./permissions.js";
import { onSubmitErrorTrigger, onSubmitSuccessTrigger } from "./triggers.js";

/**
 * `formBlock` (block.ts) is NOT declared under `ui.blocks` here. It belongs to
 * this plugin's OTHER job — the Markdown-embedded editor's `'form'` block type
 * (see apps/dashboard's lib/editor/blocks.ts, `markerV2('form', ...)`) — not
 * the theme-aware Page Builder. Its `render: "FormBlockRenderer"` field is a
 * marker string nothing interprets as real `.svelte`/Eta source; exposing it
 * via `ui.blocks` would let an author add it in the theme-aware Builder and
 * have it silently never render (same reasoning as `@unej-cms/plugin-page-builder`,
 * which has the identical pattern).
 */
export const formBuilderPlugin = definePlugin<PluginRuntimeContext>({
  manifest,
  ui: {
    actions: [submitFormAction],
    triggers: [onSubmitSuccessTrigger, onSubmitErrorTrigger],
    assets: [formBuilderStyleAsset, formBuilderScriptAsset],
  },
  auth: {
    permissions: [manageFormsPermission, viewSubmissionsPermission, exportSubmissionsPermission],
    roles: [formManagerRole],
  },
  lifecycle: {
    async onActivate(context) {
      context.logger.info("form-builder activated", { pluginId: context.manifest.id });
    },
    async onDeactivate(context) {
      context.logger.info("form-builder deactivated", { pluginId: context.manifest.id });
    },
    async onUninstall(context) {
      context.logger.info("form-builder uninstalled; site-owned data cleanup is handled by the CMS host", {
        pluginId: context.manifest.id,
      });
    },
  },
});
