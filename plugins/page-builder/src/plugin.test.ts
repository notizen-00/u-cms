import { describe, expect, it } from "vitest";
import { PAGE_BUILDER_STYLES, pageBuilderStyleAsset } from "./assets.js";
import { PAGE_BUILDER_BLOCKS, PAGE_BUILDER_RICH_BLOCK_IDS } from "./blocks.js";
import { PLUGIN_ID } from "./manifest.js";
import { PAGE_BUILDER_PATTERNS } from "./patterns.js";
import { pageBuilderPlugin } from "./plugin.js";

describe("pageBuilderPlugin", () => {
  it("declares a complete, unique block catalog for the Markdown-embedded editor, kept out of the theme-aware Builder", () => {
    const ids = PAGE_BUILDER_BLOCKS.map((block) => block.id);

    expect(pageBuilderPlugin.manifest.id).toBe(PLUGIN_ID);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(20);
    for (const richId of PAGE_BUILDER_RICH_BLOCK_IDS) {
      expect(ids).toContain(`${PLUGIN_ID}.${richId}`);
    }
    // None of PAGE_BUILDER_BLOCKS' `render: "PageBuilder:<id>"` markers are
    // real .svelte/Eta source — deliberately not offered as `ui.blocks`, or
    // the theme-aware Page Builder would let an author add one and it would
    // silently never render (see plugin.ts's module doc).
    expect(pageBuilderPlugin.ui?.blocks).toBeUndefined();
    expect(pageBuilderPlugin.ui?.assets).toEqual([pageBuilderStyleAsset]);
    expect(pageBuilderStyleAsset).toMatchObject({ kind: "css", target: "site", placement: "head" });
    expect(PAGE_BUILDER_STYLES).toContain(".cms-pb-hero");
    expect(PAGE_BUILDER_STYLES).toContain(".cms-pb-hero--no-media");
    expect(PAGE_BUILDER_STYLES).toContain(".cms-pb-faq");
    expect(PAGE_BUILDER_STYLES).toContain(".cms-pb-stats__list");
    expect(PAGE_BUILDER_STYLES).toContain(
      "grid-template-columns: repeat(var(--cms-pb-columns, 3), minmax(0, 1fr))",
    );
    expect(PAGE_BUILDER_STYLES.lastIndexOf(".cms-pb-tone-primary {")).toBeGreaterThan(
      PAGE_BUILDER_STYLES.indexOf(".cms-pb-callout {"),
    );
  });

  it("ships useful block patterns without reusing mutable state", () => {
    expect(PAGE_BUILDER_PATTERNS.map((pattern) => pattern.id)).toEqual(["landing", "profile", "faq"]);
    expect(PAGE_BUILDER_PATTERNS.every((pattern) => pattern.blocks.length >= 4)).toBe(true);
    expect(Object.isFrozen(pageBuilderPlugin)).toBe(true);
  });
});
