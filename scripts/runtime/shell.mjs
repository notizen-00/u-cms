/**
 * Process spawning shared by every runtime service and setup step.
 *
 * Windows needs `shell: true` to resolve `.exe`/`.cmd` shims through PATHEXT
 * (pnpm, corepack, docker, tar all rely on this). Node 24 deprecates passing
 * an argv array alongside `shell: true` (DEP0190 — the array would be
 * concatenated unescaped), so on Windows everything is pre-joined into one
 * quoted command string instead. Every argument that reaches this module is a
 * literal from this codebase or a path this tool generated itself — never
 * unsanitized user input — so building that string here is safe.
 */
import { spawn } from 'node:child_process';
import { isWindows } from './platform.mjs';

function quoteForWindows(value) {
	return /[\s"]/.test(value) ? `"${String(value).replace(/"/g, '\\"')}"` : String(value);
}

function toSpawnArgs(command, args, options) {
	if (!isWindows()) return [command, args, options];
	const commandLine = [command, ...args].map(quoteForWindows).join(' ');
	return [commandLine, undefined, { ...options, shell: true }];
}

/** Runs a command to completion; resolves on exit 0, rejects with stderr otherwise. */
export function run(command, args, { cwd, env, stdio = 'inherit', input } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(
			...toSpawnArgs(command, args, {
				cwd,
				env: env ? { ...process.env, ...env } : undefined,
				stdio: input !== undefined ? ['pipe', stdio, stdio] : stdio
			})
		);

		let stderr = '';
		if (stdio === 'pipe') child.stderr?.on('data', (chunk) => (stderr += chunk));

		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with code ${code}${stderr ? `\n${stderr}` : ''}`));
		});

		if (input !== undefined) {
			child.stdin.end(input);
		}
	});
}

/** Runs a command and returns its trimmed stdout, or `null` on any failure. */
export function capture(command, args, { cwd, env } = {}) {
	return new Promise((resolve) => {
		const child = spawn(
			...toSpawnArgs(command, args, { cwd, env: env ? { ...process.env, ...env } : undefined, stdio: 'pipe' })
		);
		let stdout = '';
		child.stdout?.on('data', (chunk) => (stdout += chunk));
		child.on('error', () => resolve(null));
		child.on('exit', (code) => resolve(code === 0 ? stdout.trim() : null));
	});
}

export async function commandExists(command) {
	return (await capture(command, ['--version'])) !== null;
}
