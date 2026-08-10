import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { wordpressImportStatusEnum } from './enums';
import { sites } from './sites.schema';
import { users } from './users.schema';

// `stats` shape (untyped jsonb, same convention as forms.schema.ts's
// `fields`): { categoriesImported, tagsImported, mediaImported, mediaFailed,
// pagesImported, newsImported, errors: string[] } — written once by
// WordpressImportProcessor when a run finishes (success or failed).
export const wordpressImports = pgTable('wordpress_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  triggeredBy: uuid('triggered_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  status: wordpressImportStatusEnum('status').notNull().default('queued'),
  sourceFileName: varchar('source_file_name', { length: 255 }).notNull(),
  stats: jsonb('stats'),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
