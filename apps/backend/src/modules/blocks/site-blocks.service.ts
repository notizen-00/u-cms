import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { CmsPlugin } from '@unej-cms/sdk-plugin';
import { collectBlockTypes } from '@unej-cms/sdk-content';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { pages, sitePlugins, sites } from '../../database/schema';
import { resolvePluginImplementations } from '../plugins/plugin-registry';
import { BlockRegistryService, type BlockCompatibility } from './block-registry.service';
import { toBlockDto, type BlockDto } from './block.dto';

/** One page that would lose sections under a candidate theme. */
export interface PageCompatibility {
  readonly pageId: string;
  readonly title: string;
  readonly slug: string;
  readonly isHomepage: boolean;
  readonly unsupported: readonly BlockCompatibility[];
}

/** Site-wide result of the pre-switch scan (docs/theme_aware_prd.md §25). */
export interface SiteCompatibilityReport {
  readonly themeId: string;
  readonly scanned: number;
  readonly compatible: number;
  readonly affected: readonly PageCompatibility[];
}

/**
 * Resolves the block catalog *for a specific site* — which needs its active
 * theme and its active plugins from the database. Kept separate from
 * `BlockRegistryService` so that service stays pure and trivially testable.
 */
@Injectable()
export class SiteBlocksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly registry: BlockRegistryService,
  ) {}

  /** Blocks the builder may offer while editing this site's pages. */
  async listForSite(siteId: string): Promise<readonly BlockDto[]> {
    const { themeId, plugins } = await this.resolveContext(siteId);
    return this.registry.listForTheme(themeId, plugins).map(toBlockDto);
  }

  /**
   * Checks block types against a theme the site is *considering* switching to,
   * which is why `themeId` is a parameter rather than read from the site
   * (docs/theme_aware_prd.md §11) — the whole point is to warn before the
   * switch, while the site still has its old theme.
   */
  async checkCompatibility(
    siteId: string,
    themeId: string,
    types: readonly string[],
  ): Promise<readonly BlockCompatibility[]> {
    const { plugins } = await this.resolveContext(siteId);
    return this.registry.checkCompatibility(themeId, types, plugins);
  }

  /**
   * Scans every page of a site against a candidate theme
   * (docs/theme_aware_prd.md §25) — the report an admin sees *before*
   * switching, so unsupported sections are a known trade-off rather than a
   * surprise discovered on the live site afterwards.
   *
   * Pages with no structured blocks are counted as compatible: their content
   * is Markdown, which every theme renders.
   */
  async scanSite(siteId: string, themeId: string): Promise<SiteCompatibilityReport> {
    const { plugins } = await this.resolveContext(siteId);
    const sitePages = await this.db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        blocks: pages.blocks,
        isHomepage: pages.isHomepage,
      })
      .from(pages)
      .where(eq(pages.siteId, siteId));

    const affected: PageCompatibility[] = [];
    for (const page of sitePages) {
      const types = collectBlockTypes(page.blocks ?? []);
      if (types.length === 0) continue;

      const unsupported = this.registry
        .checkCompatibility(themeId, types, plugins)
        .filter((entry) => !entry.supported);
      if (unsupported.length === 0) continue;

      affected.push({
        pageId: page.id,
        title: page.title,
        slug: page.slug,
        isHomepage: page.isHomepage,
        unsupported,
      });
    }

    return {
      themeId,
      scanned: sitePages.length,
      compatible: sitePages.length - affected.length,
      affected,
    };
  }

  private async resolveContext(
    siteId: string,
  ): Promise<{ themeId: string; plugins: readonly CmsPlugin[] }> {
    const [site] = await this.db
      .select({ themeId: sites.themeId })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const rows = await this.db
      .select({ slug: sitePlugins.pluginSlug })
      .from(sitePlugins)
      .where(and(eq(sitePlugins.siteId, siteId), eq(sitePlugins.isActive, true)));

    return {
      themeId: site.themeId,
      plugins: resolvePluginImplementations(rows.map((row) => row.slug)),
    };
  }
}
