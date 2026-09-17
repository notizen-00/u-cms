import type { Site } from '$lib/types';

/** The public URL is the domain configured during the one-time setup. */
export function siteVisitUrl(site: Pick<Site, 'domain'>): string {
	return `https://${site.domain}`;
}
