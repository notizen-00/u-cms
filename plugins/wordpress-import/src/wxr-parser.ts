import { XMLParser } from "fast-xml-parser";

/**
 * Mirrors apps/backend/src/database/schema/enums.ts's `contentStatusEnum`.
 * Duplicated (not imported) on purpose — this package must stay Runtime
 * Independent and never reach into apps/backend.
 */
export type ImportedContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived"
  | "trashed";

export interface ParsedCategory {
  readonly wpId: number;
  readonly name: string;
  readonly slug: string;
}

export interface ParsedTag {
  readonly wpId: number;
  readonly name: string;
  readonly slug: string;
}

export interface ParsedAttachment {
  readonly wpId: number;
  readonly guid: string;
  readonly title: string;
  readonly sourceUrl: string;
}

export interface ParsedPage {
  readonly wpId: number;
  readonly guid: string;
  readonly title: string;
  readonly slug: string;
  readonly status: ImportedContentStatus;
  readonly contentHtml: string;
  readonly publishedAt: Date | undefined;
  readonly parentWpId: number | undefined;
}

export interface ParsedPost {
  readonly wpId: number;
  readonly guid: string;
  readonly title: string;
  readonly slug: string;
  readonly status: ImportedContentStatus;
  readonly contentHtml: string;
  readonly excerptHtml: string | undefined;
  readonly publishedAt: Date | undefined;
  readonly categoryWpIds: readonly number[];
  readonly tagWpIds: readonly number[];
  readonly thumbnailWpId: number | undefined;
}

export interface ParsedWxrExport {
  readonly categories: readonly ParsedCategory[];
  readonly tags: readonly ParsedTag[];
  readonly attachments: readonly ParsedAttachment[];
  readonly pages: readonly ParsedPage[];
  readonly posts: readonly ParsedPost[];
}

export class WxrParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WxrParseError";
  }
}

const REPEATING_TAGS = new Set([
  "item",
  "category",
  "wp:category",
  "wp:tag",
  "wp:postmeta",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Kept off: titles/slugs/bodies must stay strings — a purely-numeric title
  // like "1945" would otherwise silently become the number 1945.
  parseTagValue: false,
  trimValues: true,
  isArray: (tagName) => REPEATING_TAGS.has(tagName),
});

/** A tag value is either a plain string or `{ "#text": ..., "@_attr": ... }` once it has attributes. */
function textOf(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

function ensureArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as readonly T[];
  return [value as T];
}

