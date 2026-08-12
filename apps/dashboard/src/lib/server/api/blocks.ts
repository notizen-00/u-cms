import type { RequestEvent } from '@sveltejs/kit';
import type { BlockCompatibility, BlockDefinition, SiteCompatibilityReport } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

/**
 * Blocks available while editing this site — core blocks plus whatever its
 * active theme and plugins contribute (docs/theme_aware_prd.md §10). The
 * builder's block picker is built from this rather than a hardcoded list,
 * which is what lets a new theme add blocks without touching builder code.
 */
export function listSiteBlocks(
	event: MinimalEvent,
	siteId: string
): Promise<BlockDefinition[]> {
	return apiFetch<BlockDefinition[]>(event, `/sites/${siteId}/blocks`);
}

/**
 * Checks a page's block types against a theme the site is *considering*
 * switching to, so the admin can be warned before the switch rather than
 * discovering broken sections afterwards (PRD §11, §25).
 */
export function checkBlockCompatibility(
	event: MinimalEvent,
	siteId: string,
	themeId: string,
	types: string[]
): Promise<BlockCompatibility[]> {
	return apiFetch<BlockCompatibility[]>(event, `/sites/${siteId}/blocks/compatibility`, {
		method: 'POST',
		body: { themeId, types }
	});
}

/**
 * Scans every page of the site against a candidate theme (PRD §25) — shown
 * before a theme switch is confirmed, so losing sections is a decision rather
 * than a surprise.
 */
export function scanSiteCompatibility(
	event: MinimalEvent,
	siteId: string,
	themeId: string
): Promise<SiteCompatibilityReport> {
	return apiFetch<SiteCompatibilityReport>(
		event,
		`/sites/${siteId}/blocks/compatibility/${encodeURIComponent(themeId)}`
	);
}
