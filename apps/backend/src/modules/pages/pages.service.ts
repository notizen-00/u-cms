import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { pages } from '../../database/schema';
import { BuildProducer } from '../builder/queue/build.producer';
import type { CreatePageDto } from './dto/create-page.dto';
import type { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  findAll(siteId: string) {
    return this.db.select().from(pages).where(eq(pages.siteId, siteId));
  }

  async findOne(siteId: string, id: string) {
    const [item] = await this.db
      .select()
      .from(pages)
      .where(and(eq(pages.siteId, siteId), eq(pages.id, id)))
      .limit(1);
    if (!item) {
      throw new NotFoundException('Page not found');
    }
    return item;
  }

  async create(siteId: string, authorId: string, dto: CreatePageDto) {
    const [item] = await this.db
      .insert(pages)
      .values({ siteId, authorId, ...dto })
      .returning();
    return item;
  }

  async update(siteId: string, id: string, dto: UpdatePageDto) {
    await this.findOne(siteId, id);
    const [updated] = await this.db
      .update(pages)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(pages.siteId, siteId), eq(pages.id, id)))
      .returning();
    return updated;
  }

  async remove(siteId: string, id: string) {
    await this.findOne(siteId, id);
    await this.db
      .delete(pages)
      .where(and(eq(pages.siteId, siteId), eq(pages.id, id)));
    return { success: true };
  }

  async publish(siteId: string, id: string) {
    await this.findOne(siteId, id);
    const [updated] = await this.db
      .update(pages)
      .set({ status: 'published', updatedAt: new Date() })
      .where(and(eq(pages.siteId, siteId), eq(pages.id, id)))
      .returning();
    await this.buildProducer.enqueue(siteId);
    return updated;
  }

  /**
   * Snapshots the current draft `blocks` into `publishedBlocks`
   * (docs/theme_aware_prd.md §16) — the one action that lets Builder edits
   * reach the live site. Until this runs, however long editing takes, the
   * static build keeps rendering whatever was last published.
   */
  async publishBlocks(siteId: string, id: string) {
    const page = await this.findOne(siteId, id);
    const [updated] = await this.db
      .update(pages)
      .set({ publishedBlocks: page.blocks, status: 'published', updatedAt: new Date() })
      .where(and(eq(pages.siteId, siteId), eq(pages.id, id)))
      .returning();
    await this.buildProducer.enqueue(siteId);
    return updated;
  }
}
