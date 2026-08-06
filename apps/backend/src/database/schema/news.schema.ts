import {
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

export const news = pgTable(
  'news',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    excerpt: text('excerpt'),
    bodyMarkdown: text('body_markdown').notNull().default(''),
    status: contentStatusEnum('status').notNull().default('draft'),
    featuredImageUrl: text('featured_image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    // WordPress import provenance: `wp:post_id` of the source `post` item
    // and its `<guid>`, used to resolve `wp:post_parent`/category-tag
    // references in a WXR import and to make re-import idempotent.
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
    uniqueIndex('news_site_slug_unique').on(table.siteId, table.slug),
    uniqueIndex('news_site_wp_id_unique').on(table.siteId, table.wpId),
  ],
);
