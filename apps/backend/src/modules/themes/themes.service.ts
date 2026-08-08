import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PropertySchema } from '@unej-cms/sdk-ui';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { sites } from '../../database/schema';
import { BuildProducer } from '../builder/queue/build.producer';
import { validateThemeSettingsValues } from './property-schema-validator';
import { findThemeMetadata, resolveTheme, THEME_CATALOG } from './theme-registry';

/** Shape of the `sites.settings` jsonb column's theme-settings slice — namespaced per theme id so switching themes never drops another theme's saved overrides. */
interface SiteSettings {
  themeSettings?: Record<string, Record<string, unknown>>;
}

function mergeWithDefaults(
  schema: PropertySchema,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    if (overrides[key] !== undefined) {
      values[key] = overrides[key];
    } else if ('default' in field && field.default !== undefined) {
      values[key] = field.default;
    }
  }
  return values;
}

@Injectable()
export class ThemesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  listCatalog() {
    return THEME_CATALOG;
  }

  async getSettingsForSite(siteId: string) {
    const site = await this.findSiteOrThrow(siteId);
    const theme = resolveTheme(site.themeId);
    const schema: PropertySchema = theme.settings ?? {};
    const stored = (site.settings as SiteSettings)?.themeSettings?.[theme.manifest.id] ?? {};

    return {
      themeId: theme.manifest.id,
      schema,
      values: mergeWithDefaults(schema, stored),
    };
  }

  async updateSettingsForSite(siteId: string, rawValues: unknown, triggeredByUserId: string) {
    const site = await this.findSiteOrThrow(siteId);
    const theme = resolveTheme(site.themeId);
    const schema: PropertySchema = theme.settings ?? {};
    const values = validateThemeSettingsValues(schema, rawValues);

    const currentSettings = (site.settings as SiteSettings) ?? {};
    const nextSettings: SiteSettings = {
      ...currentSettings,
      themeSettings: {
        ...currentSettings.themeSettings,
        [theme.manifest.id]: values,
      },
    };

    await this.db
      .update(sites)
      .set({ settings: nextSettings, updatedAt: new Date() })
      .where(eq(sites.id, siteId));

    // Same reasoning as setForSite: settings only take effect on the next build.
    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return { themeId: theme.manifest.id, values: mergeWithDefaults(schema, values) };
  }

  private async findSiteOrThrow(siteId: string) {
    const [site] = await this.db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  async setForSite(siteId: string, themeId: string, triggeredByUserId: string) {
    if (!findThemeMetadata(themeId)) {
      throw new NotFoundException(`Theme "${themeId}" not found`);
    }

    const [updated] = await this.db
      .update(sites)
      .set({ themeId, updatedAt: new Date() })
      .where(eq(sites.id, siteId))
      .returning({ id: sites.id, themeId: sites.themeId });

    if (!updated) {
      throw new NotFoundException('Site not found');
    }

    // Applying a theme only changes how the static site is *rendered* — it
    // has no effect until the next build, so trigger one immediately instead
    // of leaving the live site on the old theme until an editor happens to
    // publish something.
    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return updated;
  }
}
