/**
 * Portable Redis-compatible runtime. See redis/manifest.mjs for why Windows
 * uses a prebuilt community binary while Linux/macOS build from Redis's own
 * official source tarball.
 */
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyChecksum } from '../checksum.mjs';
import { downloadFile } from '../download.mjs';
import { extractTar, extractZip, isTarArchive } from '../archive.mjs';
import { isWindows } from '../platform.mjs';
import { isProcessAlive, readOwnedPid, removePidFile, spawnManaged, stopOwnedProcess } from '../process.mjs';
import { findAvailablePort } from '../ports.mjs';
import { commandExists, run } from '../shell.mjs';
import { markInstalled, serviceManifest } from '../manifest.mjs';
import { probeRedisPing, sendRedisShutdown } from './protocol.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exe = (name) => (isWindows() ? `${name}.exe` : name);

async function pathExists(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/** The extracted source tree's top directory ("redis-7.4.2/"), whatever it's actually named. */
async function soleSubdirectory(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const dirs = entries.filter((entry) => entry.isDirectory());
	if (dirs.length !== 1) throw new Error(`Expected exactly one top-level directory in ${dir}, found ${dirs.length}.`);
	return join(dir, dirs[0].name);
}

export function createRedisRuntime({ target, runtimeDir, dataDir, logFile, pidFile, knownPort }) {
	let resolvedPort = knownPort ?? null;

	async function currentInstallDir() {
		const entry = await serviceManifest('redis');
		return entry?.installDir ?? null;
	}

	function serverBin(installDir) {
		return join(installDir, exe('redis-server'));
	}

	return {
		id: 'redis',

		async detect() {
			const pid = await readOwnedPid(pidFile);
			if (!pid || !resolvedPort) return { running: false };
			const alive = await probeRedisPing({ host: '127.0.0.1', port: resolvedPort });
			return { running: alive, port: resolvedPort, pid };
		},

		async install() {
			const manifestEntry = await serviceManifest('redis');
			const installDir = join(runtimeDir, target.version);
			if (manifestEntry?.installed && manifestEntry.version === target.version && (await pathExists(serverBin(installDir)))) {
				return installDir;
			}

			await mkdir(runtimeDir, { recursive: true });
			const workDir = join(runtimeDir, `.download-${Date.now()}`);
			await mkdir(workDir, { recursive: true });

			try {
				const archivePath = join(workDir, target.kind === 'prebuilt' ? 'redis.zip' : 'redis-src.tar.gz');
				await downloadFile(target.url, archivePath);
				await verifyChecksum(archivePath, target.sha256, 'Redis');

				const tmpInstallDir = `${installDir}.tmp`;
				await rm(tmpInstallDir, { recursive: true, force: true });

				if (target.kind === 'prebuilt') {
					await extractZip(archivePath, tmpInstallDir);
				} else {
					if (!(await commandExists('make'))) {
						throw new Error(
							'`make` was not found on PATH. Building the portable Redis runtime from source needs a ' +
								'C toolchain (make + gcc/clang) — install one, or run `pnpm setup --infra=system` ' +
								'against a Redis you already have.'
						);
					}
					const extractedDir = join(workDir, 'src-extract');
					if (isTarArchive(archivePath)) await extractTar(archivePath, extractedDir);
					const sourceDir = await soleSubdirectory(extractedDir);

					const cpus = (await import('node:os')).cpus().length;
					await run('make', [`-j${Math.max(1, cpus)}`], { cwd: sourceDir });

					await mkdir(tmpInstallDir, { recursive: true });
					for (const bin of ['redis-server', 'redis-cli']) {
						await rename(join(sourceDir, 'src', bin), join(tmpInstallDir, bin));
					}
				}

				await rm(installDir, { recursive: true, force: true });
				await rename(tmpInstallDir, installDir);
			} finally {
				await rm(workDir, { recursive: true, force: true });
			}

			await markInstalled('redis', { version: target.version, installDir, sha256: target.sha256 });
			return installDir;
		},

		async initialize() {
			await mkdir(dataDir, { recursive: true });
		},

		async start() {
			const existing = await this.detect();
			if (existing.running) return existing;

			const installDir = await currentInstallDir();
			if (!installDir) throw new Error('Redis is not installed yet — call install() first.');

			// Prefer the previously-resolved port over the default — see the
			// matching comment in postgres-runtime.mjs.
			resolvedPort = await findAvailablePort(resolvedPort ?? 6379);
			await spawnManaged(
				serverBin(installDir),
				[
					'--port',
					String(resolvedPort),
					'--bind',
					'127.0.0.1',
					'--dir',
					dataDir,
					'--dbfilename',
					'dump.rdb',
					'--save',
					'60',
					'1',
					'--logfile',
					logFile
				],
				{ logFile, pidFile }
			);

			const deadline = Date.now() + 10_000;
			while (Date.now() < deadline) {
				if (await probeRedisPing({ host: '127.0.0.1', port: resolvedPort })) return { running: true, port: resolvedPort };
				await sleep(200);
			}
			throw new Error(`Redis did not become ready within 10s. Log: ${logFile}`);
		},

		async stop() {
			const pid = await readOwnedPid(pidFile);
			if (!pid) return;
			await stopOwnedProcess(pid, {
				graceful: resolvedPort ? () => sendRedisShutdown({ host: '127.0.0.1', port: resolvedPort }) : undefined
			});
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

		getResolvedPort() {
			return resolvedPort;
		}
	};
}
