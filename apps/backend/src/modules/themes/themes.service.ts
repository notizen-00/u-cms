import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { sites } from '../../database/schema';
import { BuildProducer } from '../builder/queue/build.producer';
import { findThemeMetadata, THEME_CATALOG } from './theme-registry';

@Injectable()
export class ThemesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  listCatalog() {
    return THEME_CATALOG;
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
