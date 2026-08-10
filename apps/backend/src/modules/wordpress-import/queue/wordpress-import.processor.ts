import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { imageSize } from 'image-size';
import {
  parseWxr,
  htmlToMarkdown,
  type ParsedPage,
  type ParsedPost,
} from '@unej-cms/plugin-wordpress-import';
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import {
  categories,
  media,
  news,
  newsCategories,
  newsTags,
  pages,
  tags,
  wordpressImports,
} from '../../../database/schema';
import { ALLOWED_MIME_TYPES } from '../../media/media.constants';
import { MediaStorageService } from '../../media/storage/media-storage.service';
import { WORDPRESS_IMPORT_QUEUE } from '../wordpress-import.constants';
import type { WordpressImportJobData } from './wordpress-import.producer';

interface ImportStats {
  categoriesImported: number;
  tagsImported: number;
  mediaImported: number;
  mediaFailed: number;
  pagesImported: number;
  newsImported: number;
  errors: string[];
}

const FETCH_TIMEOUT_MS = 15_000;

const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

function guessMimeFromUrl(url: string): string | undefined {
  const ext = url.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();
  return ext ? EXTENSION_MIME_FALLBACK[ext] : undefined;
}

@Processor(WORDPRESS_IMPORT_QUEUE)
export class WordpressImportProcessor extends WorkerHost {
  private readonly logger = new Logger(WordpressImportProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: MediaStorageService,
  ) {
    super();
  }

  async process(job: Job<WordpressImportJobData>): Promise<void> {
    const { importId, siteId, objectKey, triggeredBy } = job.data;
    this.logger.log(`Starting WordPress import ${importId} for site ${siteId}`);

    await this.db
      .update(wordpressImports)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(wordpressImports.id, importId));

    const stats: ImportStats = {
      categoriesImported: 0,
      tagsImported: 0,
      mediaImported: 0,
      mediaFailed: 0,
      pagesImported: 0,
      newsImported: 0,
      errors: [],
    };

