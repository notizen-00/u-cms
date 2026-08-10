export const WORDPRESS_IMPORT_QUEUE = 'wordpress-import';

// Distinct BullMQ shared-config key so this module's own `forRootAsync`
// registers under its own token instead of colliding with builder's
// (BuilderQueueModule's `forRootAsync` has no explicit key, i.e. the
// BullMQ-default one) — keeps this module fully self-contained instead of
// silently depending on Builder's module also being present in the graph.
export const WORDPRESS_IMPORT_QUEUE_CONFIG_KEY = 'wordpress-import';

// A WXR export is plain text but can be large for an old, long-running site
// — bigger than the 10MB media-upload limit (media.constants.ts), so this
// gets its own constant rather than reusing that one.
export const WXR_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
