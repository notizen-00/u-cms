/**
 * Process lifecycle for portable services: spawn detached, remember what we
 * started via a PID file, and — critically — never trust a bare PID again
 * once time has passed (PRD §23: "PID dapat digunakan ulang oleh OS").
 *
 * Every PID file records the executable path alongside the PID. Before this
 * tool ever signals a PID it believes is "ours", it re-reads the OS process
 * table and checks that PID's executable path still matches what we recorded
 * — if the OS has recycled that PID for an unrelated process, the check
 * fails closed and nothing is killed.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isWindows } from './platform.mjs';

const STOP_GRACE_MS = 5000;
const STOP_POLL_MS = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts `command` detached from this process (survives the installer/CLI
 * exiting) with stdout/stderr appended to `logFile`, and writes a PID file
 * recording enough to verify ownership later.
 */
export async function spawnManaged(command, args, { cwd, env, logFile, pidFile }) {
	await mkdir(dirname(logFile), { recursive: true });
	await mkdir(dirname(pidFile), { recursive: true });

	const { open } = await import('node:fs/promises');
	const log = await open(logFile, 'a');

	const child = spawn(command, args, {
		cwd,
		env: { ...process.env, ...env },
		stdio: ['ignore', log.fd, log.fd],
		detached: !isWindows(),
		windowsHide: true
	});
	// Detached-and-unref'd on POSIX so the child survives this process exiting;
	// on Windows detaching a console process doesn't free the parent console,
	// but windowsHide keeps no window from flashing up regardless.
	child.unref();
	await log.close();

	await writeFile(
		pidFile,
		JSON.stringify(
			{ pid: child.pid, command, args, cwd, startedAt: new Date().toISOString() },
			null,
			2
		)
	);

	return child.pid;
}

/** Best-effort executable path for a live PID, or `null` if it can't be determined or isn't running. */
async function executablePathForPid(pid) {
	if (isWindows()) {
		return new Promise((resolve) => {
			const ps = spawn(
				'powershell.exe',
				[
					'-NoProfile',
					'-NonInteractive',
					'-Command',
					`(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).Path`
				],
				{ stdio: ['ignore', 'pipe', 'ignore'] }
			);
			let out = '';
			ps.stdout.on('data', (chunk) => (out += chunk));
			ps.on('error', () => resolve(null));
			ps.on('exit', () => resolve(out.trim() || null));
		});
	}

	try {
		// Linux: /proc is exact and needs no extra process spawn.
		const target = await readFile(`/proc/${pid}/exe`, 'utf8').catch(() => null);
		if (target !== null) return target;
	} catch {
		// fall through to `ps` (also covers macOS, which has no /proc)
	}

	return new Promise((resolve) => {
		const ps = spawn('ps', ['-p', String(pid), '-o', 'comm='], { stdio: ['ignore', 'pipe', 'ignore'] });
		let out = '';
		ps.stdout.on('data', (chunk) => (out += chunk));
		ps.on('error', () => resolve(null));
		ps.on('exit', () => resolve(out.trim() || null));
	});
}

/**
 * True if the PID recorded in `pidFile` is (a) currently running and (b) its
 * executable still looks like the one we launched — a basename match, since
 * the recorded command may be a bare name ("tar") resolved differently than
 * the OS's absolute reported path, but a mismatched basename means the OS
 * handed this PID to a different program entirely.
 */
export async function readOwnedPid(pidFile) {
	let record;
	try {
		record = JSON.parse(await readFile(pidFile, 'utf8'));
	} catch {
		return null;
	}
	if (!record?.pid) return null;

	const actualExe = await executablePathForPid(record.pid);
	if (!actualExe) return null;

	const expectedBase = String(record.command).split(/[\\/]/).pop()?.toLowerCase() ?? '';
	const actualBase = actualExe.split(/[\\/]/).pop()?.toLowerCase() ?? '';
	if (!expectedBase || !actualBase.startsWith(expectedBase.replace(/\.exe$/, ''))) return null;

	return record.pid;
}

/**
 * Stops a process this tool owns. `graceful(pid)` gets first refusal (e.g.
 * `pg_ctl stop`, or a protocol-level SHUTDOWN command) — a real termination
 * request the service can act on, versus SIGTERM/TerminateProcess, which is
 * always the fallback. Never called on a PID `readOwnedPid` didn't return.
 */
export async function stopOwnedProcess(pid, { graceful } = {}) {
	if (graceful) {
		try {
			await graceful(pid);
		} catch {
			// fall through to a hard stop below
		}
	}

	for (let elapsed = 0; elapsed < STOP_GRACE_MS; elapsed += STOP_POLL_MS) {
		if (!(await isProcessAlive(pid))) return;
		await sleep(STOP_POLL_MS);
	}

	if (!(await isProcessAlive(pid))) return;

	if (isWindows()) {
		await new Promise((resolve) => {
			const kill = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
			kill.on('error', () => resolve());
			kill.on('exit', () => resolve());
		});
	} else {
		try {
			process.kill(pid, 'SIGKILL');
		} catch {
			// already gone
		}
	}
}

export async function isProcessAlive(pid) {
	if (isWindows()) return (await executablePathForPid(pid)) !== null;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export async function removePidFile(pidFile) {
	await rm(pidFile, { force: true });
}
