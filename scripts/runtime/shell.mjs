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

		let output = '';
		if (stdio === 'pipe') {
			const retain = (chunk) => {
				output = `${output}${chunk}`.slice(-20_000);
			};
			child.stdout?.on('data', retain);
			child.stderr?.on('data', retain);
		}

		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with code ${code}${output ? `\n${output}` : ''}`));
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
