/**
 * Page Builder stores encoded block metadata beside its HTML fallback, so a
 * useful page can be larger than Express' 100 KB default JSON body limit.
 * Keep the transport ceiling bounded and the persisted content ceiling lower
 * to leave room for JSON escaping and the other DTO fields.
 */
export const ADMIN_JSON_BODY_LIMIT = '4mb';
export const MAX_BODY_MARKDOWN_LENGTH = 1_000_000;
