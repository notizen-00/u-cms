import { describe, expect, it } from "vitest";
import { DuplicateRegistrationError, toPluginId } from "@unej-cms/sdk-core";
import { defineBlock } from "@unej-cms/sdk-ui";
import { definePermission } from "@unej-cms/sdk-auth";
import { definePlugin, PluginDefinitionError } from "./plugin.js";
import { createPluginRegistry } from "./registry.js";
import { registerPlugin, validatePlugin } from "./loader.js";
import type { PluginManifest } from "./manifest.js";

function baseManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "unej.carousel",
    name: "Carousel",
    version: "1.0.0",
    author: { name: "UNEJ" },
    description: "A simple image carousel block.",
    license: "MIT",
    compatibility: {
      cms: { min: "2.0.0", max: "2.99.99" },
      sdk: { min: "1.0.0" },
    },
    capabilities: ["block", "permission"],
    ...overrides,
  };
}

const carouselPermission = definePermission({
  key: "carousel.manage",
  label: "Manage Carousel",
});

const carouselBlock = defineBlock({
  id: "unej.carousel.carousel",
  name: "Carousel",
  category: "media",
  propertySchema: {
    autoplay: { type: "boolean", label: "Autoplay", default: true },
  },
  render: "CarouselRenderer",
});

describe("definePlugin", () => {
  it("accepts a well-formed declarative plugin", () => {
    const plugin = definePlugin({
      manifest: baseManifest(),
      ui: { blocks: [carouselBlock] },
      auth: { permissions: [carouselPermission] },
      lifecycle: {
        onActivate: () => undefined,
      },
    });

    expect(plugin.manifest.id).toBe("unej.carousel");
    expect(plugin.ui?.blocks).toHaveLength(1);
  });

  it("freezes the resulting definition", () => {
    const plugin = definePlugin({ manifest: baseManifest() });
    expect(() => {
      // @ts-expect-error definitions are readonly at the type level too
      plugin.manifest = baseManifest({ id: "other" });
    }).toThrow(TypeError);
  });

  it("rejects a manifest missing required fields", () => {
    expect(() =>
      definePlugin({
        manifest: baseManifest({ license: "" }),
      }),
    ).toThrow(PluginDefinitionError);
  });
});

describe("validatePlugin", () => {
  const plugin = definePlugin({ manifest: baseManifest() });

  it("passes when the host and capabilities satisfy the manifest", () => {
    const result = validatePlugin(plugin, {
      host: { cmsVersion: "2.5.0", sdkVersion: "1.2.0" },
      grantedCapabilities: new Set(["block", "permission"]),
      resolveInstalledVersion: () => undefined,
    });
    expect(result.ok).toBe(true);
  });

  it("fails when the CMS host version is outside the declared range", () => {
    const result = validatePlugin(plugin, {
      host: { cmsVersion: "1.0.0", sdkVersion: "1.2.0" },
      grantedCapabilities: new Set(["block", "permission"]),
      resolveInstalledVersion: () => undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path === "compatibility.cms")).toBe(true);
    }
  });

  it("fails when a declared capability was not granted", () => {
    const result = validatePlugin(plugin, {
      host: { cmsVersion: "2.5.0", sdkVersion: "1.2.0" },
      grantedCapabilities: new Set(["block"]),
      resolveInstalledVersion: () => undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.message.includes("permission"))).toBe(true);
    }
  });
});

describe("PluginRegistry", () => {
  it("registers a plugin and rejects duplicate ids", () => {
    const registry = createPluginRegistry();
    const plugin = definePlugin({ manifest: baseManifest() });

    registerPlugin(registry, plugin);
    expect(registry.has(toPluginId("unej.carousel"))).toBe(true);
    expect(() => registerPlugin(registry, plugin)).toThrow(DuplicateRegistrationError);
  });
});
