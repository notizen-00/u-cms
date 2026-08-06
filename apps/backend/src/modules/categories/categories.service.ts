import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { categories } from '../../database/schema';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  findAll(siteId: string) {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.siteId, siteId))
      .orderBy(asc(categories.name));
  }

  async findOne(siteId: string, id: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.siteId, siteId), eq(categories.id, id)))
      .limit(1);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(siteId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.findOne(siteId, dto.parentId);
    }

    const [category] = await this.db
      .insert(categories)
      .values({ siteId, ...dto })
      .returning();

    return category;
  }

  async update(siteId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(siteId, id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.assertValidParent(siteId, id, dto.parentId);
    }

    const [updated] = await this.db
      .update(categories)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(categories.siteId, siteId), eq(categories.id, id)))
      .returning();

    return updated;
  }

  async remove(siteId: string, id: string) {
    await this.findOne(siteId, id);

    await this.db
      .delete(categories)
      .where(and(eq(categories.siteId, siteId), eq(categories.id, id)));

    return { success: true };
  }

  private async assertValidParent(
    siteId: string,
    categoryId: string,
    parentId: string,
  ) {
    if (categoryId === parentId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException('Category hierarchy cannot contain a cycle');
      }
      if (visited.has(currentId)) {
        throw new BadRequestException('Existing category hierarchy is invalid');
      }
      visited.add(currentId);

      const [current] = await this.db
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories)
        .where(
          and(eq(categories.siteId, siteId), eq(categories.id, currentId)),
        )
        .limit(1);

      if (!current) {
        throw new NotFoundException('Parent category not found');
      }

      currentId = current.parentId;
    }
  }
}
