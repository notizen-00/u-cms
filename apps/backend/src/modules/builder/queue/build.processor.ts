import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { PLUGIN_ID as FORM_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-form-builder';
import { AppConfigService } from '../../../config/app-config.service';
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import {
  builds,
  categories,
  forms,
  menuItems,
  menus,
  news,
  newsCategories,
  newsTags,
  pages,
  sitePlugins,
  sites,
  tags,
} from '../../../database/schema';
import { resolveThemeRenderKind } from '../../themes/theme-registry';
import { SITE_BUILDS_QUEUE } from '../builder.constants';
import { AtomicDeployService } from '../deploy/atomic-deploy.service';
import { EtaSiteRenderer } from '../render/eta-site-renderer';
import type { SiteRenderer, SiteRenderMenuItem } from '../render/site-renderer.types';
import { SvelteSiteRenderer } from '../render/svelte-site-renderer';
import type { SiteBuildJobData } from './build.producer';

@Processor(SITE_BUILDS_QUEUE)
export class BuildProcessor extends WorkerHost {
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly etaRenderer: EtaSiteRenderer,
    private readonly svelteRenderer: SvelteSiteRenderer,
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
      const menusByLocation = await this.buildMenus(siteId, publishedPages);

      const outputDir = await this.deploy.prepareReleaseDir(site.slug, buildId);
      const renderer: SiteRenderer =
        resolveThemeRenderKind(site.themeId) === 'svelte' ? this.svelteRenderer : this.etaRenderer;
      await renderer.render(outputDir, {
        site: {
          id: site.id,
          name: site.name,
          slug: site.slug,
          logoUrl: site.logoUrl,
          faviconUrl: site.faviconUrl,
          domain: site.domain,
        },
        themeId: site.themeId,
        themeSettings:
          (site.settings as { themeSettings?: Record<string, Record<string, unknown>> } | null)
            ?.themeSettings?.[site.themeId] ?? {},
        menus: menusByLocation,
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

  /**
   * Resolves each of the site's location-assigned menus into a nav tree
   * keyed by theme location id (see modules/menus/). Only menus assigned to
   * a location render anywhere — an unassigned menu is just a saved draft.
   * More than one menu can share a location (editors split a big nav into
   * several menus); their item trees are concatenated in creation order.
   */
  private async buildMenus(
    siteId: string,
    publishedPages: Array<typeof pages.$inferSelect>,
  ): Promise<Record<string, SiteRenderMenuItem[]>> {
    const assignedMenus = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.siteId, siteId), isNotNull(menus.locationId)))
      .orderBy(asc(menus.createdAt));
    if (assignedMenus.length === 0) {
      return {};
    }

    const menuIds = assignedMenus.map((menu) => menu.id);
    const items = await this.db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.menuId, menuIds))
      .orderBy(asc(menuItems.order));

    const itemsByMenu = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByMenu.get(item.menuId) ?? [];
      list.push(item);
      itemsByMenu.set(item.menuId, list);
    }

    const pagesById = new Map(publishedPages.map((page) => [page.id, page]));

    const result: Record<string, SiteRenderMenuItem[]> = {};
    for (const menu of assignedMenus) {
      const locationId = menu.locationId as string;
      const tree = buildMenuTree(itemsByMenu.get(menu.id) ?? [], null, pagesById);
      result[locationId] = [...(result[locationId] ?? []), ...tree];
    }
    return result;
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

function buildMenuTree(
  rows: Array<typeof menuItems.$inferSelect>,
  parentId: string | null,
  pagesById: Map<string, { slug: string; isHomepage: boolean }>,
): SiteRenderMenuItem[] {
  const nodes: SiteRenderMenuItem[] = [];

  for (const row of rows) {
    if (row.parentId !== parentId) continue;

    let url: string;
    if (row.type === 'page') {
      const page = row.pageId ? pagesById.get(row.pageId) : undefined;
      // Page unpublished/deleted since the menu was last saved — drop the
      // item rather than link to a 404, same as the cms-form embed handling.
      if (!page) continue;
      url = page.isHomepage ? '/' : `/${page.slug}/`;
    } else {
      url = row.url ?? '#';
    }

    nodes.push({
      label: row.label,
      url,
      newTab: row.newTab,
      clickable: row.clickable,
      children: buildMenuTree(rows, row.id, pagesById),
    });
  }

  return nodes;
}
