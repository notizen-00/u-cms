import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { previewTokens } from '../../database/schema';
import { AppConfigService } from '../../config/app-config.service';

/** Preview links are meant to be opened right away by the editor that asked for one. */
const DEFAULT_TTL_SECONDS = 15 * 60;

interface TokenPayload {
  readonly pageId: string;
  readonly siteId: string;
  /** Unique per issued token — what a revocation targets, since the signed payload alone can't be un-issued. */
  readonly jti: string;
  /** Unix seconds. */
  readonly exp: number;
}

/**
 * Mints and verifies preview tokens (docs/theme_aware_prd.md §23).
 *
 * A token is an HMAC over `{pageId, siteId, jti, exp}` — it authorises
 * previewing *one specific page* until it expires, and nothing else.
 * Deliberately not a session: it carries no user identity, so a shared
 * preview link can never be escalated into acting as the editor who created
 * it.
 *
 * Verification is two layers, cheapest first:
 *  1. Signature + shape + expiry — pure crypto, rejects malformed/forged/
 *     expired tokens without touching the database.
 *  2. A `preview_tokens` row for the token's `jti`, unrevoked and unexpired —
 *     what makes a *specific, already-issued* token revocable. A signature
 *     alone can only ever be "valid until it expires"; this is what lets one
 *     token be pulled before that.
 */
@Injectable()
export class PreviewTokenService {
  private readonly logger = new Logger(PreviewTokenService.name);
  private readonly secret: Buffer;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    config: AppConfigService,
  ) {
    const configured = config.previewTokenSecret;
    if (configured) {
      this.secret = Buffer.from(configured, 'utf-8');
    } else {
      // Secure by default rather than falling back to a guessable constant.
      // The trade-off is that outstanding preview links stop working after a
      // restart, which for a 15-minute editor-facing link is a fair price —
      // set PREVIEW_TOKEN_SECRET to keep them valid across restarts (and
      // across replicas, where per-process secrets would not agree).
      this.secret = randomBytes(32);
      this.logger.warn(
        'PREVIEW_TOKEN_SECRET is not set — using a per-process random secret. ' +
          'Preview links will stop working after a restart and will not validate across replicas.',
      );
    }
  }

  /** Records the token in `preview_tokens` so it can later be revoked individually — rotating `PREVIEW_TOKEN_SECRET` still revokes everything at once, as a coarser fallback. */
  async issue(siteId: string, pageId: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const payload: TokenPayload = {
      pageId,
      siteId,
      jti,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const body = base64url(JSON.stringify(payload));

    await this.db.insert(previewTokens).values({
      siteId,
      pageId,
      tokenHash: hashJti(jti),
      expiresAt,
    });

    return `${body}.${this.sign(body)}`;
  }

  /**
   * Returns the payload only for a token that is well-formed, correctly
   * signed, unexpired, issued for this exact page, AND not revoked. `null`
   * for anything else — callers must treat that as "no access", never as
   * "probably fine".
   */
  async verify(token: string, pageId: string): Promise<TokenPayload | null> {
    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;

    const body = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!this.signatureMatches(body, signature)) return null;

    let payload: TokenPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as TokenPayload;
    } catch {
      return null;
    }

    if (typeof payload?.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    // Checked even though the signature already covers it: a valid token for
    // *another* page must not preview this one.
    if (payload.pageId !== pageId) return null;
    if (typeof payload.jti !== 'string' || !payload.jti) return null;

    const [row] = await this.db
      .select({ revokedAt: previewTokens.revokedAt, expiresAt: previewTokens.expiresAt })
      .from(previewTokens)
      .where(eq(previewTokens.tokenHash, hashJti(payload.jti)))
      .limit(1);
    // No row at all means this jti was never issued by `issue()` — signature
    // and shape can't tell the two apart, only the database can.
    if (!row) return null;
    if (row.revokedAt !== null) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;

    return payload;
  }

  /**
   * Revokes every outstanding preview token for one page — the practical unit
   * of revocation, since the dashboard never exposes individual token ids to
   * an admin. Returns how many were actually revoked (0 if none were live).
   */
  async revokeAllForPage(siteId: string, pageId: string): Promise<number> {
    const revoked = await this.db
      .update(previewTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(previewTokens.siteId, siteId),
          eq(previewTokens.pageId, pageId),
          isNull(previewTokens.revokedAt),
        ),
      )
      .returning({ id: previewTokens.id });
    return revoked.length;
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  private signatureMatches(body: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(body), 'utf-8');
    const actual = Buffer.from(signature, 'utf-8');
    // Length must match before timingSafeEqual, which throws on a mismatch —
    // and comparing in constant time keeps the check from leaking the
    // signature one byte at a time.
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

/** `jti` is stored hashed, never raw — same convention as `sessions.tokenHash` (see auth.service.ts). */
function hashJti(jti: string): string {
  return createHash('sha256').update(jti).digest('hex');
}
