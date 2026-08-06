import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sites } from './sites.schema';

// `fields` shape matches @unej-cms/plugin-form-builder's FormFieldConfig[]
// (key/label/type/required/placeholder/options) — kept as jsonb here rather
// than normalized columns since it's a small, form-author-controlled array,
// not something queried/filtered on.
export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  fields: jsonb('fields').notNull().default([]),
  submitLabel: varchar('submit_label', { length: 100 }).notNull().default('Kirim'),
  successMessage: text('success_message')
    .notNull()
    .default('Terima kasih, pesan Anda sudah terkirim.'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formSubmissions = pgTable('form_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  // Denormalized alongside formId so submissions survive query-ably even if
  // we ever need to bulk-inspect a site's submissions without a join.
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
