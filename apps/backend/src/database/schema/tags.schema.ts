import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sites } from './sites.schema';

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    // WordPress import provenance: `wp:term_id` of the source `post_tag`
    // term, used to resolve `<category domain="post_tag">` references on
    // posts in a WXR import and to make re-import idempotent.
    wpId: integer('wp_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('tags_site_slug_unique').on(table.siteId, table.slug),
    index('tags_site_name_idx').on(table.siteId, table.name),
    uniqueIndex('tags_site_wp_id_unique').on(table.siteId, table.wpId),
  ],
);
