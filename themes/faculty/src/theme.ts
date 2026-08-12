import { defineTemplate, defineTheme } from "@unej-cms/sdk-theme";
import { manifest } from "./manifest.js";
import { layouts } from "./layouts.js";
import { footerRegion, headerRegion } from "./regions.js";
import { footerMenuLocation, primaryMenuLocation } from "./menu-locations.js";
import { settings } from "./settings.js";
import { tokens } from "./tokens.js";

const defaultTemplate = defineTemplate({
  id: "default",
  name: "Halaman Standar",
  layout: "page",
  description: "Tipografi artikel standar untuk halaman fakultas.",
});

export const facultyTheme = defineTheme<string>({
  manifest,
  layouts,
  regions: [headerRegion, footerRegion],
  menuLocations: [primaryMenuLocation, footerMenuLocation],
  settings,
  tokens,
  templates: [defaultTemplate],
  // Layout.svelte loads Poppins/Inter from Google Fonts.
  security: {
    contentSecurityPolicy: {
      "style-src": ["https://fonts.googleapis.com"],
      "font-src": ["https://fonts.gstatic.com"],
    },
  },
});