    try {
      const xml = (await this.storage.getObjectBuffer(objectKey)).toString('utf-8');
      const parsed = parseWxr(xml);

      const categoryIdByWpId = await this.upsertCategories(siteId, parsed.categories, stats);
      const tagIdByWpId = await this.upsertTags(siteId, parsed.tags, stats);
      const mediaByWpId = await this.importAttachments(siteId, triggeredBy, parsed.attachments, stats);
      await this.importPages(siteId, triggeredBy, parsed.pages, stats);
      await this.importPosts(
        siteId,
        triggeredBy,
        parsed.posts,
        categoryIdByWpId,
        tagIdByWpId,
        mediaByWpId,
        stats,
      );

      await this.db
        .update(wordpressImports)
        .set({ status: 'success', finishedAt: new Date(), stats })
        .where(eq(wordpressImports.id, importId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.db
        .update(wordpressImports)
        .set({ status: 'failed', finishedAt: new Date(), error: message, stats })
        .where(eq(wordpressImports.id, importId));
      throw error;
    } finally {
      await this.storage.remove(objectKey).catch((cleanupError: unknown) => {
        this.logger.warn(
          `Could not remove temp WXR object "${objectKey}": ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        );
      });
    }
  }

  /** Re-importing the same category twice reuses the existing row instead of overwriting an admin's edits — see plan §"Upsert categories". */
  private async upsertCategories(
    siteId: string,
    parsedCategories: readonly { wpId: number; name: string; slug: string }[],
    stats: ImportStats,
  ): Promise<Map<number, string>> {
    const idByWpId = new Map<number, string>();
    for (const category of parsedCategories) {
      const [existing] = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.siteId, siteId), eq(categories.wpId, category.wpId)))
        .limit(1);
      if (existing) {
        idByWpId.set(category.wpId, existing.id);
        continue;
      }
      const [created] = await this.db
        .insert(categories)
        .values({ siteId, name: category.name, slug: category.slug, wpId: category.wpId })
        .returning();
      idByWpId.set(category.wpId, created.id);
      stats.categoriesImported += 1;
    }
    return idByWpId;
  }

  private async upsertTags(
    siteId: string,
    parsedTags: readonly { wpId: number; name: string; slug: string }[],
    stats: ImportStats,
  ): Promise<Map<number, string>> {
    const idByWpId = new Map<number, string>();
    for (const tag of parsedTags) {
      const [existing] = await this.db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.siteId, siteId), eq(tags.wpId, tag.wpId)))
        .limit(1);
      if (existing) {
        idByWpId.set(tag.wpId, existing.id);
        continue;
      }
      const [created] = await this.db
        .insert(tags)
        .values({ siteId, name: tag.name, slug: tag.slug, wpId: tag.wpId })
        .returning();
      idByWpId.set(tag.wpId, created.id);
      stats.tagsImported += 1;
    }
    return idByWpId;
  }

  private async importAttachments(
    siteId: string,
    uploadedById: string,
    attachments: readonly { wpId: number; guid: string; title: string; sourceUrl: string }[],
    stats: ImportStats,
  ): Promise<Map<number, { id: string; url: string }>> {
    const mediaByWpId = new Map<number, { id: string; url: string }>();

    for (const attachment of attachments) {
      const [existing] = await this.db
        .select({ id: media.id, url: media.url })
        .from(media)
        .where(and(eq(media.siteId, siteId), eq(media.wpId, attachment.wpId)))
        .limit(1);
      if (existing) {
        mediaByWpId.set(attachment.wpId, existing);
        continue;
      }

      try {
        const { buffer, mimeType } = await this.downloadAttachment(attachment.sourceUrl);

        const objectKey = this.storage.buildObjectKey(siteId, attachment.title || attachment.sourceUrl);
        await this.storage.upload(objectKey, buffer, mimeType);
        const url = this.storage.getPublicUrl(objectKey);

        let width: number | undefined;
        let height: number | undefined;
        if (mimeType.startsWith('image/')) {
          try {
            const dimensions = imageSize(buffer);
            width = dimensions.width;
            height = dimensions.height;
          } catch {
            // Dimensions are a nice-to-have, same tolerance as MediaService.upload.
          }
        }

        const [created] = await this.db
          .insert(media)
          .values({
            siteId,
            uploadedById,
            objectKey,
            originalName: attachment.title || attachment.sourceUrl.split('/').pop() || 'attachment',
            mimeType,
            size: buffer.byteLength,
            url,
            width,
            height,
            wpId: attachment.wpId,
            wpGuid: attachment.guid,
          })
          .returning();

        mediaByWpId.set(attachment.wpId, { id: created.id, url });
        stats.mediaImported += 1;
      } catch (error) {
        stats.mediaFailed += 1;
        const message = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Attachment ${attachment.sourceUrl}: ${message}`);
      }
    }

    return mediaByWpId;
  }

  private async downloadAttachment(sourceUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(sourceUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].trim() ||
        guessMimeFromUrl(sourceUrl) ||
        '';
      if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
        throw new Error(`Unsupported or undetectable file type ("${mimeType || 'unknown'}")`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return { buffer, mimeType };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Inserts every page first with `parentId` left null, then a second pass
   * resolves `parentWpId` — a WXR export can list a child page before its
   * parent, so this avoids needing a topological sort.
   */
  private async importPages(
    siteId: string,
    authorId: string,
    parsedPages: readonly ParsedPage[],
    stats: ImportStats,
  ): Promise<void> {
    const idByWpId = new Map<number, string>();

    for (const page of parsedPages) {
      const [existing] = await this.db
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.siteId, siteId), eq(pages.wpId, page.wpId)))
        .limit(1);
      if (existing) {
        idByWpId.set(page.wpId, existing.id);
        continue;
      }

      const [created] = await this.db
        .insert(pages)
        .values({
          siteId,
          authorId,
          title: page.title,
          slug: page.slug,
          bodyMarkdown: htmlToMarkdown(page.contentHtml),
          status: page.status,
          wpId: page.wpId,
          wpGuid: page.guid,
        })
        .returning();
      idByWpId.set(page.wpId, created.id);
      stats.pagesImported += 1;
    }

    for (const page of parsedPages) {
      if (!page.parentWpId) continue;
      const pageId = idByWpId.get(page.wpId);
      const parentId = idByWpId.get(page.parentWpId);
      if (!pageId || !parentId) continue;
      await this.db.update(pages).set({ parentId }).where(eq(pages.id, pageId));
    }
  }

  private async importPosts(
    siteId: string,
    authorId: string,
    parsedPosts: readonly ParsedPost[],
    categoryIdByWpId: Map<number, string>,
    tagIdByWpId: Map<number, string>,
    mediaByWpId: Map<number, { id: string; url: string }>,
    stats: ImportStats,
  ): Promise<void> {
    for (const post of parsedPosts) {
      const [existing] = await this.db
        .select({ id: news.id })
        .from(news)
        .where(and(eq(news.siteId, siteId), eq(news.wpId, post.wpId)))
        .limit(1);
      if (existing) continue;

      const featuredImageUrl =
        post.thumbnailWpId !== undefined ? mediaByWpId.get(post.thumbnailWpId)?.url : undefined;

      const [created] = await this.db
        .insert(news)
        .values({
          siteId,
          authorId,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerptHtml ? htmlToMarkdown(post.excerptHtml) : undefined,
          bodyMarkdown: htmlToMarkdown(post.contentHtml),
          status: post.status,
          featuredImageUrl,
          publishedAt: post.publishedAt,
          wpId: post.wpId,
          wpGuid: post.guid,
        })
        .returning();

      const categoryRows = post.categoryWpIds
        .map((wpId) => categoryIdByWpId.get(wpId))
        .filter((id): id is string => id !== undefined)
        .map((categoryId) => ({ newsId: created.id, categoryId }));
      if (categoryRows.length > 0) {
        await this.db.insert(newsCategories).values(categoryRows);
      }

      const tagRows = post.tagWpIds
        .map((wpId) => tagIdByWpId.get(wpId))
        .filter((id): id is string => id !== undefined)
        .map((tagId) => ({ newsId: created.id, tagId }));
      if (tagRows.length > 0) {
        await this.db.insert(newsTags).values(tagRows);
      }

      stats.newsImported += 1;
    }
  }
}
