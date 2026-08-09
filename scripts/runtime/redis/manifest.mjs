/**
 * Redis-compatible runtime sources (PRD §14 — a Redis-protocol-compatible
 * implementation is explicitly allowed, since BullMQ only needs the
 * protocol).
 *
 * Windows: no official Redis Windows build exists, so this uses
 * tporadowski/redis — the actively-referenced community port of the old
 * MSOpenTech build, real Redis 5.x source compiled for Win64, distributed as
 * GitHub Release assets (immutable once published). The checksum here was
 * computed by us from a verified download, since upstream doesn't publish
 * one itself — still a real pin: install() refuses any bytes that don't
 * match it, exactly as for the sources that do publish their own.
 *
 * Linux/macOS: the official redis.io source tarball, built locally via
 * `make` at install time. Both platforms ship a C toolchain on any real dev
 * machine (the target audience per PRD §3's Non-Goals — this isn't meant for
 * minimal containers), and Redis's build has zero external dependencies
 * beyond libc, so this stays as reliable as a prebuilt binary while only
 * trusting redis.io's own official checksum.
 */

export const REDIS_WINDOWS_VERSION = '5.0.14.1';
export const REDIS_SOURCE_VERSION = '7.4.2';

export const REDIS_WINDOWS_TARGET = {
	version: REDIS_WINDOWS_VERSION,
	url: `https://github.com/tporadowski/redis/releases/download/v${REDIS_WINDOWS_VERSION}/Redis-x64-${REDIS_WINDOWS_VERSION}.zip`,
	sha256: '018ea18a35876383cbb5f4cd0258adfc87747cf9d619bce1cf73a2e36f720ccf'
};

export const REDIS_SOURCE_TARGET = {
	version: REDIS_SOURCE_VERSION,
	url: `https://download.redis.io/releases/redis-${REDIS_SOURCE_VERSION}.tar.gz`,
	sha256: '4ddebbf09061cbb589011786febdb34f29767dd7f89dbe712d2b68e808af6a1f'
};

export function resolveRedisTarget(platformTarget) {
	return platformTarget === 'win32-x64' ? { ...REDIS_WINDOWS_TARGET, kind: 'prebuilt' } : { ...REDIS_SOURCE_TARGET, kind: 'source' };
}
