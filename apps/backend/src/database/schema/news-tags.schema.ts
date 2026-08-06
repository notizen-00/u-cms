import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { news } from './news.schema';
import { tags } from './tags.schema';

export const newsTags = pgTable(
  'news_tags',
  {
    newsId: uuid('news_id')
      .notNull()
      .references(() => news.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'news_tags_pk',
      columns: [table.newsId, table.tagId],
    }),
    index('news_tags_tag_idx').on(table.tagId),
  ],
);
