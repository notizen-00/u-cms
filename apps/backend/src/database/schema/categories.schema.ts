import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sites } from './sites.schema';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references(
      (): AnyPgColumn => categories.id,
      { onDelete: 'set null' },
    ),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 150 }).notNull(),
    description: text('description'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    // WordPress import provenance: `wp:term_id` of the source `category`
    // term, used to resolve `<category domain="category">` references on
    // posts/pages in a WXR import and to make re-import idempotent.
    wpId: integer('wp_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('categories_site_slug_unique').on(table.siteId, table.slug),
    index('categories_site_parent_idx').on(table.siteId, table.parentId),
    uniqueIndex('categories_site_wp_id_unique').on(table.siteId, table.wpId),
  ],
);
