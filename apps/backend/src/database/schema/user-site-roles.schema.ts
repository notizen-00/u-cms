import { pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { sites } from './sites.schema';
import { users } from './users.schema';

export const userSiteRoles = pgTable(
  'user_site_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null siteId = global scope (e.g. super_admin)
    siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('user_site_roles_unique').on(
      table.userId,
      table.siteId,
      table.roleId,
    ),
  ],
);
