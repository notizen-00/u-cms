import { describe, expect, it } from "vitest";
import { DuplicateRegistrationError, toThemeId } from "@unej-cms/sdk-core";
import { defineTheme, ThemeDefinitionError } from "./theme.js";
import { defineLayout } from "./layout.js";
import { defineRegion } from "./region.js";
import { createThemeRegistry } from "./registry.js";
import { registerTheme, validateTheme } from "./loader.js";
import type { ThemeManifest } from "./manifest.js";

function baseManifest(overrides: Partial<ThemeManifest> = {}): ThemeManifest {
  return {
    id: "unej.theme-default",
    name: "Default",
    version: "1.0.0",
    author: { name: "UNEJ" },
    description: "The default UNEJ CMS theme.",
    license: "UNLICENSED",
    compatibility: {
      cms: { min: "2.0.0", max: "2.99.99" },
      sdk: { min: "1.0.0" },
    },
    ...overrides,
  };
}

const layoutLayout = defineLayout({ id: "layout", name: "Layout", render: "<html></html>" });
const headerRegion = defineRegion({ id: "header", label: "Header" });

describe("defineTheme", () => {
  it("accepts a well-formed declarative theme", () => {
    const theme = defineTheme({
      manifest: baseManifest(),
      layouts: [layoutLayout],
      regions: [headerRegion],
    });

    expect(theme.manifest.id).toBe("unej.theme-default");
    expect(theme.layouts).toHaveLength(1);
  });

  it("freezes the resulting definition", () => {
    const theme = defineTheme({ manifest: baseManifest(), layouts: [layoutLayout] });
    expect(() => {
      // @ts-expect-error definitions are readonly at the type level too
      theme.manifest = baseManifest({ id: "other" });
    }).toThrow(TypeError);
  });

  it("rejects a manifest missing required fields", () => {
    expect(() =>
      defineTheme({ manifest: baseManifest({ license: "" }), layouts: [layoutLayout] }),
    ).toThrow(ThemeDefinitionError);
  });

  it("rejects a theme with no layouts", () => {
    expect(() => defineTheme({ manifest: baseManifest(), layouts: [] })).toThrow(ThemeDefinitionError);
  });
});

describe("validateTheme", () => {
  const theme = defineTheme({ manifest: baseManifest(), layouts: [layoutLayout] });

  it("passes when the host satisfies the manifest", () => {
    const result = validateTheme(theme, { host: { cmsVersion: "2.5.0", sdkVersion: "1.2.0" } });
    expect(result.ok).toBe(true);
  });

  it("fails when the CMS host version is outside the declared range", () => {
    const result = validateTheme(theme, { host: { cmsVersion: "1.0.0", sdkVersion: "1.2.0" } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "compatibility.cms")).toBe(true);
    }
  });
});

describe("ThemeRegistry", () => {
  it("registers a theme and rejects duplicate ids", () => {
    const registry = createThemeRegistry();
    const theme = defineTheme({ manifest: baseManifest(), layouts: [layoutLayout] });

    registerTheme(registry, theme);
    expect(registry.has(toThemeId("unej.theme-default"))).toBe(true);
    expect(() => registerTheme(registry, theme)).toThrow(DuplicateRegistrationError);
  });
});
