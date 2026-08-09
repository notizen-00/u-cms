/**
 * Portable MinIO. Single-binary download, no archive step. Bucket
 * provisioning is deliberately NOT done here — the backend already creates
 * and policies its bucket unconditionally at boot
 * (`MediaStorageService.onModuleInit`), so duplicating that here would just
 * be a second implementation of the same responsibility to keep in sync.
 * This runtime's job ends at "a real MinIO server is reachable."
 */
import { chmod, mkdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyChecksum } from '../checksum.mjs';
import { downloadFile } from '../download.mjs';
import { isWindows } from '../platform.mjs';
import { isProcessAlive, readOwnedPid, removePidFile, spawnManaged, stopOwnedProcess } from '../process.mjs';
import { findAvailablePort } from '../ports.mjs';
import { markInstalled, serviceManifest } from '../manifest.mjs';
import { probeMinioHealth } from './protocol.mjs';

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

export function createMinioRuntime({ target, runtimeDir, dataDir, logFile, pidFile, credentials, knownPort, knownConsolePort }) {
	let resolvedPort = knownPort ?? null;
	let resolvedConsolePort = knownConsolePort ?? null;

	async function currentInstallDir() {
		const entry = await serviceManifest('minio');
		return entry?.installDir ?? null;
	}

	function binaryPath(installDir) {
		return join(installDir, exe('minio'));
	}

	return {
		id: 'minio',

		async detect() {
			const pid = await readOwnedPid(pidFile);
			if (!pid || !resolvedPort) return { running: false };
			const alive = await probeMinioHealth({ host: '127.0.0.1', port: resolvedPort });
			return { running: alive, port: resolvedPort, consolePort: resolvedConsolePort, pid };
		},

		async install() {
			const manifestEntry = await serviceManifest('minio');
			const installDir = join(runtimeDir, target.version);
			const finalBinary = binaryPath(installDir);
			if (manifestEntry?.installed && manifestEntry.version === target.version && (await pathExists(finalBinary))) {
				return installDir;
			}

			await mkdir(runtimeDir, { recursive: true });
			const workDir = join(runtimeDir, `.download-${Date.now()}`);
			await mkdir(workDir, { recursive: true });

			try {
				const downloadPath = join(workDir, exe('minio'));
				await downloadFile(target.url, downloadPath);
				await verifyChecksum(downloadPath, target.sha256, 'MinIO');
				if (!isWindows()) await chmod(downloadPath, 0o755);

				await mkdir(installDir, { recursive: true });
				await rename(downloadPath, finalBinary);
			} finally {
				await rm(workDir, { recursive: true, force: true });
			}

			await markInstalled('minio', { version: target.version, installDir, sha256: target.sha256 });
			return installDir;
		},

		async initialize() {
			await mkdir(dataDir, { recursive: true });
		},

		async start() {
			const existing = await this.detect();
			if (existing.running) return existing;

			const installDir = await currentInstallDir();
			if (!installDir) throw new Error('MinIO is not installed yet — call install() first.');

			// Prefer previously-resolved ports over the defaults — see the
			// matching comment in postgres-runtime.mjs.
			resolvedPort = await findAvailablePort(resolvedPort ?? 9000);
			resolvedConsolePort = await findAvailablePort(resolvedConsolePort ?? resolvedPort + 1);

			await spawnManaged(
				binaryPath(installDir),
				['server', dataDir, '--address', `127.0.0.1:${resolvedPort}`, '--console-address', `127.0.0.1:${resolvedConsolePort}`],
				{
					logFile,
					pidFile,
					env: { MINIO_ROOT_USER: credentials.accessKey, MINIO_ROOT_PASSWORD: credentials.secretKey }
				}
			);

			const deadline = Date.now() + 20_000;
			while (Date.now() < deadline) {
				if (await probeMinioHealth({ host: '127.0.0.1', port: resolvedPort })) {
					return { running: true, port: resolvedPort, consolePort: resolvedConsolePort };
				}
				await sleep(300);
			}
			throw new Error(`MinIO did not become ready within 20s. Log: ${logFile}`);
		},

		async stop() {
			const pid = await readOwnedPid(pidFile);
			if (!pid) return;
			// MinIO handles SIGTERM/SIGINT gracefully on POSIX; Windows has no
			// real graceful-signal delivery to an arbitrary console app, so
			// stopOwnedProcess's hard-stop fallback is what actually runs there.
			await stopOwnedProcess(pid, { graceful: isWindows() ? undefined : async () => process.kill(pid, 'SIGTERM') });
			await removePidFile(pidFile);
		},

		async healthCheck() {
			const state = await this.detect();
			return state.running === true;
		},

		async status() {
			const pid = await readOwnedPid(pidFile);
			const alive = pid ? await isProcessAlive(pid) : false;
			return {
				installed: (await currentInstallDir()) !== null,
				running: alive,
				pid: alive ? pid : null,
				port: resolvedPort,
				consolePort: resolvedConsolePort
			};
		},

		async version() {
			return target.version;
		},

		getResolvedPort() {
			return resolvedPort;
		},
		getResolvedConsolePort() {
			return resolvedConsolePort;
		}
	};
}
