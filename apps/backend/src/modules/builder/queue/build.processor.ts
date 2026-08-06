import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { and, eq, inArray } from 'drizzle-orm';
import { PLUGIN_ID as FORM_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-form-builder';
import { AppConfigService } from '../../../config/app-config.service';
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import {
  builds,
  categories,
  forms,
  news,
  newsCategories,
  newsTags,
  pages,
  sitePlugins,
  sites,
  tags,
} from '../../../database/schema';
import { SITE_BUILDS_QUEUE } from '../builder.constants';
import { AtomicDeployService } from '../deploy/atomic-deploy.service';
import { EtaSiteRenderer } from '../render/eta-site-renderer';
import type { SiteBuildJobData } from './build.producer';

@Processor(SITE_BUILDS_QUEUE)
export class BuildProcessor extends WorkerHost {
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly renderer: EtaSiteRenderer,
    private readonly deploy: AtomicDeployService,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async process(job: Job<SiteBuildJobData>): Promise<void> {
    const { buildId, siteId } = job.data;
    this.logger.log(`Starting build ${buildId} for site ${siteId}`);

    await this.db
      .update(builds)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(builds.id, buildId));

    try {
      const [site] = await this.db
        .select()
        .from(sites)
        .where(eq(sites.id, siteId))
        .limit(1);
      if (!site) {
        throw new Error(`Site ${siteId} not found`);
      }

      const publishedNews = await this.db
        .select()
        .from(news)
        .where(and(eq(news.siteId, siteId), eq(news.status, 'published')));
      const publishedPages = await this.db
        .select()
        .from(pages)
        .where(and(eq(pages.siteId, siteId), eq(pages.status, 'published')));

      const newsWithTaxonomies = await this.attachTaxonomies(
        siteId,
        publishedNews,
      );
      const siteForms = await this.fetchActiveForms(siteId);

      const outputDir = await this.deploy.prepareReleaseDir(site.slug, buildId);
      await this.renderer.render(outputDir, {
        site: {
          id: site.id,
          name: site.name,
          slug: site.slug,
          logoUrl: site.logoUrl,
          faviconUrl: site.faviconUrl,
        },
        themeId: site.themeId,
        apiBaseUrl: this.config.apiPublicUrl,
        news: newsWithTaxonomies,
        pages: publishedPages,
        forms: siteForms,
      });

      const currentPath = await this.deploy.activate(site.slug, buildId);

      await this.db
        .update(builds)
        .set({
          status: 'success',
          finishedAt: new Date(),
          outputPath: currentPath,
        })
        .where(eq(builds.id, buildId));

      this.logger.log(`Build ${buildId} succeeded -> ${currentPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.db
        .update(builds)
        .set({ status: 'failed', finishedAt: new Date(), error: message })
        .where(eq(builds.id, buildId));
      this.logger.error(`Build ${buildId} failed: ${message}`);
      throw error;
    }
  }

  /**
   * Only returns forms when form-builder is active for this site — matches
   * PublicFormsController's own PluginActiveGuard check, so a deactivated
   * plugin consistently stops both rendering *and* accepting submissions
   * instead of leaving stale `cms-form` embeds live on a rebuilt site.
   */
  private async fetchActiveForms(siteId: string) {
    const [pluginRow] = await this.db
      .select({ isActive: sitePlugins.isActive })
      .from(sitePlugins)
      .where(
        and(
          eq(sitePlugins.siteId, siteId),
          eq(sitePlugins.pluginSlug, FORM_BUILDER_PLUGIN_ID),
        ),
      )
      .limit(1);

    if (!pluginRow?.isActive) {
      return [];
    }

    const rows = await this.db.select().from(forms).where(eq(forms.siteId, siteId));
    return rows.map((form) => ({
      id: form.id,
      title: form.title,
      fields: form.fields as {
        key: string;
        label: string;
        type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox';
        required?: boolean;
        placeholder?: string;
        options?: string;
      }[],
      submitLabel: form.submitLabel,
      successMessage: form.successMessage,
    }));
  }

  private async attachTaxonomies(
    siteId: string,
    items: Array<typeof news.$inferSelect>,
  ) {
    if (items.length === 0) {
      return [];
    }

    const newsIds = items.map((item) => item.id);

    const categoryRows = await this.db
      .select({
        newsId: newsCategories.newsId,
        name: categories.name,
        slug: categories.slug,
      })
      .from(newsCategories)
      .innerJoin(categories, eq(newsCategories.categoryId, categories.id))
      .where(
        and(
          eq(categories.siteId, siteId),
          inArray(newsCategories.newsId, newsIds),
        ),
      );

    const tagRows = await this.db
      .select({
        newsId: newsTags.newsId,
        name: tags.name,
        slug: tags.slug,
      })
      .from(newsTags)
      .innerJoin(tags, eq(newsTags.tagId, tags.id))
      .where(
        and(eq(tags.siteId, siteId), inArray(newsTags.newsId, newsIds)),
      );

    const categoriesByNews = new Map<
      string,
      Array<{ name: string; slug: string }>
    >();
    for (const { newsId, ...category } of categoryRows) {
      const current = categoriesByNews.get(newsId) ?? [];
      current.push(category);
      categoriesByNews.set(newsId, current);
    }

    const tagsByNews = new Map<
      string,
      Array<{ name: string; slug: string }>
    >();
    for (const { newsId, ...tag } of tagRows) {
      const current = tagsByNews.get(newsId) ?? [];
      current.push(tag);
      tagsByNews.set(newsId, current);
    }

    return items.map((item) => ({
      ...item,
      categories: categoriesByNews.get(item.id) ?? [],
      tags: tagsByNews.get(item.id) ?? [],
    }));
  }
}
