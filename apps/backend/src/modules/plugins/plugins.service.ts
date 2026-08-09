import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PLUGIN_ID as FORM_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-form-builder';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { forms, sitePlugins } from '../../database/schema';
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
        isInstalled: Boolean(row),
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

    const [updated] = await this.db
      .update(sitePlugins)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(sitePlugins.siteId, siteId), eq(sitePlugins.pluginSlug, slug)),
      )
      .returning({ id: sitePlugins.id });

    if (!updated) {
      throw new NotFoundException(
        `Plugin "${slug}" is not installed for this site`,
      );
    }

    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return this.findOneForSite(siteId, slug);
  }

  async uninstall(siteId: string, slug: string, triggeredByUserId: string) {
    this.assertPluginExists(slug);

    await this.db.transaction(async (tx) => {
      const [installation] = await tx
        .select({ isActive: sitePlugins.isActive })
        .from(sitePlugins)
        .where(
          and(eq(sitePlugins.siteId, siteId), eq(sitePlugins.pluginSlug, slug)),
        )
        .limit(1)
        .for('update');

      if (!installation) {
        throw new NotFoundException(
          `Plugin "${slug}" is not installed for this site`,
        );
      }
      if (installation.isActive) {
        throw new ConflictException(
          `Plugin "${slug}" must be deactivated before uninstalling`,
        );
      }

      // Plugin packages remain in the official server catalog; uninstalling
      // removes only this site's installation and plugin-owned data.
      // form_submissions follow through their ON DELETE CASCADE FK to forms.
      if (slug === FORM_BUILDER_PLUGIN_ID) {
        await tx.delete(forms).where(eq(forms.siteId, siteId));
      }

      await tx
        .delete(sitePlugins)
        .where(
          and(eq(sitePlugins.siteId, siteId), eq(sitePlugins.pluginSlug, slug)),
        );
    });

    // Queue only after the cleanup transaction commits, so a new build cannot
    // observe a half-uninstalled plugin.
    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return { success: true };
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
      isInstalled: Boolean(row),
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
