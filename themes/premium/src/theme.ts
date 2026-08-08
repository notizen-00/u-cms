import { defineTheme } from "@unej-cms/sdk-theme";
import { manifest } from "./manifest.js";
import { layouts } from "./layouts.js";
import { footerRegion, headerRegion } from "./regions.js";
import { footerMenuLocation, primaryMenuLocation } from "./menu-locations.js";
import { settings } from "./settings.js";

export const premiumTheme = defineTheme<string>({
  manifest,
  layouts,
  regions: [headerRegion, footerRegion],
  menuLocations: [primaryMenuLocation, footerMenuLocation],
  settings,
});
