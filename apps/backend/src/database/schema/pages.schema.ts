import {
  AnyPgColumn,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { contentStatusEnum } from './enums';
import { sites } from './sites.schema';
import { users } from './users.schema';

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => pages.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    bodyMarkdown: text('body_markdown').notNull().default(''),
    status: contentStatusEnum('status').notNull().default('draft'),
    isHomepage: boolean('is_homepage').notNull().default(false),
    order: integer('order').notNull().default(0),
    // WordPress import provenance: `wp:post_id` of the source `page` item
    // and its `<guid>`, used to resolve `wp:post_parent` hierarchy in a WXR
    // import and to make re-import idempotent.
    wpId: integer('wp_id'),
    wpGuid: text('wp_guid'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('pages_site_slug_unique').on(table.siteId, table.slug),
    uniqueIndex('pages_site_wp_id_unique').on(table.siteId, table.wpId),
  ],
);
