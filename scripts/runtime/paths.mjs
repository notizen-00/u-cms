/**
 * Central definition of the two portable-runtime directories (PRD §5–6).
 *
 * `.runtime/` holds downloaded software — safe to delete any time, `repair`
 * recreates it from pinned URLs. `.data/` holds what the user actually made
 * (the Postgres cluster, Redis RDB, MinIO objects) — deleting it is real data
 * loss, so nothing in this codebase ever removes it except the explicit,
 * confirmation-gated `runtime:reset`.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

export const RUNTIME_DIR = join(ROOT, '.runtime');
export const DATA_DIR = join(ROOT, '.data');

export const MANIFEST_PATH = join(RUNTIME_DIR, 'manifest.json');
export const CONFIG_PATH = join(DATA_DIR, 'runtime', 'config.json');

export const RUNTIME_LOGS_DIR = join(DATA_DIR, 'runtime', 'logs');
export const RUNTIME_PIDS_DIR = join(DATA_DIR, 'runtime', 'pids');

export function servicePaths(service) {
	return {
		runtimeDir: join(RUNTIME_DIR, service),
		dataDir: join(DATA_DIR, service, 'data'),
		logFile: join(RUNTIME_LOGS_DIR, `${service}.log`),
		pidFile: join(RUNTIME_PIDS_DIR, `${service}.pid`)
	};
}
