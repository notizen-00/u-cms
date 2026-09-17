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
import { BuildProducer } from '../builder/queue/build.producer';
import type { SetupInitDto } from './dto/setup-init.dto';

@Injectable()
export class SetupService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: AppConfigService,
    private readonly authService: AuthService,
    private readonly buildProducer: BuildProducer,
  ) {}

  async getStatus(): Promise<{ needsSetup: boolean }> {
    const [existingUser] = await this.db.select({ id: users.id }).from(users).limit(1);
    const [existingSite] = await this.db.select({ id: sites.id }).from(sites).limit(1);
    return { needsSetup: !existingUser || !existingSite };
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
      const [existingUser] = await tx.select({ id: users.id }).from(users).limit(1);
      const [existingSite] = await tx.select({ id: sites.id }).from(sites).limit(1);
      if (existingUser || existingSite) {
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
          // Slug remains an internal filesystem-safe identifier. The public
          // URL is always the configured domain, never /{slug}.
          slug: dto.site.domain.replace(/\./g, '-').slice(0, 100),
          name: dto.site.name,
          domain: dto.site.domain,
          isActive: true,
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
    await this.buildProducer.enqueue(site.id, user.id);
    return {
      user: session.user,
      site,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }
}
