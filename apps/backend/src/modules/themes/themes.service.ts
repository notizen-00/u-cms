import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PropertySchema } from '@unej-cms/sdk-ui';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { sites, themeOverrides } from '../../database/schema';
import { MediaStorageService } from '../media/storage/media-storage.service';
import { BuildProducer } from '../builder/queue/build.producer';
import { validateThemeSettingsValues } from './property-schema-validator';
import {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  MAX_SCREENSHOT_SIZE_BYTES,
} from './theme-screenshot.constants';
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
  private readonly logger = new Logger(ThemesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
    private readonly storage: MediaStorageService,
  ) {}

  /** Merges each theme's admin-uploaded screenshot (if any) on top of its code-defined manifest. */
  async listCatalog() {
    const overrides = await this.db.select().from(themeOverrides);
    const screenshotByThemeId = new Map(
      overrides.filter((o) => o.screenshotUrl).map((o) => [o.themeId, o.screenshotUrl!]),
    );

    return THEME_CATALOG.map((theme) => {
      const screenshot = screenshotByThemeId.get(theme.id);
      return screenshot ? { ...theme, screenshot } : theme;
    });
  }

  async setScreenshot(themeId: string, file: Express.Multer.File, uploadedById: string) {
    if (!findThemeMetadata(themeId)) {
      throw new NotFoundException(`Theme "${themeId}" not found`);
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_SCREENSHOT_MIME_TYPES.includes(file.mimetype as never)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds maximum size of ${MAX_SCREENSHOT_SIZE_BYTES} bytes`,
      );
    }

    const previous = await this.findOverride(themeId);

    const objectKey = this.storage.buildThemeScreenshotKey(themeId, file.originalname);
    await this.storage.upload(objectKey, file.buffer, file.mimetype);
    const url = this.storage.getPublicUrl(objectKey);

    await this.db
      .insert(themeOverrides)
      .values({ themeId, screenshotUrl: url, screenshotObjectKey: objectKey, updatedById: uploadedById })
      .onConflictDoUpdate({
        target: themeOverrides.themeId,
        set: { screenshotUrl: url, screenshotObjectKey: objectKey, updatedById: uploadedById, updatedAt: new Date() },
      });

    if (previous?.screenshotObjectKey) {
      await this.storage.remove(previous.screenshotObjectKey).catch((error: unknown) => {
        this.logger.warn(
          `Could not remove replaced theme screenshot "${previous.screenshotObjectKey}": ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    return { themeId, screenshotUrl: url };
  }

  async removeScreenshot(themeId: string) {
    if (!findThemeMetadata(themeId)) {
      throw new NotFoundException(`Theme "${themeId}" not found`);
    }

    const previous = await this.findOverride(themeId);
    if (!previous?.screenshotUrl) {
      return { themeId, screenshotUrl: null };
    }

    if (previous.screenshotObjectKey) {
      await this.storage.remove(previous.screenshotObjectKey).catch((error: unknown) => {
        this.logger.warn(
          `Could not remove theme screenshot "${previous.screenshotObjectKey}": ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    await this.db
      .update(themeOverrides)
      .set({ screenshotUrl: null, screenshotObjectKey: null, updatedAt: new Date() })
      .where(eq(themeOverrides.themeId, themeId));

    return { themeId, screenshotUrl: null };
  }

  private async findOverride(themeId: string) {
    const [override] = await this.db
      .select()
      .from(themeOverrides)
      .where(eq(themeOverrides.themeId, themeId))
      .limit(1);
    return override;
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
