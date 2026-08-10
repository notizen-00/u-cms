import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * Admin-managed overrides for a theme's catalog metadata — currently just its
 * screenshot. Themes themselves are code (workspace packages, see
 * modules/themes/theme-registry.ts), not database rows, so `themeId` is a
 * loose reference to a manifest id rather than a foreign key — same
 * reasoning as `sites.themeId`.
 */
export const themeOverrides = pgTable('theme_overrides', {
  themeId: varchar('theme_id', { length: 200 }).primaryKey(),
  screenshotUrl: text('screenshot_url'),
  screenshotObjectKey: varchar('screenshot_object_key', { length: 500 }),
  updatedById: uuid('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
