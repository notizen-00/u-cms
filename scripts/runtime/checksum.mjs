/**
 * SHA-256 verification for downloaded runtime binaries (PRD §11).
 *
 * Every portable binary this tool runs must pass this check before it is
 * extracted or executed — there is no fallback path that skips it.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export class ChecksumMismatchError extends Error {
	constructor(label, expected, actual) {
		super(
			`Runtime verification failed.\n\n` +
				`Service:\n${label}\n\n` +
				`Expected SHA-256:\n${expected}\n\n` +
				`Actual SHA-256:\n${actual}\n\n` +
				`Installation aborted.`
		);
		this.name = 'ChecksumMismatchError';
	}
}

export function sha256File(path) {
	return new Promise((resolve, reject) => {
		const hash = createHash('sha256');
		const stream = createReadStream(path);
		stream.on('error', reject);
		stream.on('data', (chunk) => hash.update(chunk));
		stream.on('end', () => resolve(hash.digest('hex')));
	});
}

/** Throws {@link ChecksumMismatchError} on mismatch; resolves silently otherwise. */
export async function verifyChecksum(path, expectedHex, label) {
	const actual = await sha256File(path);
	if (actual.toLowerCase() !== expectedHex.toLowerCase()) {
		throw new ChecksumMismatchError(label, expectedHex.toLowerCase(), actual);
	}
}
