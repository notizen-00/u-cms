import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pages } from './pages.schema';
import { sites } from './sites.schema';

/**
 * Backing store for per-token preview revocation (docs/theme_aware_prd.md
 * §23). One row per minted preview token — `tokenHash` (never the raw jti,
 * same convention as `sessions.tokenHash`) is what `verify()` looks up, and
 * `revokedAt` is what a revoke action sets.
 *
 * The token itself stays a self-contained, signed JWT-like value (see
 * `PreviewTokenService`) — this table doesn't replace that, it adds the one
 * thing a stateless signature can never provide: the ability to invalidate
 * one *already-issued* token before it expires.
 */
export const previewTokens = pgTable('preview_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
