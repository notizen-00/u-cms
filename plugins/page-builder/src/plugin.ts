import { definePlugin, type PluginRuntimeContext } from "@unej-cms/sdk-plugin";
import { pageBuilderStyleAsset } from "./assets.js";
import { manifest } from "./manifest.js";

/**
 * `PAGE_BUILDER_BLOCKS` (blocks.ts) is deliberately NOT declared under `ui.blocks`
 * here. Those 20 definitions are the block catalog for this plugin's OTHER job —
 * the Gutenberg-like editor embedded in `bodyMarkdown` (see apps/dashboard's
 * lib/editor/blocks.ts, which mirrors this list 1:1) — not the theme-aware Page
 * Builder (docs/theme_aware_prd.md). Their `render: "PageBuilder:<id>"` field is
 * a marker string nothing interprets as real `.svelte`/Eta source; if exposed
 * via `ui.blocks`, `BlockRegistryService` would offer them in the theme-aware
 * Builder's block picker, they'd add successfully as data, and then never
 * render — indistinguishable from a bug. `ui.assets` (the `.cms-pb-*` CSS) is
 * unrelated and still needed by that Markdown-embedded editor's own rendering.
 */
export const pageBuilderPlugin = definePlugin<PluginRuntimeContext>({
  manifest,
  ui: {
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
