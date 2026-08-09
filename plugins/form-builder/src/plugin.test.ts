import { describe, expect, it } from "vitest";
import { validatePlugin } from "@unej-cms/sdk-plugin";
import { formBuilderPlugin } from "./plugin.js";

describe("formBuilderPlugin", () => {
  it("declares a well-formed, frozen manifest", () => {
    expect(formBuilderPlugin.manifest.id).toBe("unej.form-builder");
    expect(() => {
      // @ts-expect-error the plugin definition is readonly at the type level too
      formBuilderPlugin.manifest = { ...formBuilderPlugin.manifest, id: "other" };
    }).toThrow(TypeError);
  });

  it("registers the Form block, submitForm action, and both submit triggers", () => {
    expect(formBuilderPlugin.ui?.blocks).toHaveLength(1);
    expect(formBuilderPlugin.ui?.blocks?.[0]?.id).toBe("unej.form-builder.form");
    expect(formBuilderPlugin.ui?.actions).toHaveLength(1);
    expect(formBuilderPlugin.ui?.triggers).toHaveLength(2);
  });

  it("ships its public stylesheet and runtime instead of relying on a theme", () => {
    const assets = formBuilderPlugin.ui?.assets ?? [];

    expect(assets).toHaveLength(2);
    expect(assets.map((asset) => asset.id)).toEqual(["styles", "runtime"]);
    expect(assets.every((asset) => asset.target === "site")).toBe(true);

    const stylesheet = assets.find((asset) => asset.kind === "css");
    const runtime = assets.find((asset) => asset.kind === "js");
    expect(stylesheet && "content" in stylesheet ? stylesheet.content : "").toContain(
      ".cms-form-embed",
    );
    expect(runtime && "content" in runtime ? runtime.content : "").toContain(
      "cms-form-embed",
    );
  });

  it("registers permissions and a bundling role", () => {
    const keys = formBuilderPlugin.auth?.permissions?.map((permission) => permission.key) ?? [];
    expect(keys).toContain("form-builder.manage");
    expect(keys).toContain("form-builder.submissions.view");
    expect(keys).toContain("form-builder.submissions.export");

    const role = formBuilderPlugin.auth?.roles?.[0];
    expect(role?.permissions).toEqual(keys);
  });

  it("passes host validation when every declared capability is granted", () => {
    const result = validatePlugin(formBuilderPlugin, {
      host: { cmsVersion: "2.5.0", sdkVersion: "1.2.0" },
      grantedCapabilities: new Set(formBuilderPlugin.manifest.capabilities ?? []),
      resolveInstalledVersion: () => undefined,
    });
    expect(result.ok).toBe(true);
  });

  it("fails host validation when a declared capability was not granted", () => {
    const result = validatePlugin(formBuilderPlugin, {
      host: { cmsVersion: "2.5.0", sdkVersion: "1.2.0" },
      grantedCapabilities: new Set(["block"]),
      resolveInstalledVersion: () => undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.message.includes("storage"))).toBe(true);
    }
  });

  it("fails host validation when the CMS host is outside the declared range", () => {
    const result = validatePlugin(formBuilderPlugin, {
      host: { cmsVersion: "1.0.0", sdkVersion: "1.2.0" },
      grantedCapabilities: new Set(formBuilderPlugin.manifest.capabilities ?? []),
      resolveInstalledVersion: () => undefined,
    });
    expect(result.ok).toBe(false);
  });
});
