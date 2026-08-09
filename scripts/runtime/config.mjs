/**
 * `.data/runtime/config.json` — which services THIS tool is allowed to
 * start/stop, and where they currently live.
 *
 * This file, not a guess from .env contents, is what `pnpm start`/`pnpm dev`
 * consult before touching anything (PRD §22's hard rule: a system/external
 * service must never be stopped or started by the runtime manager). A
 * service only ever gets `managed: true` here at the moment this tool itself
 * installs and starts it — reusing an existing service always records
 * `managed: false`, permanently, for that run's resolution.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CONFIG_PATH } from './paths.mjs';

function emptyConfig() {
	return { resolvedAt: null, services: {} };
}

export async function readConfig() {
	try {
		return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
	} catch {
		return emptyConfig();
	}
}

export async function writeConfig(config) {
	await mkdir(dirname(CONFIG_PATH), { recursive: true });
	await writeFile(CONFIG_PATH, JSON.stringify({ ...config, resolvedAt: new Date().toISOString() }, null, 2));
}

/** Merges one service's resolution into the config and persists it. */
export async function recordService(service, resolution) {
	const config = await readConfig();
	config.services[service] = resolution;
	await writeConfig(config);
}
