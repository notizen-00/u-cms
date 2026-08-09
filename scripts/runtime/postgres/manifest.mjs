/**
 * Pinned PostgreSQL 17.5.0 binaries — built by EDB's official Windows/Linux/
 * macOS toolchain and republished by the `io.zonky.test.postgres` project
 * (MIT, actively maintained, used by thousands of Java projects for exactly
 * this "real Postgres binary for embedded/test use" purpose) via Maven
 * Central. Maven Central artifacts are immutable once published, so a pinned
 * URL+checksum pair here stays valid for as long as this manifest lists it.
 *
 * Each archive is a ZIP containing one `postgres-<platform>.txz` — the inner
 * filename is discovered at extract time rather than hardcoded here, since
 * it's an implementation detail of the packaging, not part of what needs
 * pinning for security.
 *
 * Checksums fetched and independently verified against a real download on
 * 2026-08-09 (see `docs/native_prd.md` implementation notes) — re-verify
 * before bumping the version.
 */

export const POSTGRES_VERSION = '17.5.0';

const GROUP_PATH = 'io/zonky/test/postgres';

function mavenUrl(artifact, version) {
	return `https://repo1.maven.org/maven2/${GROUP_PATH}/${artifact}/${version}/${artifact}-${version}.jar`;
}

/** Maps our canonical `platform-arch` key to zonky's own artifact suffix. */
export const POSTGRES_TARGETS = {
	'win32-x64': {
		artifact: 'embedded-postgres-binaries-windows-amd64',
		sha256: '06ced3b3267c569ffb3f85544aac0075926dd81bf78bd5247abb1aa9fe994d6b'
	},
	'linux-x64': {
		artifact: 'embedded-postgres-binaries-linux-amd64',
		sha256: '646f3269075d1a23904127374e3cdbcef96beb32979fedee25d835877400fcbe'
	},
	'linux-arm64': {
		artifact: 'embedded-postgres-binaries-linux-arm64v8',
		sha256: 'e02f27ff50ff2d90b6541d54f3f108505aacd84ea53c2890e976a684bfea2752'
	},
	'darwin-x64': {
		artifact: 'embedded-postgres-binaries-darwin-amd64',
		sha256: 'fb70f783928e77c3d6ef5ca8ed644f1ac502f740fcfc032a375c8347820f2bdd'
	},
	'darwin-arm64': {
		artifact: 'embedded-postgres-binaries-darwin-arm64v8',
		sha256: 'e9d3398e10c2ec926395498b03e75ad1a24eeaed82895e756a7e173b202cf6de'
	}
};

export function resolvePostgresTarget(platformTarget) {
	const entry = POSTGRES_TARGETS[platformTarget];
	if (!entry) return null;
	return { ...entry, version: POSTGRES_VERSION, url: mavenUrl(entry.artifact, POSTGRES_VERSION) };
}
