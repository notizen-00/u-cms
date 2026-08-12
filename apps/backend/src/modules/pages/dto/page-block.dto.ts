import { z } from 'zod';
import type { PageBlock } from '@unej-cms/sdk-content';
import { MAX_PAGE_BLOCK_DEPTH, MAX_PAGE_BLOCKS } from '../../../common/content-limits';

/**
 * Validation for structured page content (docs/theme_aware_prd.md §8).
 *
 * `props` is intentionally left as an open record here: what a block's props
 * may contain is defined by that block's own `propertySchema` in the Block
 * Registry, which is theme-dependent and therefore not knowable by a static
 * DTO. Shape-checking props against the registry is a separate concern from
 * "is this well-formed page content".
 */
const pageBlockSchema: z.ZodType<PageBlock> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(64),
    type: z.string().min(1).max(128),
    props: z.record(z.string(), z.unknown()),
    slots: z.record(z.string(), z.array(pageBlockSchema)).optional(),
  }),
);

/**
 * `z.lazy` recursion alone has no depth limit, so a deeply nested payload
 * would recurse until the stack gives out. Depth is checked separately,
 * iteratively, before that can happen.
 */
function exceedsMaxDepth(blocks: readonly PageBlock[]): boolean {
  let level: readonly PageBlock[] = blocks;
  for (let depth = 0; depth < MAX_PAGE_BLOCK_DEPTH; depth += 1) {
    const next = level.flatMap((block) => Object.values(block.slots ?? {}).flat());
    if (next.length === 0) return false;
    level = next;
  }
  return true;
}

export const pageBlocksSchema = z
  .array(pageBlockSchema)
  .max(MAX_PAGE_BLOCKS)
  .refine((blocks) => !exceedsMaxDepth(blocks), {
    message: `blocks may not nest deeper than ${MAX_PAGE_BLOCK_DEPTH} levels`,
  })
  .refine(
    (blocks) => {
      // Ids identify a block for selection/undo across reorders, so duplicates
      // would make the editor act on the wrong block.
      const ids = new Set<string>();
      const walk = (nodes: readonly PageBlock[]): boolean =>
        nodes.every((node) => {
          if (ids.has(node.id)) return false;
          ids.add(node.id);
          return Object.values(node.slots ?? {}).every(walk);
        });
      return walk(blocks);
    },
    { message: 'block ids must be unique within a page' },
  );
