/**
 * .env lifecycle for both "generate it" and "read what's already there".
 *
 * The one rule everything here serves (PRD §20): an existing `.env` is
 * user-managed the instant it exists, full stop. `setEnvValues` — the only
 * function that can change bytes in an already-written file — is only ever
 * called by runtime-manager.mjs immediately after `ensureEnvFile` reports
 * `wasCreated: true`, i.e. on a file this exact process just created and the
 * user has not had a chance to touch yet.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROOT } from '../runtime/paths.mjs';

export const BACKEND_ENV_PATH = join(ROOT, 'apps', 'backend', '.env');
export const BACKEND_ENV_EXAMPLE_PATH = join(ROOT, 'apps', 'backend', '.env.example');
export const DASHBOARD_ENV_PATH = join(ROOT, 'apps', 'dashboard', '.env');
export const DASHBOARD_ENV_EXAMPLE_PATH = join(ROOT, 'apps', 'dashboard', '.env.example');
export const ROOT_ENV_PATH = join(ROOT, '.env');
export const ROOT_ENV_EXAMPLE_PATH = join(ROOT, '.env.example');

async function exists(path) {
	try {
		await readFile(path);
		return true;
	} catch {
		return false;
	}
}

/** Copies `example` to `target` only if `target` doesn't exist yet. */
export async function ensureEnvFile(examplePath, targetPath) {
	if (await exists(targetPath)) return { path: targetPath, wasCreated: false };
	if (!(await exists(examplePath))) return { path: targetPath, wasCreated: false, missingExample: true };
	await mkdir(dirname(targetPath), { recursive: true });
	await copyFile(examplePath, targetPath);
	return { path: targetPath, wasCreated: true };
}

/** Parses `KEY=value` pairs, tolerating comments, blank lines, and quoted values. */
export async function parseEnvFile(path) {
	const values = {};
	let raw;
	try {
		raw = await readFile(path, 'utf8');
	} catch {
		return values;
	}
	for (const line of raw.split(/\r?\n/)) {
		const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
		if (!match) continue;
		values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
	}
	return values;
}

/**
 * Rewrites specific `KEY=value` lines in-place, preserving every other line
 * verbatim (comments, ordering, unrelated settings). Appends any key that
 * isn't already present. Caller is responsible for only invoking this on a
 * file it just created — see the module doc comment.
 */
export async function setEnvValues(path, updates) {
	const raw = await readFile(path, 'utf8');
	const lines = raw.split(/\r?\n/);
	const remaining = new Map(Object.entries(updates));

	const next = lines.map((line) => {
		const match = /^([A-Z0-9_]+)\s*=/.exec(line);
		if (!match || !remaining.has(match[1])) return line;
		const key = match[1];
		const value = remaining.get(key);
		remaining.delete(key);
		return `${key}=${value}`;
	});

	for (const [key, value] of remaining) next.push(`${key}=${value}`);
	await writeFile(path, next.join('\n'));
}

/**
 * Parses everything RuntimeManager needs to know from the backend's current
 * `DATABASE_URL`/`REDIS_URL`/`MINIO_*` — whichever env this call sees,
 * freshly-copied defaults or a long-standing user file, is treated the same
 * way here; the caller decides what's safe to change based on `wasCreated`.
 */
export function parseInfraTargets(env) {
	const parseUrl = (value, fallbackPort) => {
		try {
			const url = new URL(value);
			return {
				host: url.hostname,
				port: Number(url.port) || fallbackPort,
				user: decodeURIComponent(url.username || ''),
				password: decodeURIComponent(url.password || ''),
				database: url.pathname.replace(/^\//, '')
			};
		} catch {
			return null;
		}
	};

	return {
		postgres: parseUrl(env.DATABASE_URL ?? '', 5432),
		redis: (() => {
			const parsed = parseUrl(env.REDIS_URL ?? '', 6379);
			return parsed ? { host: parsed.host, port: parsed.port } : null;
		})(),
		minio: env.MINIO_ENDPOINT
			? {
					host: env.MINIO_ENDPOINT,
					port: Number(env.MINIO_PORT) || 9000,
					accessKey: env.MINIO_ACCESS_KEY || 'unej_cms',
					secretKey: env.MINIO_SECRET_KEY || 'unej_cms_secret',
					bucket: env.MINIO_BUCKET || 'unej-cms-media'
				}
			: null
	};
}
