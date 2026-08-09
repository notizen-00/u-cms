/**
 * Portable PostgreSQL — the most critical of the three services, since it
 * holds real CMS content (PRD §12).
 *
 * The zonky distribution is deliberately minimal: `postgres`, `initdb`,
 * `pg_ctl`, nothing else (no `psql`, `createdb`, `pg_isready`). Every
 * operation below is built from just those three:
 *
 *   - role + password  →  `initdb -U <user> --pwfile=<file>` creates the
 *     superuser directly, no separate CREATE ROLE step.
 *   - the app database →  `postgres --single` (single-user mode operates on
 *     the data directory directly, no running server or auth needed) runs
 *     one `CREATE DATABASE` statement via stdin.
 *   - liveness          →  our own minimal wire-protocol probe
 *     (postgres/protocol.mjs) — real Postgres, not just "a port is open".
 *   - stop               →  `pg_ctl stop -m fast`, always, regardless of how
 *     the process was started — it reads the data directory's own
 *     postmaster.pid, so it's correct even after a crash-restart.
 */
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyChecksum } from '../checksum.mjs';
import { downloadFile } from '../download.mjs';
import { extractTar, extractZip } from '../archive.mjs';
import { isWindows } from '../platform.mjs';
import { isProcessAlive, readOwnedPid, removePidFile, spawnManaged, stopOwnedProcess } from '../process.mjs';
import { findAvailablePort, isPortOpen } from '../ports.mjs';
import { run } from '../shell.mjs';
import { markInstalled, serviceManifest } from '../manifest.mjs';
import { probePostgres } from './protocol.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const exe = (name) => (isWindows() ? `${name}.exe` : name);

function bins(installDir) {
	const bin = join(installDir, 'bin');
	return { postgres: join(bin, exe('postgres')), initdb: join(bin, exe('initdb')), pgCtl: join(bin, exe('pg_ctl')) };
}

async function pathExists(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * `knownPort` is the port this service was last resolved to (from
 * `.data/runtime/config.json`), because each CLI invocation — `pnpm setup`,
 * `pnpm runtime:stop`, `pnpm dev` — is a fresh Node process with no memory of
 * a port module state assigned in a previous one. Without it, `stop()` in a
 * new process would have no idea what port to check the PID against.
 */
export function createPostgresRuntime({ target, runtimeDir, dataDir, logFile, pidFile, credentials, knownPort }) {
	const { user, password, database } = credentials;
	let resolvedPort = knownPort ?? null;

	async function currentInstallDir() {
		const entry = await serviceManifest('postgres');
		return entry?.installDir ?? null;
	}

	return {
		id: 'postgres',

		/** Is *our own* portable instance (per the PID file) up and answering? */
		async detect() {
			const pid = await readOwnedPid(pidFile);
			if (!pid) return { running: false };
			const port = resolvedPort;
			if (!port) return { running: false };
			const alive = await probePostgres({ host: '127.0.0.1', port, user, database });
			return { running: alive, port, pid };
		},

		async install() {
			const manifestEntry = await serviceManifest('postgres');
			const installDir = join(runtimeDir, target.version);
			if (manifestEntry?.installed && manifestEntry.version === target.version && (await pathExists(installDir))) {
				return installDir;
			}

			await mkdir(runtimeDir, { recursive: true });
			const workDir = join(runtimeDir, `.download-${Date.now()}`);
			await mkdir(workDir, { recursive: true });

			try {
				const archivePath = join(workDir, 'postgres.jar');
				await downloadFile(target.url, archivePath);
				await verifyChecksum(archivePath, target.sha256, 'PostgreSQL');

				const outerDir = join(workDir, 'outer');
				const entries = await extractZip(archivePath, outerDir);
				const innerName = entries.find((name) => name.endsWith('.txz'));
				if (!innerName) throw new Error('PostgreSQL archive did not contain the expected .txz payload.');

				const tmpInstallDir = `${installDir}.tmp`;
				await rm(tmpInstallDir, { recursive: true, force: true });
				await extractTar(join(outerDir, innerName), tmpInstallDir);

				await rm(installDir, { recursive: true, force: true });
				await rename(tmpInstallDir, installDir);
			} finally {
				await rm(workDir, { recursive: true, force: true });
			}

			await markInstalled('postgres', { version: target.version, installDir, sha256: target.sha256 });
			return installDir;
		},

		async initialize() {
			const installDir = await currentInstallDir();
			if (!installDir) throw new Error('PostgreSQL is not installed yet — call install() first.');
			const { initdb, postgres } = bins(installDir);

			if (await pathExists(join(dataDir, 'PG_VERSION'))) return; // already initialized

			await mkdir(dataDir, { recursive: true });
			const pwFile = join(runtimeDir, `.pwfile-${Date.now()}`);
			await writeFile(pwFile, password, 'utf8');
			try {
				await run(initdb, [
					'-D',
					dataDir,
					'-U',
					user,
					`--pwfile=${pwFile}`,
					'--auth=scram-sha-256',
					'--locale=C',
					'--encoding=UTF8'
				]);
			} finally {
				await rm(pwFile, { force: true });
			}

			// Single-user mode talks directly to the data files — no server,
			// no auth — so this is the one moment we can create the app
			// database without a psql/createdb binary in the distribution.
			await run(postgres, ['--single', '-D', dataDir, '-c', 'listen_addresses=', 'postgres'], {
				input: `CREATE DATABASE ${database} OWNER ${user};\n`,
				stdio: 'pipe'
			});
		},

		async start() {
			const existing = await this.detect();
			if (existing.running) return existing;

			const installDir = await currentInstallDir();
			if (!installDir) throw new Error('PostgreSQL is not installed yet — call install() first.');
			const { postgres } = bins(installDir);

			// Prefer the previously-resolved port (from config.json/.env) over the
			// default — restarting a stopped instance must land back on the same
			// port its DATABASE_URL already points at, not silently drift to
			// whichever port happens to be free first.
			resolvedPort = await findAvailablePort(resolvedPort ?? 5432);
			await spawnManaged(
				postgres,
				['-D', dataDir, '-p', String(resolvedPort), '-c', 'listen_addresses=127.0.0.1'],
				{ logFile, pidFile }
			);

			const deadline = Date.now() + 20_000;
			while (Date.now() < deadline) {
				if (await probePostgres({ host: '127.0.0.1', port: resolvedPort, user, database })) {
					return { running: true, port: resolvedPort };
				}
				await sleep(300);
			}
			throw new Error(`PostgreSQL did not become ready within 20s. Log: ${logFile}`);
		},

		async stop() {
			const pid = await readOwnedPid(pidFile);
			if (!pid) return;
			const installDir = await currentInstallDir();
			const graceful = installDir
				? async () => run(bins(installDir).pgCtl, ['-D', dataDir, '-m', 'fast', 'stop'])
				: undefined;
			await stopOwnedProcess(pid, { graceful });
			await removePidFile(pidFile);
		},

		async healthCheck() {
			const state = await this.detect();
			return state.running === true;
		},

		async status() {
			const pid = await readOwnedPid(pidFile);
			const alive = pid ? await isProcessAlive(pid) : false;
			return { installed: (await currentInstallDir()) !== null, running: alive, pid: alive ? pid : null, port: resolvedPort };
		},

		async version() {
			return target.version;
		},

		setResolvedPort(port) {
			resolvedPort = port;
		},
		getResolvedPort() {
			return resolvedPort;
		}
	};
}
