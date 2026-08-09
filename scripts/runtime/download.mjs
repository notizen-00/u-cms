/**
 * HTTPS download with redirect following and an atomic finish.
 *
 * A download that dies partway must never leave `dest` looking like a
 * complete file (PRD §10: "Download yang gagal tidak boleh meninggalkan
 * runtime seolah-olah berhasil di-install") — everything is written to a
 * `.part` sibling and only `rename`d onto `dest` once the response ends
 * cleanly. `rename` on the same filesystem is atomic on every platform this
 * tool targets, so a reader never observes a half-written file at `dest`.
 */
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import https from 'node:https';
import { dirname } from 'node:path';

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 30_000;

export class DownloadError extends Error {}

function get(url, redirectsLeft) {
	return new Promise((resolve, reject) => {
		const request = https.get(
			url,
			{ headers: { 'User-Agent': 'unej-cms-runtime-installer' }, timeout: DEFAULT_TIMEOUT_MS },
			(response) => {
				const { statusCode, headers } = response;
				if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
					response.resume(); // drain so the socket can be reused/closed cleanly
					if (redirectsLeft <= 0) {
						reject(new DownloadError(`Too many redirects fetching ${url}`));
						return;
					}
					const next = new URL(headers.location, url).toString();
					resolve(get(next, redirectsLeft - 1));
					return;
				}
				if (statusCode !== 200) {
					response.resume();
					reject(new DownloadError(`HTTP ${statusCode} fetching ${url}`));
					return;
				}
				resolve(response);
			}
		);
		request.on('timeout', () => request.destroy(new DownloadError(`Timed out fetching ${url}`)));
		request.on('error', reject);
	});
}

/**
 * Downloads `url` to `destPath`, calling `onProgress({ receivedBytes, totalBytes })`
 * as data arrives (`totalBytes` is `null` when the server omits Content-Length).
 */
export async function downloadFile(url, destPath, { onProgress } = {}) {
	await mkdir(dirname(destPath), { recursive: true });
	const partPath = `${destPath}.part`;

	const response = await get(url, MAX_REDIRECTS);
	const totalBytes = Number(response.headers['content-length']) || null;
	let receivedBytes = 0;

	try {
		await new Promise((resolve, reject) => {
			const out = createWriteStream(partPath);
			response.on('data', (chunk) => {
				receivedBytes += chunk.length;
				onProgress?.({ receivedBytes, totalBytes });
			});
			response.on('error', reject);
			out.on('error', reject);
			out.on('finish', resolve);
			response.pipe(out);
		});
	} catch (error) {
		await rm(partPath, { force: true });
		throw error;
	}

	await rename(partPath, destPath);
	return { bytes: receivedBytes };
}
