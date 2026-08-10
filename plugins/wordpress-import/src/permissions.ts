import { definePermission } from "@unej-cms/sdk-auth";

export const runWordpressImportPermission = definePermission({
  key: "wordpress-import.run",
  label: "Run WordPress Import",
  description: "Upload a WordPress WXR export and import its content into the site.",
});
