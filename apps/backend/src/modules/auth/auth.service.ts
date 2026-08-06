import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { AppConfigService } from '../../config/app-config.service';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { loginHistory, sessions, users } from '../../database/schema';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: AppConfigService,
  ) {}

  async login(email: string, password: string, meta: RequestMeta) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const passwordValid = user
      ? await argon2.verify(user.passwordHash, password).catch(() => false)
      : false;

    await this.db.insert(loginHistory).values({
      userId: user?.id ?? null,
      emailAttempted: email,
      ip: meta.ip,
      userAgent: meta.userAgent,
      success: passwordValid,
    });

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user, meta);
  }

  /**
   * Issues a session directly for an already-authenticated user, bypassing
   * password verification. Used to auto-login right after the setup wizard
   * creates the first super admin (WordPress-style: no separate login step
   * needed right after install).
   */
  async createSession(user: typeof users.$inferSelect, meta: RequestMeta) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.config.sessionTtlHours * 3600 * 1000,
    );

    await this.db.insert(sessions).values({
      userId: user.id,
      tokenHash: this.hashToken(token),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt,
    });

    return { token, expiresAt, user: this.toAuthenticatedUser(user) };
  }

  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    const [row] = await this.db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return row ? this.toAuthenticatedUser(row.user) : null;
  }

  async logout(token: string) {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, this.hashToken(token)));
  }

  listSessions(userId: string) {
    return this.db
      .select({
        id: sessions.id,
        userAgent: sessions.userAgent,
        ip: sessions.ip,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthenticatedUser(
    user: typeof users.$inferSelect,
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
