import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { roles, sites, userSiteRoles } from '../../database/schema';
import { BuildProducer } from '../builder/queue/build.producer';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { AssignMemberDto } from './dto/assign-member.dto';
import type { CreateSiteDto } from './dto/create-site.dto';
import type { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly buildProducer: BuildProducer,
  ) {}

  async create(dto: CreateSiteDto) {
    const [site] = await this.db.insert(sites).values(dto).returning();
    return site;
  }

  async findAllForUser(user: AuthenticatedUser) {
    if (user.isSuperAdmin) {
      return this.db.select().from(sites);
    }

    const assignments = await this.db
      .select({ siteId: userSiteRoles.siteId })
      .from(userSiteRoles)
      .where(eq(userSiteRoles.userId, user.id));
    const siteIds = assignments
      .map((a) => a.siteId)
      .filter((id): id is string => id !== null);
    if (siteIds.length === 0) {
      return [];
    }
    return this.db.select().from(sites).where(inArray(sites.id, siteIds));
  }

  async findOneForUser(id: string, user: AuthenticatedUser) {
    const site = await this.getOrThrow(id);
    if (user.isSuperAdmin) {
      return site;
    }

    const [assignment] = await this.db
      .select()
      .from(userSiteRoles)
      .where(
        and(eq(userSiteRoles.userId, user.id), eq(userSiteRoles.siteId, id)),
      )
      .limit(1);
    if (!assignment) {
      throw new ForbiddenException('No access to this site');
    }
    return site;
  }

  async update(id: string, dto: UpdateSiteDto, triggeredByUserId: string) {
    await this.getOrThrow(id);
    const [updated] = await this.db
      .update(sites)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();

    // name/logoUrl/faviconUrl are rendered straight into every page's
    // <head>/header/footer — rebuild immediately so the change is live
    // without waiting for an unrelated News/Page publish.
    await this.buildProducer.enqueue(id, triggeredByUserId);

    return updated;
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.db.delete(sites).where(eq(sites.id, id));
    return { success: true };
  }

  async addMember(siteId: string, dto: AssignMemberDto) {
    await this.getOrThrow(siteId);
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.slug, dto.roleSlug))
      .limit(1);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const [existing] = await this.db
      .select()
      .from(userSiteRoles)
      .where(
        and(
          eq(userSiteRoles.userId, dto.userId),
          eq(userSiteRoles.siteId, siteId),
          eq(userSiteRoles.roleId, role.id),
        ),
      )
      .limit(1);
    if (existing) {
      return existing;
    }

    const [assignment] = await this.db
      .insert(userSiteRoles)
      .values({ userId: dto.userId, siteId, roleId: role.id })
      .returning();
    return assignment;
  }

  async removeMember(siteId: string, userId: string) {
    await this.db
      .delete(userSiteRoles)
      .where(
        and(eq(userSiteRoles.siteId, siteId), eq(userSiteRoles.userId, userId)),
      );
    return { success: true };
  }

  private async getOrThrow(id: string) {
    const [site] = await this.db
      .select()
      .from(sites)
      .where(eq(sites.id, id))
      .limit(1);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }
}
