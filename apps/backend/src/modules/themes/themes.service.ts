import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PropertySchema } from '@unej-cms/sdk-ui';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { pages, sites, themeOverrides } from '../../database/schema';
import { MediaStorageService } from '../media/storage/media-storage.service';
import { BuildProducer } from '../builder/queue/build.producer';
import { PagesService } from '../pages/pages.service';
import { buildThemeHomepageBlocks, matchesThemeHomepage } from './homepage-blocks';
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
    private readonly pagesService: PagesService,
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
      .returning({ id: sites.id, themeId: sites.themeId, name: sites.name });

    if (!updated) {
      throw new NotFoundException('Site not found');
    }

    // Best-effort: a homepage-seeding failure (e.g. a pre-existing "beranda"
    // slug from unrelated manual page creation) shouldn't fail the theme
    // switch itself, which is the action the caller actually asked for.
    await this.ensureHomepage(updated.id, updated.name, themeId, triggeredByUserId).catch(
      (error: unknown) => {
        this.logger.warn(
          `Could not auto-create homepage for site ${updated.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    );

    // Applying a theme only changes how the static site is *rendered* — it
    // has no effect until the next build, so trigger one immediately instead
    // of leaving the live site on the old theme until an editor happens to
    // publish something.
    await this.buildProducer.enqueue(siteId, triggeredByUserId);

    return { id: updated.id, themeId: updated.themeId };
  }

  /**
   * Keeps the site's homepage in step with the theme
   * (docs/theme_aware_prd.md §19).
   *
   * Without a homepage Page, every renderer falls back to the theme's own
   * hardcoded "home" layout — fine as a default, but nothing on it is
   * editable through the Dashboard. Applying a theme materialises that theme's
   * declared starter homepage as a real, block-based Page instead, so what an
   * editor lands on already looks like the theme and every part of it can be
   * changed in the builder.
   *
   * On a *later* theme switch it rebuilds that homepage from the new theme —
   * but only while the page still holds an untouched starter layout. Once
   * someone has restructured it, their work outranks the new theme's defaults
   * and is left alone; the pre-switch compatibility report is what warns them
   * about any blocks the new theme cannot render.
   */
  private async ensureHomepage(
    siteId: string,
    siteName: string,
    themeId: string,
    authorId: string,
  ): Promise<void> {
    const theme = resolveTheme(themeId);
    const blocks = buildThemeHomepageBlocks(theme, siteName);
    // A theme that declares no starter homepage has nothing to seed or
    // refresh; its hardcoded `home` layout stays in charge.
    if (blocks.length === 0) return;

    const [existing] = await this.db
      .select({ id: pages.id, blocks: pages.blocks })
      .from(pages)
      .where(and(eq(pages.siteId, siteId), eq(pages.isHomepage, true)))
      .limit(1);

    if (!existing) {
      const created = await this.pagesService.create(siteId, authorId, {
        title: 'Beranda',
        slug: 'beranda',
        blocks,
        isHomepage: true,
      });
      // publishBlocks (not publish): also snapshots into `publishedBlocks`,
      // which is what the site build actually reads. "Applying a theme" is a
      // deliberate, complete admin action — not someone mid-edit — so there is
      // no draft-vs-published gap here to preserve; it goes live immediately.
      await this.pagesService.publishBlocks(siteId, created.id);
      return;
    }

    // Markdown-authored homepages predate the block builder — replacing their
    // content would destroy real work, so they are left as they are.
    if (!existing.blocks?.length) return;

    const stillStarter = THEME_CATALOG.some((candidate) =>
      matchesThemeHomepage(existing.blocks, resolveTheme(candidate.id)),
    );
    if (!stillStarter) return;

    await this.pagesService.update(siteId, existing.id, { blocks });
    await this.pagesService.publishBlocks(siteId, existing.id);
  }
}
