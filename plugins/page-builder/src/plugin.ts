import { definePlugin, type PluginRuntimeContext } from "@unej-cms/sdk-plugin";
import { pageBuilderStyleAsset } from "./assets.js";
import { PAGE_BUILDER_BLOCKS } from "./blocks.js";
import { manifest } from "./manifest.js";

export const pageBuilderPlugin = definePlugin<PluginRuntimeContext>({
  manifest,
  ui: {
    blocks: PAGE_BUILDER_BLOCKS,
    assets: [pageBuilderStyleAsset],
  },
  lifecycle: {
    async onActivate(context) {
      context.logger.info("page-builder activated", { pluginId: context.manifest.id });
    },
    async onDeactivate(context) {
      context.logger.info("page-builder deactivated; visual content remains stored as portable Markdown", {
        pluginId: context.manifest.id,
      });
    },
    async onUninstall(context) {
      context.logger.info("page-builder uninstalled; authored page and news content is preserved", {
        pluginId: context.manifest.id,
      });
    },
  },
});
