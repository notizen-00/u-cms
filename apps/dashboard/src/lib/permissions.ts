import type { AuthUser, Site } from './types';

/**
 * UI-only permission hints per PRD §10 — these hide actions that would 403,
 * they are never the source of truth. Every server action still trusts the
 * backend's own 401/403 response.
 *
 * `GET /auth/me` exposes no per-site role, and there is no endpoint that does
 * (see AuthUser in $lib/types.ts) — so the only client-knowable signal is
 * *membership* (whether the site appears in `GET /sites`, which the backend
 * already filters to accessible sites). We cannot tell `site_admin` apart from
 * `editor`/`reviewer`/`author` here; `canManageSite` is therefore best-effort —
 * it shows the same as `isSiteMember`, and the real `site_admin`-only gate is
 * still enforced by the backend's `SiteAdminGuard` on `PATCH /sites/:id`.
 */

export function isSiteMember(user: AuthUser | null, sites: Pick<Site, 'id'>[], siteId: string): boolean {
	if (!user) return false;
	if (user.isSuperAdmin) return true;
	return sites.some((site) => site.id === siteId);
}

/** Best-effort: shows the Edit Site action to any site member (see module doc). */
export function canManageSite(user: AuthUser | null, sites: Pick<Site, 'id'>[], siteId: string): boolean {
	return isSiteMember(user, sites, siteId);
}

export function canDeleteSite(user: AuthUser | null): boolean {
	return !!user?.isSuperAdmin;
}

export function canCreateSite(user: AuthUser | null): boolean {
	return !!user?.isSuperAdmin;
}

/** Assign/remove site members — super_admin only in Phase 1 (backend gap #4). */
export function canManageMembers(user: AuthUser | null): boolean {
	return !!user?.isSuperAdmin;
}

export function canManageUsers(user: AuthUser | null): boolean {
	return !!user?.isSuperAdmin;
}

/** Theme screenshots are a platform-level catalog concern, not tied to any one site — super_admin only, matching the backend's SuperAdminGuard on the upload/remove routes. */
export function canManageThemes(user: AuthUser | null): boolean {
	return !!user?.isSuperAdmin;
}
