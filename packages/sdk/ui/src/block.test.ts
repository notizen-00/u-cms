import { describe, expect, it } from "vitest";
import { defineBlock } from "./block.js";

describe("defineBlock", () => {
  it("brands the id and freezes the definition", () => {
    const block = defineBlock({
      id: "hero",
      name: "Hero",
      category: "layout",
      propertySchema: {
        title: { type: "string", label: "Title", default: "Welcome" },
      },
      render: "HeroRenderer",
    });

    expect(block.id).toBe("hero");
    expect(Object.isFrozen(block)).toBe(true);
    expect(Object.isFrozen(block.propertySchema)).toBe(true);
  });
});
