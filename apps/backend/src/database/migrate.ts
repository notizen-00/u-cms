import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { Pool } from 'pg';

/**
 * Transport-level failures that mean "the database isn't reachable *yet*"
 * rather than "this migration is wrong".
 *
 * EAI_AGAIN is the one that matters in Compose: the one-shot migrate container
 * starts the instant Postgres reports healthy, and Docker's embedded DNS
 * occasionally isn't answering for the service name that early — which failed
 * the very first `docker compose up` on an otherwise perfect stack.
 */
const RETRYABLE_CODES = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
]);

const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 1500;

/** Drizzle wraps driver errors, so the useful code sits down the cause chain. */
function isRetryable(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    const code = (current as NodeJS.ErrnoException).code;
    if (code && RETRYABLE_CODES.has(code)) return true;
  }
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: join(__dirname, 'migrations'),
    });
  } finally {
    await pool.end();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      await runMigrations();
      console.log('Migrations applied successfully');
      return;
    } catch (error) {
      // A failed migration is a real error and must stop the rollout; only
      // "not reachable yet" is worth waiting out.
      if (!isRetryable(error) || attempt >= MAX_ATTEMPTS) throw error;
      console.warn(
        `Database not reachable (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS}ms...`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