function toInt(value: unknown): number | undefined {
  const n = Number.parseInt(textOf(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** WordPress writes `0` for "no parent" and `0000-00-00 00:00:00` for an unset date — both mean "absent". */
function parseWpDate(value: unknown): Date | undefined {
  const raw = textOf(value).trim();
  if (!raw || raw.startsWith("0000-00-00")) return undefined;
  const date = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const STATUS_MAP: Record<string, ImportedContentStatus> = {
  publish: "published",
  draft: "draft",
  pending: "in_review",
  future: "scheduled",
  // No "private" concept here — default to draft so nothing gets built/published unintentionally.
  private: "draft",
  trash: "trashed",
};

function mapStatus(wpStatus: string): ImportedContentStatus {
  return STATUS_MAP[wpStatus] ?? "draft";
}

interface WxrItem {
  readonly title?: unknown;
  readonly guid?: unknown;
  readonly "content:encoded"?: unknown;
  readonly "excerpt:encoded"?: unknown;
  readonly category?: readonly unknown[];
  readonly "wp:post_id"?: unknown;
  readonly "wp:post_name"?: unknown;
  readonly "wp:post_date_gmt"?: unknown;
  readonly "wp:post_date"?: unknown;
  readonly "wp:status"?: unknown;
  readonly "wp:post_parent"?: unknown;
  readonly "wp:post_type"?: unknown;
  readonly "wp:attachment_url"?: unknown;
  readonly "wp:postmeta"?: readonly unknown[];
}

interface CategoryRef {
  readonly domain: string;
  readonly nicename: string;
}

function categoryRefsOf(item: WxrItem): readonly CategoryRef[] {
  return ensureArray(item.category).map((node) => {
    const attrs = (node ?? {}) as Record<string, unknown>;
    return {
      domain: String(attrs["@_domain"] ?? ""),
      nicename: String(attrs["@_nicename"] ?? ""),
    };
  });
}

function thumbnailWpIdOf(item: WxrItem): number | undefined {
  for (const meta of ensureArray(item["wp:postmeta"])) {
    const entry = (meta ?? {}) as Record<string, unknown>;
    if (textOf(entry["wp:meta_key"]) === "_thumbnail_id") {
      return toInt(entry["wp:meta_value"]);
    }
  }
  return undefined;
}

/**
 * Parses a WordPress WXR (`.xml`) export into the shapes the importer needs.
 * Pure and framework-independent — no DB/network access happens here.
 * Unknown `wp:post_type`s (nav_menu_item, revision, custom types, ...) and
 * `auto-draft` stub posts are silently dropped, matching the five tables
 * (`media`/`news`/`pages`/`categories`/`tags`) this CMS actually has
 * provenance columns for.
 */
export function parseWxr(xml: string): ParsedWxrExport {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml, true);
  } catch (error) {
    throw new WxrParseError(`Could not parse WXR XML: ${error instanceof Error ? error.message : String(error)}`);
  }

  const channel = (parsed as { rss?: { channel?: unknown } })?.rss?.channel as
    | Record<string, unknown>
    | undefined;
  if (!channel) {
    throw new WxrParseError('Not a WordPress WXR export — missing "rss.channel".');
  }

  const categories: ParsedCategory[] = ensureArray(channel["wp:category"]).flatMap((node) => {
    const c = node as Record<string, unknown>;
    const wpId = toInt(c["wp:term_id"]);
    const slug = textOf(c["wp:category_nicename"]);
    if (wpId === undefined || !slug) return [];
    return [{ wpId, slug, name: textOf(c["wp:cat_name"]) || slug }];
  });

  const tags: ParsedTag[] = ensureArray(channel["wp:tag"]).flatMap((node) => {
    const t = node as Record<string, unknown>;
    const wpId = toInt(t["wp:term_id"]);
    const slug = textOf(t["wp:tag_slug"]);
    if (wpId === undefined || !slug) return [];
    return [{ wpId, slug, name: textOf(t["wp:tag_name"]) || slug }];
  });

  const categoryWpIdBySlug = new Map(categories.map((c) => [c.slug, c.wpId]));
  const tagWpIdBySlug = new Map(tags.map((t) => [t.slug, t.wpId]));

  const items = ensureArray(channel.item) as readonly WxrItem[];

  const attachments: ParsedAttachment[] = [];
  const pages: ParsedPage[] = [];
  const posts: ParsedPost[] = [];

  for (const item of items) {
    const postType = textOf(item["wp:post_type"]);
    const wpId = toInt(item["wp:post_id"]);
    if (wpId === undefined) continue;

    const wpStatus = textOf(item["wp:status"]);
    if (wpStatus === "auto-draft") continue;

    const guid = textOf(item.guid);
    const title = textOf(item.title);

    if (postType === "attachment") {
      const sourceUrl = textOf(item["wp:attachment_url"]) || guid;
      if (!sourceUrl) continue;
      attachments.push({ wpId, guid, title, sourceUrl });
      continue;
    }

    if (postType === "page") {
      const parentWpId = toInt(item["wp:post_parent"]);
      pages.push({
        wpId,
        guid,
        title,
        slug: textOf(item["wp:post_name"]) || `page-${wpId}`,
        status: mapStatus(wpStatus),
        contentHtml: textOf(item["content:encoded"]),
        publishedAt: parseWpDate(item["wp:post_date_gmt"] ?? item["wp:post_date"]),
        parentWpId: parentWpId && parentWpId > 0 ? parentWpId : undefined,
      });
      continue;
    }

    if (postType === "post") {
      const refs = categoryRefsOf(item);
      const categoryWpIds = refs
        .filter((ref) => ref.domain === "category")
        .map((ref) => categoryWpIdBySlug.get(ref.nicename))
        .filter((id): id is number => id !== undefined);
      const tagWpIds = refs
        .filter((ref) => ref.domain === "post_tag")
        .map((ref) => tagWpIdBySlug.get(ref.nicename))
        .filter((id): id is number => id !== undefined);

      const excerptHtml = textOf(item["excerpt:encoded"]);
      posts.push({
        wpId,
        guid,
        title,
        slug: textOf(item["wp:post_name"]) || `post-${wpId}`,
        status: mapStatus(wpStatus),
        contentHtml: textOf(item["content:encoded"]),
        excerptHtml: excerptHtml || undefined,
        publishedAt: parseWpDate(item["wp:post_date_gmt"] ?? item["wp:post_date"]),
        categoryWpIds,
        tagWpIds,
        thumbnailWpId: thumbnailWpIdOf(item),
      });
    }
    // Any other post_type (nav_menu_item, revision, custom types, ...) is out of scope — skipped.
  }

  return { categories, tags, attachments, pages, posts };
}
