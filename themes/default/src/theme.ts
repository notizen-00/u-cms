import { defineTemplate, defineTheme } from "@unej-cms/sdk-theme";
import { manifest } from "./manifest.js";
import { layouts } from "./layouts.js";
import { footerRegion, headerRegion } from "./regions.js";
import { primaryMenuLocation } from "./menu-locations.js";
import { settings } from "./settings.js";
import { tokens } from "./tokens.js";

const defaultTemplate = defineTemplate({
  id: "default",
  name: "Halaman Standar",
  layout: "page",
  description: "Tipografi artikel standar, tanpa sidebar.",
});

export const defaultTheme = defineTheme<string>({
  manifest,
  layouts,
  regions: [headerRegion, footerRegion],
  menuLocations: [primaryMenuLocation],
  settings,
  tokens,
  templates: [defaultTemplate],
});
