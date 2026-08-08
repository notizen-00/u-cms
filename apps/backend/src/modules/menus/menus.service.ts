import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { menuItems, menus, pages } from '../../database/schema';
import { BuildProducer } from '../builder/queue/build.producer';
import type { CreateMenuDto } from './dto/create-menu.dto';
import type { MenuItemInput } from './dto/replace-menu-items.dto';
import type { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  listForSite(siteId: string) {
    return this.db.select().from(menus).where(eq(menus.siteId, siteId)).orderBy(asc(menus.name));
  }

  async getWithItems(siteId: string, menuId: string) {
    const menu = await this.getOrThrow(siteId, menuId);
    const rows = await this.db
      .select()
      .from(menuItems)
      .where(eq(menuItems.menuId, menuId))
      .orderBy(asc(menuItems.order));

    return { ...menu, items: buildTree(rows, null) };
  }

  async create(siteId: string, dto: CreateMenuDto, triggeredByUserId: string) {
    const [created] = await this.db
      .insert(menus)
      .values({ siteId, name: dto.name, locationId: dto.locationId ?? null })
      .returning();

    // A newly-created menu only affects the live site once it's assigned to
    // a location — harmless (if slightly wasteful) to always rebuild, and
    // it keeps this in lockstep with update/remove/replaceItems below
    // instead of special-casing "does this change actually render anything."
    await this.buildProducer.enqueue(siteId, triggeredByUserId);
    return created;
  }

  async update(siteId: string, menuId: string, dto: UpdateMenuDto, triggeredByUserId: string) {
    await this.getOrThrow(siteId, menuId);

    const [updated] = await this.db
      .update(menus)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(menus.id, menuId), eq(menus.siteId, siteId)))
      .returning();

    await this.buildProducer.enqueue(siteId, triggeredByUserId);
    return updated;
  }

  async remove(siteId: string, menuId: string, triggeredByUserId: string) {
    await this.getOrThrow(siteId, menuId);
    await this.db.delete(menus).where(and(eq(menus.id, menuId), eq(menus.siteId, siteId)));
    await this.buildProducer.enqueue(siteId, triggeredByUserId);
    return { success: true };
  }

  async replaceItems(siteId: string, menuId: string, items: MenuItemInput[], triggeredByUserId: string) {
    await this.getOrThrow(siteId, menuId);
    await this.assertPagesBelongToSite(siteId, items);

    await this.db.transaction(async (tx) => {
      await tx.delete(menuItems).where(eq(menuItems.menuId, menuId));

      const resolvedIds = new Map<string, string>();
      const remaining = new Map(items.map((item) => [item.tempId, item]));

      while (remaining.size > 0) {
        const batch = [...remaining.values()].filter(
          (item) => item.parentTempId === null || resolvedIds.has(item.parentTempId),
        );
        if (batch.length === 0) {
          throw new BadRequestException('Struktur menu tidak valid (induk tidak ditemukan atau siklus).');
        }

        for (const item of batch) {
          const [row] = await tx
            .insert(menuItems)
            .values({
              menuId,
              parentId: item.parentTempId ? (resolvedIds.get(item.parentTempId) ?? null) : null,
              order: item.order,
              type: item.type,
              label: item.label,
              pageId: item.type === 'page' ? (item.pageId ?? null) : null,
              url: item.type === 'custom' ? (item.url ?? null) : null,
              newTab: item.newTab ?? false,
            })
            .returning({ id: menuItems.id });

          resolvedIds.set(item.tempId, row.id);
          remaining.delete(item.tempId);
        }
      }
    });

    await this.buildProducer.enqueue(siteId, triggeredByUserId);
    return this.getWithItems(siteId, menuId);
  }

  private async getOrThrow(siteId: string, menuId: string) {
    const [menu] = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.id, menuId), eq(menus.siteId, siteId)))
      .limit(1);
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    return menu;
  }

  private async assertPagesBelongToSite(siteId: string, items: MenuItemInput[]) {
    const pageIds = [...new Set(items.filter((i) => i.type === 'page' && i.pageId).map((i) => i.pageId as string))];
    if (pageIds.length === 0) return;

    const found = await this.db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.siteId, siteId), inArray(pages.id, pageIds)));
    if (found.length !== pageIds.length) {
      throw new BadRequestException('Salah satu halaman yang dipilih tidak ditemukan di site ini.');
    }
  }
}

export interface MenuItemRow {
  id: string;
  parentId: string | null;
  order: number;
  type: 'page' | 'custom';
  label: string;
  pageId: string | null;
  url: string | null;
  newTab: boolean;
}

function buildTree(rows: MenuItemRow[], parentId: string | null): (MenuItemRow & { children: unknown[] })[] {
  return rows
    .filter((row) => row.parentId === parentId)
    .map((row) => ({ ...row, children: buildTree(rows, row.id) }));
}
