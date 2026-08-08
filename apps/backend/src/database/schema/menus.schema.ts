import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { pages } from './pages.schema';
import { sites } from './sites.schema';

export const menuItemTypeEnum = pgEnum('menu_item_type', ['page', 'custom']);

export const menus = pgTable(
  'menus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    // A theme-declared MenuLocationID (see @unej-cms/sdk-theme's
    // MenuLocationDefinition, e.g. "primary"/"footer") this menu renders
    // into. Null = unassigned/draft menu. Multiple menus may share a
    // location — the renderer concatenates all of them (in creation order)
    // into that location's nav, so editors can split a big menu into several
    // manageable ones without losing items off a "one menu per slot" limit.
    locationId: varchar('location_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('menus_site_location_idx').on(table.siteId, table.locationId),
  ],
);

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => menuItems.id, {
      onDelete: 'set null',
    }),
    order: integer('order').notNull().default(0),
    type: menuItemTypeEnum('type').notNull().default('custom'),
    // Display text — editable independently of the linked page's own title,
    // same as WordPress's "Navigation Label".
    label: varchar('label', { length: 255 }).notNull(),
    pageId: uuid('page_id').references(() => pages.id, { onDelete: 'set null' }),
    url: text('url'),
    newTab: boolean('new_tab').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('menu_items_menu_idx').on(table.menuId),
    index('menu_items_menu_parent_idx').on(table.menuId, table.parentId),
  ],
);
