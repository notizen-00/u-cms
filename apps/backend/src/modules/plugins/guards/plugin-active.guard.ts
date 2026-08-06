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
import { DRIZZLE } from '../../../database/database.module';
import type { DrizzleDb } from '../../../database/database.types';
import { sitePlugins } from '../../../database/schema';
import { REQUIRE_PLUGIN_KEY } from '../decorators/require-plugin.decorator';

@Injectable()
export class PluginActiveGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const slug = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_PLUGIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!slug) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const siteId = String(request.params.siteId);

    const [activation] = await this.db
      .select({ isActive: sitePlugins.isActive })
      .from(sitePlugins)
      .where(
        and(eq(sitePlugins.siteId, siteId), eq(sitePlugins.pluginSlug, slug)),
      )
      .limit(1);

    if (!activation?.isActive) {
      throw new ForbiddenException(
        `Plugin "${slug}" is not active for this site`,
      );
    }
    return true;
  }
}
