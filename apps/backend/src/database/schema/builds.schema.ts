import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { buildStatusEnum } from './enums';
import { sites } from './sites.schema';
import { users } from './users.schema';

export const builds = pgTable('builds', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  triggeredBy: uuid('triggered_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  status: buildStatusEnum('status').notNull().default('queued'),
  outputPath: text('output_path'),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
