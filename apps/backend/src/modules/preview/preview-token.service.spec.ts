import type { AppConfigService } from '../../config/app-config.service';
import type { DrizzleDb } from '../../database/database.types';
import { PreviewTokenService } from './preview-token.service';

const SITE = 'site-1';
const PAGE = 'page-1';

interface FakeRow {
  siteId: string;
  pageId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * A real in-memory table, not canned per-call responses — `verify()`'s whole
 * point is reacting correctly to what `issue()` actually persisted (and what
 * `revokeAllForPage()` actually changed), so the fake has to behave like a
 * table for that to mean anything.
 *
 * The service's select filters `where(eq(tokenHash, hashJti(jti)))`, which
 * this fake doesn't parse (that would mean interpreting Drizzle's internal SQL
 * AST — its shape isn't a stable thing to depend on in a test). It returns
 * every row instead. That's a real simplification, but a safe one here: every
 * test below issues at most one token before verifying it, so "every row" and
 * "the one row this query means" are always the same set.
 */
function createDb() {
  const rows: FakeRow[] = [];

  const db = {
    insert: () => ({
      values: async (row: Omit<FakeRow, 'revokedAt'>) => {
        rows.push({ ...row, revokedAt: null });
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
    update: () => ({
      set: (patch: Partial<FakeRow>) => ({
        where: () => ({
          returning: async () => {
            const targets = rows.filter(
              (row) => row.siteId === SITE && row.pageId === PAGE && row.revokedAt === null,
            );
            for (const row of targets) Object.assign(row, patch);
            return targets.map(() => ({ id: 'x' }));
          },
        }),
      }),
    }),
  };

  return { db: db as unknown as DrizzleDb, rows };
}

function makeService(db: DrizzleDb, secret?: string): PreviewTokenService {
  return new PreviewTokenService(db, { previewTokenSecret: secret } as AppConfigService);
}

describe('PreviewTokenService', () => {
  it('round-trips a token for the page it was issued for', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');

    const token = await service.issue(SITE, PAGE);
    await expect(service.verify(token, PAGE)).resolves.toMatchObject({ siteId: SITE, pageId: PAGE });
  });

  it('rejects a token issued for a different page', async () => {
    // The signature is valid, but it authorises another page — this is the
    // check that stops one preview link from becoming a key to every page.
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');

    const token = await service.issue(SITE, 'another-page');
    await expect(service.verify(token, PAGE)).resolves.toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');
    const token = await service.issue(SITE, PAGE);
    const [body, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ siteId: SITE, pageId: PAGE, jti: 'forged', exp: 4102444800 }),
      'utf-8',
    ).toString('base64url');

    expect(forged).not.toBe(body);
    await expect(service.verify(`${forged}.${signature}`, PAGE)).resolves.toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');
    const other = makeService(db, 'a-different-secret-16-chars');

    await expect(service.verify(await other.issue(SITE, PAGE), PAGE)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');

    const token = await service.issue(SITE, PAGE, -1);
    await expect(service.verify(token, PAGE)).resolves.toBeNull();
  });

  it('rejects malformed input instead of throwing', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');

    for (const value of ['', 'nonsense', 'a.b.c', '.', 'onlybody.']) {
      await expect(service.verify(value, PAGE)).resolves.toBeNull();
    }
  });

  it('rejects a jti the database has no record of', async () => {
    // A well-formed, correctly-signed token whose row was never inserted (or
    // was deleted) — the database, not the signature, is the source of truth
    // for "does this token still exist".
    const { db, rows } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');
    const token = await service.issue(SITE, PAGE);
    rows.length = 0;

    await expect(service.verify(token, PAGE)).resolves.toBeNull();
  });

  it('rejects a revoked token even though it has not expired', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');
    const token = await service.issue(SITE, PAGE);

    const revoked = await service.revokeAllForPage(SITE, PAGE);

    expect(revoked).toBe(1);
    await expect(service.verify(token, PAGE)).resolves.toBeNull();
  });

  it('revoking one page does not affect a token issued for another', async () => {
    const { db } = createDb();
    const service = makeService(db, 'a-test-secret-at-least-16-chars');
    const otherPageToken = await service.issue(SITE, 'another-page');

    await service.revokeAllForPage(SITE, PAGE);

    await expect(service.verify(otherPageToken, 'another-page')).resolves.not.toBeNull();
  });

  it('falls back to a per-process secret when none is configured', async () => {
    // Two instances stand in for two processes/replicas: each gets its own
    // random secret, so a token from one must not validate on the other.
    const { db: dbA } = createDb();
    const { db: dbB } = createDb();
    const first = makeService(dbA);
    const second = makeService(dbB);

    const token = await first.issue(SITE, PAGE);
    await expect(first.verify(token, PAGE)).resolves.not.toBeNull();
    await expect(second.verify(token, PAGE)).resolves.toBeNull();
  });
});
