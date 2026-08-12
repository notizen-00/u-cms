/**
 * Structured page content (docs/theme_aware_prd.md §8).
 *
 * A page stores *what it contains*, never how it looks: each entry names a
 * block type from the Block Registry plus the props for it. Presentation is
 * resolved at render time by whichever theme is active, which is what lets the
 * same page render under more than one theme — and lets a theme switch keep
 * the content intact.
 *
 * Lives in `sdk-content` (not the backend) so theme and plugin authors can
 * type their renderers against the exact same contract the CMS stores.
 */

/** Props are validated against the block's own `propertySchema`, so they stay open here. */
export type PageBlockProps = Readonly<Record<string, unknown>>;

export interface PageBlock {
  /**
   * Stable per-page identifier. Kept in the stored content — rather than
   * derived from array position — so a block keeps its identity when moved,
   * which is what lets the editor track selection and undo across reorders.
   */
  readonly id: string;
  /** Block Registry type, e.g. `core.hero` or `faculty.video-hero`. */
  readonly type: string;
  readonly props: PageBlockProps;
  /** Nested content, keyed by the slot names the block definition declares. */
  readonly slots?: Readonly<Record<string, readonly PageBlock[]>>;
}

/** Reads every block type used by a page, including nested slots — the input to a compatibility check. */
export function collectBlockTypes(blocks: readonly PageBlock[]): readonly string[] {
  const types: string[] = [];
  const walk = (nodes: readonly PageBlock[]): void => {
    for (const node of nodes) {
      types.push(node.type);
      for (const nested of Object.values(node.slots ?? {})) {
        walk(nested);
      }
    }
  };
  walk(blocks);
  return types;
}
