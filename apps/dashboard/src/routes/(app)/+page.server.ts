import type { PageServerLoad } from './$types';
import { listUsers } from '$lib/server/api/users';
import { listNews } from '$lib/server/api/news';
import { listPages } from '$lib/server/api/pages';

interface DraftSummary {
	id: string;
	title: string;
	kind: 'news' | 'pages';
	updatedAt: string;
}

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user!;
	// Reuse the layout's already-fetched sites/activeSiteId instead of re-deriving
	// them — there is no per-site role on AuthUser to derive from directly (see
	// $lib/permissions.ts), so the layout's GET /sites + active_site_id cookie
	// logic is the single source of truth.
	const { sites, activeSiteId } = await event.parent();

	if (user.isSuperAdmin) {
		const users = await listUsers(event);
		return {
			view: 'super_admin' as const,
			siteCount: sites.length,
			userCount: users.length
		};
	}

	if (!activeSiteId) {
		return { view: 'no_site' as const };
	}

	const [news, pages] = await Promise.all([listNews(event, activeSiteId), listPages(event, activeSiteId)]);

	const myDrafts: DraftSummary[] = [
		...news
			.filter((item) => item.authorId === user.id && item.status === 'draft')
			.map((item) => ({ id: item.id, title: item.title, kind: 'news' as const, updatedAt: item.updatedAt })),
		...pages
			.filter((item) => item.authorId === user.id && item.status === 'draft')
			.map((item) => ({ id: item.id, title: item.title, kind: 'pages' as const, updatedAt: item.updatedAt }))
	]
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
		.slice(0, 5);

	const publishedCount =
		news.filter((n) => n.status === 'published').length + pages.filter((p) => p.status === 'published').length;

	return {
		view: 'member' as const,
		activeSiteId,
		myDrafts,
		publishedCount
	};
};
