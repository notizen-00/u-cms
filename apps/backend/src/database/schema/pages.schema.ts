import {
  AnyPgColumn,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { PageBlock } from '@unej-cms/sdk-content';
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
    /**
     * Structured block content (docs/theme_aware_prd.md §8) — the source of
     * truth for pages authored in the theme-aware builder.
     *
     * `bodyMarkdown` below stays as the rendered/back-compat form: every page
     * created before this column existed still has only that, and the static
     * site renderer still consumes it. A page is block-authored when `blocks`
     * is non-empty, which is how the two are told apart without a flag.
     */
    blocks: jsonb('blocks').$type<PageBlock[]>().notNull().default([]),
    /**
     * Snapshot of `blocks` as of the last "Publish" (docs/theme_aware_prd.md
     * §16) — what the static site build renders, kept deliberately separate
     * from the draft above so an in-progress edit in the Builder can never
     * leak into a rebuild triggered by something unrelated (e.g. a News item
     * being published). Preview renders the draft; production renders this.
     *
     * `bodyMarkdown` has no such split — its "save = live" behaviour predates
     * this column and stays exactly as it was, so no existing page's editing
     * workflow changes.
     */
    publishedBlocks: jsonb('published_blocks').$type<PageBlock[]>().notNull().default([]),
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
