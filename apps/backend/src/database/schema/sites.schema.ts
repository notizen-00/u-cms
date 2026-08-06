import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  isActive: boolean('is_active').notNull().default(true),
  // References a CmsTheme manifest id from apps/backend's theme registry
  // (see modules/themes/theme-registry.ts) — not a foreign key, since themes
  // ship as code (workspace packages), not database rows.
  themeId: varchar('theme_id', { length: 200 })
    .notNull()
    .default('unej.theme-default'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
