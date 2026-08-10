/**
 * The backend returns storage URLs pointing at MinIO's internal Docker hostname (e.g.
 * `http://minio:9000/...`), which only resolves inside the compose network — the
 * browser can't reach it. Rewrite to `localhost` (same port/path) so uploaded
 * files actually load for the admin browsing from the host machine.
 */
export function normalizeStorageUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname === 'minio') {
			parsed.hostname = 'localhost';
		}
		return parsed.toString();
	} catch {
		return url;
	}
}
