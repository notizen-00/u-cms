import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  SESSION_COOKIE_NAME: z.string().default('unej_cms_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),

  // Optional shared secret required by POST /setup/init when set, to reduce
  // the window for an "installer race" (anyone reaching /setup first claims
  // super admin). Unset by default, matching WordPress's own install.php risk.
  SETUP_TOKEN: z.string().optional(),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().default('unej_cms'),
  MINIO_SECRET_KEY: z.string().default('unej_cms_secret'),
  MINIO_BUCKET: z.string().default('unej-cms-media'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  // Browser-facing base URL for building public media links. Falls back to
  // http(s)://{MINIO_ENDPOINT}:{MINIO_PORT} when unset, which only works if
  // that host is reachable from outside Docker (e.g. local dev).
  MINIO_PUBLIC_URL: z.string().url().optional(),

  BUILD_OUTPUT_DIR: z.string().default('./data/sites'),

  // Browser-facing base URL for this API — embedded as the `action` on
  // <form> markup rendered into the *public static site* (a different
  // origin than this server), so a visitor's browser knows where to POST a
  // form-builder submission. Falls back to http://localhost:{PORT}, which
  // only works if that host is reachable from outside Docker (e.g. local
  // dev with the port mapped straight through, as in deploy/docker-compose.yml).
  API_PUBLIC_URL: z.string().url().optional(),

  // OpenAI-compatible chat completions endpoint used by the post/page editor's
  // "Buat dengan AI" action (AiService). Points at the campus gateway by
  // default; the feature is disabled (503) until AI_API_TOKEN is set.
  AI_API_BASE_URL: z.string().url().default('https://chat.unej.id/api'),
  AI_API_TOKEN: z.string().optional(),
  AI_API_MODEL: z.string().default('qwen3.6:latest'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
