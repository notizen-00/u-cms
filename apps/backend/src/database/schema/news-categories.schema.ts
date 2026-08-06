import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { categories } from './categories.schema';
import { news } from './news.schema';

export const newsCategories = pgTable(
  'news_categories',
  {
    newsId: uuid('news_id')
      .notNull()
      .references(() => news.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'news_categories_pk',
      columns: [table.newsId, table.categoryId],
    }),
    index('news_categories_category_idx').on(table.categoryId),
  ],
);
