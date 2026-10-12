import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';

import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { roles, userSiteRoles } from '../../database/schema';
import {
  REQUIRED_PERMISSIONS,
  type CmsPermission,
} from '../decorators/require-permissions.decorator';

const ROLE_PERMISSIONS: Record<string, readonly CmsPermission[]> = {
  super_admin: [
    'content:read',
    'content:create',
    'content:update',
    'content:delete',
    'content:review',
    'content:publish',
    'content:schedule',
    'content:archive',
    'site:manage',
    'members:manage',
  ],

  site_admin: [
    'content:read',
    'content:create',
    'content:update',
    'content:delete',
    'content:review',
    'content:publish',
    'content:schedule',
    'content:archive',
    'site:manage',
    'members:manage',
  ],

  publisher: [
    'content:read',
    'content:review',
    'content:publish',
    'content:schedule',
    'content:archive',
  ],

  editor: [
    'content:read',
    'content:create',
    'content:update',
    'content:delete',
    'content:review',
  ],

  reviewer: [
    'content:read',
    'content:review',
  ],

  author: [
    'content:read',
    'content:create',
  ],

  contributor: [
    'content:read',
    'content:create',
  ],

  subscriber: [
    'content:read',
  ],
};

@Injectable()
export class SitePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<CmsPermission[]>(
        REQUIRED_PERMISSIONS,
        [context.getHandler(), context.getClass()],
      );

    // Route yang tidak menggunakan decorator ini tidak diubah.
    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User belum terautentikasi');
    }

    if (user.isSuperAdmin) {
      return true;
    }

    const siteId = request.params.siteId;

    if (!siteId) {
      throw new ForbiddenException('Site ID wajib tersedia');
    }

    const assignments = await this.db
      .select({
        slug: roles.slug,
      })
      .from(userSiteRoles)
      .innerJoin(roles, eq(userSiteRoles.roleId, roles.id))
      .where(
        and(
          eq(userSiteRoles.userId, user.id)
        ),
      );

    if (assignments.length === 0) {
      throw new ForbiddenException('Tidak memiliki akses ke website ini');
    }

    const granted = new Set<CmsPermission>();

    for (const assignment of assignments) {
      for (const permission of ROLE_PERMISSIONS[assignment.slug] ?? []) {
        granted.add(permission);
      }
    }

    const allowed = requiredPermissions.every((permission) =>
      granted.has(permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Kamu tidak memiliki permission untuk melakukan tindakan ini',
      );
    }

    return true;
  }
}