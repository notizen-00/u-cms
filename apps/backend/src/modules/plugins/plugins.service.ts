import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { sitePlugins } from '../../database/schema';
import { BuildProducer } from '../builder/queue/build.producer';
import { findPluginDefinition, PLUGIN_REGISTRY } from './plugin-registry';

@Injectable()
export class PluginsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  listCatalog() {
    return PLUGIN_REGISTRY;
  }

  async listForSite(siteId: string) {
    const rows = await this.db
      .select()
      .from(sitePlugins)
      .where(eq(sitePlugins.siteId, siteId));

    const bySlug = new Map(rows.map((row) => [row.pluginSlug, row]));

    return PLUGIN_REGISTRY.map((definition) => {
      const row = bySlug.get(definition.slug);
      return {
        ...definition,
        isActive: row?.isActive ?? false,
        activatedAt: row?.activatedAt ?? null,
        deactivatedAt: row?.deactivatedAt ?? null,
      };
    });
  }

  async activate(siteId: string, slug: string, triggeredByUserId: string) {
    this.assertPluginExists(slug);

    await this.db
      .insert(sitePlugins)
      .values({ siteId, pluginSlug: slug, isActive: true })
      .onConflictDoUpdate({
        target: [sitePlugins.siteId, sitePlugins.pluginSlug],
        set: {
          isActive: true,
          activatedAt: new Date(),
          deactivatedAt: null,
          updatedAt: new Date(),
        },
      });

    // Activating a plugin can change what gets rendered into the static
    // site (once a plugin injects content/blocks into a build) — trigger a
    // rebuild immediately rather than waiting for an unrelated publish.
    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return this.findOneForSite(siteId, slug);
  }

  async deactivate(siteId: string, slug: string, triggeredByUserId: string) {
    this.assertPluginExists(slug);

    await this.db
      .insert(sitePlugins)
      .values({
        siteId,
        pluginSlug: slug,
        isActive: false,
        deactivatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [sitePlugins.siteId, sitePlugins.pluginSlug],
        set: {
          isActive: false,
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return this.findOneForSite(siteId, slug);
  }

  private async findOneForSite(siteId: string, slug: string) {
    const definition = findPluginDefinition(slug);
    if (!definition) {
      throw new NotFoundException('Plugin not found');
    }

    const [row] = await this.db
      .select()
      .from(sitePlugins)
      .where(
        and(eq(sitePlugins.siteId, siteId), eq(sitePlugins.pluginSlug, slug)),
      )
      .limit(1);

    return {
      ...definition,
      isActive: row?.isActive ?? false,
      activatedAt: row?.activatedAt ?? null,
      deactivatedAt: row?.deactivatedAt ?? null,
    };
  }

  private assertPluginExists(slug: string) {
    if (!findPluginDefinition(slug)) {
      throw new NotFoundException(`Plugin "${slug}" not found`);
    }
  }
}
