import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { AppConfigService } from '../../config/app-config.service';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { ensureFixedRoles } from '../../database/roles.seed';
import { roles, sites, userSiteRoles, users } from '../../database/schema';
import { AuthService, type RequestMeta } from '../auth/auth.service';
import type { SetupInitDto } from './dto/setup-init.dto';

@Injectable()
export class SetupService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: AppConfigService,
    private readonly authService: AuthService,
  ) {}

  async getStatus(): Promise<{ needsSetup: boolean }> {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .limit(1);
    return { needsSetup: !existing };
  }

  async init(
    dto: SetupInitDto,
    setupToken: string | undefined,
    meta: RequestMeta,
  ) {
    if (this.config.setupToken && setupToken !== this.config.setupToken) {
      throw new ForbiddenException('Invalid setup token');
    }

    const { user, site } = await this.db.transaction(async (tx) => {
      // Re-check inside the transaction rather than trusting a prior
      // GET /setup/status call — otherwise two concurrent requests could
      // both pass the check and both create a super admin.
      const [existing] = await tx.select({ id: users.id }).from(users).limit(1);
      if (existing) {
        throw new ConflictException('Setup already completed');
      }

      await ensureFixedRoles(tx);

      const passwordHash = await argon2.hash(dto.admin.password);
      const [createdUser] = await tx
        .insert(users)
        .values({
          email: dto.admin.email.toLowerCase(),
          passwordHash,
          name: dto.admin.name,
          isSuperAdmin: true,
        })
        .returning();

      const [createdSite] = await tx
        .insert(sites)
        .values({
          slug: dto.site.slug,
          name: dto.site.name,
          domain: dto.site.domain,
        })
        .returning();

      const [superAdminRole] = await tx
        .select()
        .from(roles)
        .where(eq(roles.slug, 'super_admin'))
        .limit(1);
      await tx.insert(userSiteRoles).values({
        userId: createdUser.id,
        siteId: null,
        roleId: superAdminRole.id,
      });

      return { user: createdUser, site: createdSite };
    });

    const session = await this.authService.createSession(user, meta);
    return {
      user: session.user,
      site,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }
}
