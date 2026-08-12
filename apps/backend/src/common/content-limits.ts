/**
 * Page Builder stores encoded block metadata beside its HTML fallback, so a
 * useful page can be larger than Express' 100 KB default JSON body limit.
 * Keep the transport ceiling bounded and the persisted content ceiling lower
 * to leave room for JSON escaping and the other DTO fields.
 */
export const ADMIN_JSON_BODY_LIMIT = '4mb';
export const MAX_BODY_MARKDOWN_LENGTH = 1_000_000;

/**
 * Ceilings for structured block content (docs/theme_aware_prd.md §8). Blocks
 * nest through slots, so both the breadth and the depth need a bound —
 * without the depth bound a hand-crafted payload could nest deeply enough to
 * blow the stack in any recursive walk (validation, rendering, type
 * collection).
 */
export const MAX_PAGE_BLOCKS = 500;
export const MAX_PAGE_BLOCK_DEPTH = 10;
