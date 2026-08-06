import {
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
import { users } from './users.schema';

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    uploadedById: uuid('uploaded_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    objectKey: varchar('object_key', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    size: integer('size').notNull(),
    url: text('url').notNull(),
    altText: text('alt_text'),
    caption: text('caption'),
    width: integer('width'),
    height: integer('height'),
    // WordPress import provenance: `wp:post_id` of the source `attachment`
    // item and its `<guid>`, used to resolve `_thumbnail_id`/attachment
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
    uniqueIndex('media_object_key_unique').on(table.objectKey),
    index('media_site_created_idx').on(table.siteId, table.createdAt),
    index('media_site_mime_idx').on(table.siteId, table.mimeType),
    uniqueIndex('media_site_wp_id_unique').on(table.siteId, table.wpId),
  ],
);
