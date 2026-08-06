import { createRegistry, type Registry, type ThemeID } from "@unej-cms/sdk-core";
import type { CmsTheme } from "./theme.js";

export type ThemeRegistry = Registry<ThemeID, CmsTheme<unknown>>;

export const createThemeRegistry = (): ThemeRegistry =>
  createRegistry({ name: "ThemeRegistry" });
