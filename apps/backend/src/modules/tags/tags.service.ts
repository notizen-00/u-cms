import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { newsTags, tags } from '../../database/schema';
import type { CreateTagDto } from './dto/create-tag.dto';
import type { MergeTagDto } from './dto/merge-tag.dto';
import type { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  findAll(siteId: string) {
    return this.db
      .select()
      .from(tags)
      .where(eq(tags.siteId, siteId))
      .orderBy(asc(tags.name));
  }

  async findOne(siteId: string, id: string) {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.siteId, siteId), eq(tags.id, id)))
      .limit(1);

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async create(siteId: string, dto: CreateTagDto) {
    const [tag] = await this.db
      .insert(tags)
      .values({ siteId, ...dto })
      .returning();

    return tag;
  }

  async update(siteId: string, id: string, dto: UpdateTagDto) {
    await this.findOne(siteId, id);

    const [updated] = await this.db
      .update(tags)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(tags.siteId, siteId), eq(tags.id, id)))
      .returning();

    return updated;
  }

  async remove(siteId: string, id: string) {
    await this.findOne(siteId, id);

    await this.db
      .delete(tags)
      .where(and(eq(tags.siteId, siteId), eq(tags.id, id)));

    return { success: true };
  }

  async merge(siteId: string, sourceTagId: string, dto: MergeTagDto) {
    if (sourceTagId === dto.targetTagId) {
      throw new BadRequestException('Source and target tag must be different');
    }

    await this.findOne(siteId, sourceTagId);
    await this.findOne(siteId, dto.targetTagId);

    await this.db.transaction(async (tx) => {
      const sourceRelations = await tx
        .select({ newsId: newsTags.newsId })
        .from(newsTags)
        .where(eq(newsTags.tagId, sourceTagId));

      if (sourceRelations.length > 0) {
        await tx
          .insert(newsTags)
          .values(
            sourceRelations.map(({ newsId }) => ({
              newsId,
              tagId: dto.targetTagId,
            })),
          )
          .onConflictDoNothing();
      }

      await tx.delete(tags).where(eq(tags.id, sourceTagId));
    });

    return this.findOne(siteId, dto.targetTagId);
  }
}
