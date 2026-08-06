import { definePlugin, type PluginRuntimeContext } from "@unej-cms/sdk-plugin";
import { submitFormAction } from "./actions.js";
import { formBlock } from "./block.js";
import { manifest } from "./manifest.js";
import {
  exportSubmissionsPermission,
  formManagerRole,
  manageFormsPermission,
  viewSubmissionsPermission,
} from "./permissions.js";
import { onSubmitErrorTrigger, onSubmitSuccessTrigger } from "./triggers.js";

export const formBuilderPlugin = definePlugin<PluginRuntimeContext>({
  manifest,
  ui: {
    blocks: [formBlock],
    actions: [submitFormAction],
    triggers: [onSubmitSuccessTrigger, onSubmitErrorTrigger],
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
      context.logger.warn("form-builder uninstalled - stored forms/submissions are not deleted automatically", {
        pluginId: context.manifest.id,
      });
    },
  },
});
