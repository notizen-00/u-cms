import { describe, expect, it } from "vitest";
import { validatePlugin } from "@unej-cms/sdk-plugin";
import { autoAvifPlugin } from "./plugin.js";

describe("autoAvifPlugin", () => {
  it("declares its media processor and capability", () => {
    expect(autoAvifPlugin.manifest.id).toBe("unej.auto-avif");
    expect(autoAvifPlugin.manifest.capabilities).toContain("media-transform");
    expect(autoAvifPlugin.media?.uploadProcessors).toHaveLength(1);
    expect(Object.isFrozen(autoAvifPlugin)).toBe(true);
  });

  it("passes host capability and compatibility validation", () => {
    const result = validatePlugin(autoAvifPlugin, {
      host: { cmsVersion: "2.0.0", sdkVersion: "1.0.0" },
      grantedCapabilities: new Set(["media-transform"]),
      resolveInstalledVersion: () => undefined,
    });

    expect(result.ok).toBe(true);
  });
});
