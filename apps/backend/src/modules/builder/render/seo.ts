import type { SiteRenderSite } from './site-renderer.types';

/** Per-page SEO fields every theme's outer "layout" template renders into `<head>`. */
export interface PageSeo {
  description: string;
  keywords: string;
  /** Absolute URL, or `null` when the site has no configured domain (no canonical tag is emitted rather than a spec-invalid relative one). */
  canonicalUrl: string | null;
  /** Absolute URL, or `null` if the site has no logo to fall back to for `og:image`/`twitter:image`. */
  ogImage: string | null;
}

const DEFAULT_DESCRIPTION_LENGTH = 155;

/** First value that's a non-empty string — e.g. picking whichever of a few differently-named theme settings (`heroTagline`, `heroDescription`, ...) a given theme actually declares. */
export function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

/** Strips markdown/HTML syntax down to plain text, for deriving a meta description from body content that has no explicit excerpt. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateDescription(text: string, max = DEFAULT_DESCRIPTION_LENGTH): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Resolves a page's meta description: an explicit excerpt/tagline first, else
 * derived from the page's own body content, else a generic fallback — so
 * every page always has a real, non-empty description (Lighthouse's SEO
 * audit fails outright on a missing/empty one).
 */
export function buildDescription(
  explicit: string | null | undefined,
  fallbackMarkdown: string | undefined,
  siteName: string,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) return truncateDescription(trimmed);

  const fromBody = fallbackMarkdown ? stripMarkdown(fallbackMarkdown) : '';
  if (fromBody) return truncateDescription(fromBody);

  return `Situs resmi ${siteName}.`;
}

/** Merges a base (site-wide, admin-configured) keyword list with page-specific extras (e.g. news categories/tags), deduping case-insensitively while preserving original casing. */
export function buildKeywords(...parts: Array<string | readonly string[] | null | undefined>): string {
  const seen = new Map<string, string>();
  for (const part of parts) {
    const items = Array.isArray(part) ? part : typeof part === 'string' ? part.split(',') : [];
    for (const raw of items) {
      const keyword = raw.trim();
      if (!keyword) continue;
      const key = keyword.toLowerCase();
      if (!seen.has(key)) seen.set(key, keyword);
    }
  }
  return [...seen.values()].join(', ');
}

/** `null` when the site has no configured domain — a relative URL isn't valid for `rel=canonical`/`og:url`, so the tag is omitted rather than emitting something spec-invalid. */
export function absoluteUrl(site: SiteRenderSite, path: string): string | null {
  if (!site.domain) return null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `https://${site.domain}${normalizedPath}`;
}

export function buildPageSeo(
  site: SiteRenderSite,
  path: string,
  options: {
    explicitDescription?: string | null;
    fallbackMarkdown?: string;
    baseKeywords?: string;
    extraKeywords?: readonly string[];
  },
): PageSeo {
  return {
    description: buildDescription(options.explicitDescription, options.fallbackMarkdown, site.name),
    keywords: buildKeywords(options.baseKeywords, options.extraKeywords, site.name),
    canonicalUrl: absoluteUrl(site, path),
    ogImage: site.logoUrl ?? null,
  };
}
