export const ALLOWED_SCREENSHOT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
] as const;

export const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024;
