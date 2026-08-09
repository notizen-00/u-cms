/**
 * Credential generation for freshly-installed portable services (PRD §12:
 * "Credential harus dibuat secara random saat instalasi pertama").
 *
 * Alphanumeric only, deliberately — these values get embedded directly into
 * connection URLs (`postgres://user:pass@host/db`) and shell command-line
 * arguments. A password containing `:`, `@`, `/`, quotes, or spaces would
 * either break URL parsing or need escaping that differs per shell; avoiding
 * the character class entirely is simpler than getting escaping right on
 * three platforms.
 */
import { randomInt } from 'node:crypto';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomAlnum(length = 24) {
	let out = '';
	for (let i = 0; i < length; i += 1) out += ALPHANUMERIC[randomInt(ALPHANUMERIC.length)];
	return out;
}
