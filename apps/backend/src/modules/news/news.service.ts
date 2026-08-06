import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import {
  categories,
  news,
  newsCategories,
  newsTags,
  tags,
} from '../../database/schema';
import type { AuthenticatedUser } from '../auth/auth.service';
import { BuildProducer } from '../builder/queue/build.producer';
import type { CreateNewsDto } from './dto/create-news.dto';
import type { UpdateNewsDto } from './dto/update-news.dto';

type NewsRow = typeof news.$inferSelect;

type NewsCategory = Pick<
  typeof categories.$inferSelect,
  'id' | 'name' | 'slug' | 'parentId'
>;

type NewsTag = Pick<typeof tags.$inferSelect, 'id' | 'name' | 'slug'>;

@Injectable()
export class NewsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  async findAll(siteId: string) {
    const items = await this.db
      .select()
      .from(news)
      .where(eq(news.siteId, siteId));

    return this.attachTaxonomies(siteId, items);
  }

  async findOne(siteId: string, id: string) {
    const [item] = await this.db
      .select()
      .from(news)
      .where(and(eq(news.siteId, siteId), eq(news.id, id)))
      .limit(1);

    if (!item) {
      throw new NotFoundException('News not found');
    }

    const [result] = await this.attachTaxonomies(siteId, [item]);
    return result;
  }

  async create(siteId: string, author: AuthenticatedUser, dto: CreateNewsDto) {
    const { categoryIds, tagIds, ...newsData } = dto;

    await this.validateTaxonomies(siteId, categoryIds, tagIds);

    const created = await this.db.transaction(async (tx) => {
      const [item] = await tx
        .insert(news)
        .values({ siteId, authorId: author.id, ...newsData })
        .returning();

      if (categoryIds.length > 0) {
        await tx.insert(newsCategories).values(
          categoryIds.map((categoryId) => ({
            newsId: item.id,
            categoryId,
          })),
        );
      }

      if (tagIds.length > 0) {
        await tx.insert(newsTags).values(
          tagIds.map((tagId) => ({
            newsId: item.id,
            tagId,
          })),
        );
      }

      return item;
    });

    return this.findOne(siteId, created.id);
  }

  async update(siteId: string, id: string, dto: UpdateNewsDto) {
    await this.findOne(siteId, id);

    const { categoryIds, tagIds, ...newsData } = dto;

    await this.validateTaxonomies(
      siteId,
      categoryIds ?? [],
      tagIds ?? [],
      categoryIds !== undefined,
      tagIds !== undefined,
    );

    await this.db.transaction(async (tx) => {
      await tx
        .update(news)
        .set({ ...newsData, updatedAt: new Date() })
        .where(and(eq(news.siteId, siteId), eq(news.id, id)));

      if (categoryIds !== undefined) {
        await tx.delete(newsCategories).where(eq(newsCategories.newsId, id));
        if (categoryIds.length > 0) {
          await tx.insert(newsCategories).values(
            categoryIds.map((categoryId) => ({ newsId: id, categoryId })),
          );
        }
      }

      if (tagIds !== undefined) {
        await tx.delete(newsTags).where(eq(newsTags.newsId, id));
        if (tagIds.length > 0) {
          await tx
            .insert(newsTags)
            .values(tagIds.map((tagId) => ({ newsId: id, tagId })));
        }
      }
    });

    return this.findOne(siteId, id);
  }

  async remove(siteId: string, id: string) {
    await this.findOne(siteId, id);
    await this.db
      .delete(news)
      .where(and(eq(news.siteId, siteId), eq(news.id, id)));
    return { success: true };
  }

  async publish(siteId: string, id: string) {
    await this.findOne(siteId, id);
    await this.db
      .update(news)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(news.siteId, siteId), eq(news.id, id)));
    await this.buildProducer.enqueue(siteId);
    return this.findOne(siteId, id);
  }

  private async validateTaxonomies(
    siteId: string,
    categoryIds: string[],
    tagIds: string[],
    validateCategories = true,
    validateTags = true,
  ) {
    if (validateCategories && categoryIds.length > 0) {
      const foundCategories = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.siteId, siteId),
            inArray(categories.id, categoryIds),
          ),
        );

      if (foundCategories.length !== categoryIds.length) {
        const foundIds = new Set(foundCategories.map((item) => item.id));
        const missingIds = categoryIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Categories do not belong to this site or do not exist: ${missingIds.join(', ')}`,
        );
      }
    }

    if (validateTags && tagIds.length > 0) {
      const foundTags = await this.db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.siteId, siteId), inArray(tags.id, tagIds)));

      if (foundTags.length !== tagIds.length) {
        const foundIds = new Set(foundTags.map((item) => item.id));
        const missingIds = tagIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Tags do not belong to this site or do not exist: ${missingIds.join(', ')}`,
        );
      }
    }
  }

  private async attachTaxonomies(siteId: string, items: NewsRow[]) {
    if (items.length === 0) {
      return [];
    }

    const newsIds = items.map((item) => item.id);

    const categoryRows = await this.db
      .select({
        newsId: newsCategories.newsId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
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
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(newsTags)
      .innerJoin(tags, eq(newsTags.tagId, tags.id))
      .where(
        and(eq(tags.siteId, siteId), inArray(newsTags.newsId, newsIds)),
      );

    const categoriesByNews = new Map<string, NewsCategory[]>();
    for (const { newsId, ...category } of categoryRows) {
      const current = categoriesByNews.get(newsId) ?? [];
      current.push(category);
      categoriesByNews.set(newsId, current);
    }

    const tagsByNews = new Map<string, NewsTag[]>();
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
