/**
 * Pinned MinIO RELEASE.2025-09-07T16-13-09Z — official single-binary builds,
 * downloaded from MinIO's own GitHub Releases (immutable once published).
 * Every platform below ships as one executable; no archive extraction step.
 *
 * Checksums fetched from MinIO's own published `.shasum` files and
 * cross-verified against a real download on 2026-08-09 — re-verify before
 * bumping the version.
 */

export const MINIO_RELEASE = 'RELEASE.2025-09-07T16-13-09Z';

const GITHUB_BASE = `https://github.com/minio/minio/releases/download/${MINIO_RELEASE}`;

/** Maps our canonical `platform-arch` key to MinIO's own release asset naming. */
export const MINIO_TARGETS = {
	'win32-x64': {
		url: `${GITHUB_BASE}/minio.windows-amd64.${MINIO_RELEASE}.exe`,
		sha256: 'af709e6ba68488404e85acdd22a3030d0f5e56a108d4b27d744f18ceb50861b4'
	},
	'linux-x64': {
		url: `${GITHUB_BASE}/minio.linux-amd64.${MINIO_RELEASE}`,
		sha256: '7c5bd8512c6e966455b1d198209358b2d191c77a83ab377c4073281065fb855f'
	},
	'linux-arm64': {
		url: `${GITHUB_BASE}/minio.linux-arm64.${MINIO_RELEASE}`,
		sha256: '5c83cd2cf151717ba0243f73e1c7802ff36e272b67144bdd7f1f7d684fd6f03d'
	},
	'darwin-x64': {
		url: `${GITHUB_BASE}/minio.darwin-amd64.${MINIO_RELEASE}`,
		sha256: '4759080aeef7385aaceaac1131c30aaeb99605921553967dc6d3ef4e16ac64f9'
	},
	'darwin-arm64': {
		url: `${GITHUB_BASE}/minio.darwin-arm64.${MINIO_RELEASE}`,
		sha256: '7c3b3039b76e55a1b80935848ed83998d5e8d317374f87851f46a019ff5c0aa4'
	}
};

export function resolveMinioTarget(platformTarget) {
	const entry = MINIO_TARGETS[platformTarget];
	if (!entry) return null;
	return { ...entry, version: MINIO_RELEASE };
}
