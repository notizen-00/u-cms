import { definePlugin } from "@unej-cms/sdk-plugin";
import { manifest } from "./manifest.js";
import { runWordpressImportPermission } from "./permissions.js";

export const wordpressImportPlugin = definePlugin({
  manifest,
  auth: {
    permissions: [runWordpressImportPermission],
  },
});
