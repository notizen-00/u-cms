import { describe, expect, it } from "vitest";
import { AssetDefinitionError, defineAsset } from "./asset.js";

describe("defineAsset", () => {
  it("defines a frozen packaged stylesheet with safe defaults", () => {
    const asset = defineAsset({
      id: "form-builder.styles",
      kind: "css",
      content: ".cms-form{display:block}",
    });

    expect(asset).toMatchObject({
      id: "form-builder.styles",
      kind: "css",
      target: "site",
      placement: "head",
    });
    expect(Object.isFrozen(asset)).toBe(true);
  });

  it("keeps explicit editor targeting and script placement", () => {
    const asset = defineAsset({
      id: "editor-runtime",
      kind: "js",
      url: "https://cdn.example.test/editor.js",
      target: "editor",
      placement: "body",
      defer: true,
    });

    expect(asset.target).toBe("editor");
    expect(asset.placement).toBe("body");
    expect(asset.defer).toBe(true);
  });

  it("rejects missing, duplicate, and unsupported asset sources", () => {
    expect(() =>
      defineAsset({ id: "missing-source", kind: "css" } as never),
    ).toThrow(AssetDefinitionError);
    expect(() =>
      defineAsset({
        id: "duplicate-source",
        kind: "css",
        url: "/style.css",
        content: "body{}",
      } as never),
    ).toThrow('exactly one of "url" or "content"');
    expect(() =>
      defineAsset({ id: "packaged-image", kind: "image", content: "not-an-image" } as never),
    ).toThrow("only supported for css and js");
  });

  it("rejects path-like ids and defer on non-script assets", () => {
    expect(() =>
      defineAsset({ id: "../escape", kind: "css", content: "body{}" }),
    ).toThrow('"id" must start with an alphanumeric');
    expect(() =>
      defineAsset({ id: "styles", kind: "css", content: "body{}", defer: true }),
    ).toThrow('"defer" is only supported for js assets');
  });
});
