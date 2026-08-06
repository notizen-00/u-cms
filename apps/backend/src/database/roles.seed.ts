import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { roles } from './schema';

export const FIXED_ROLES = [
  { slug: 'super_admin', name: 'Super Administrator' },
  { slug: 'site_admin', name: 'Site Administrator' },
  { slug: 'editor', name: 'Editor' },
  { slug: 'reviewer', name: 'Reviewer' },
  { slug: 'author', name: 'Author' },
] as const;

/** Idempotent: inserts only the fixed roles that don't already exist. */
export async function ensureFixedRoles(db: NodePgDatabase<any>): Promise<void> {
  for (const role of FIXED_ROLES) {
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.slug, role.slug))
      .limit(1);
    if (!existing) {
      await db.insert(roles).values(role);
    }
  }
}
