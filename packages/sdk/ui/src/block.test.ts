import { describe, expect, it } from "vitest";
import { createBlockRegistry } from "./registry.js";
import { BlockDefinitionError, defineBlock, registerBlock } from "./block.js";

const valid = {
  id: "demo.hero",
  name: "Hero",
  category: "layout",
  propertySchema: {
    title: { type: "string", label: "Title", default: "Welcome" },
  },
  render: "HeroRenderer",
} as const;

describe("defineBlock", () => {
  it("brands the id and freezes the definition", () => {
    const block = defineBlock({ ...valid });

    expect(block.id).toBe("demo.hero");
    expect(Object.isFrozen(block)).toBe(true);
    expect(Object.isFrozen(block.propertySchema)).toBe(true);
  });

  it("keeps the compatibility fields a theme declares", () => {
    const block = defineBlock({ ...valid, extends: "core.hero", fallback: "core.hero" });

    expect(block.extends).toBe("core.hero");
    expect(block.fallback).toBe("core.hero");
  });

  it("allows a metadata-only block with no renderer", () => {
    // The CMS core catalog declares blocks without a renderer on purpose —
    // how a core block looks is each theme's business.
    const { render, ...withoutRender } = valid;
    expect(defineBlock(withoutRender).render).toBeUndefined();
  });

  it("rejects an id without a namespace", () => {
    // Two packages could otherwise both claim `hero`, and block ids are
    // permanent references inside stored page content.
    expect(() => defineBlock({ ...valid, id: "hero" })).toThrow(BlockDefinitionError);
  });

  it("rejects a block that falls back to itself", () => {
    expect(() => defineBlock({ ...valid, fallback: "demo.hero" })).toThrow(
      /cannot fall back to itself/,
    );
  });

  it("reports every missing required field at once", () => {
    try {
      defineBlock({ ...valid, id: "", name: "", category: "" });
      throw new Error("expected defineBlock to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BlockDefinitionError);
      expect((error as BlockDefinitionError).issues.map((issue) => issue.path)).toEqual([
        "id",
        "name",
        "category",
      ]);
    }
  });
});

describe("registerBlock", () => {
  it("keys the registry entry by the block's own id", () => {
    const registry = createBlockRegistry();
    const block = registerBlock(registry, defineBlock({ ...valid }));

    expect(registry.get(block.id)).toBe(block);
  });

  it("refuses to let one block clobber another", () => {
    const registry = createBlockRegistry();
    registerBlock(registry, defineBlock({ ...valid }));

    expect(() => registerBlock(registry, defineBlock({ ...valid }))).toThrow(
      /already registered/,
    );
  });
});
