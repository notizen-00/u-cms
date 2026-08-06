import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import { userSiteRoles } from '../../../database/schema';

@Injectable()
export class SiteMemberGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }
    if (user.isSuperAdmin) {
      return true;
    }

    const siteId = String(request.params.siteId);
    const [assignment] = await this.db
      .select()
      .from(userSiteRoles)
      .where(
        and(
          eq(userSiteRoles.userId, user.id),
          eq(userSiteRoles.siteId, siteId),
        ),
      )
      .limit(1);

    if (!assignment) {
      throw new ForbiddenException('No access to this site');
    }
    return true;
  }
}
