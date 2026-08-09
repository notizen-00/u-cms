#!/usr/bin/env node
/**
 * `pnpm dev` builds once and runs compiled services without file watchers.
 * `pnpm dev:watch` performs the same safe initial build, then starts every
 * workspace development process with hot reload enabled.
 */
import { join } from 'node:path';
import { ensureAll } from './runtime/runtime-manager.mjs';
import { ROOT } from './runtime/paths.mjs';
import { run } from './runtime/shell.mjs';
import { bold, dim, heading, ok, printError } from './runtime/ui.mjs';

const args = new Set(process.argv.slice(2));
const debug = args.has('--debug');
const watch = args.has('--watch');
const WATCH_PACKAGE_FILTERS = ['./packages/sdk/**', './plugins/**', './themes/**'];

async function main() {
	heading('Checking infrastructure');
	const result = await ensureAll({ mode: 'auto', yes: false });
	if (result.mode === 'docker') console.log(dim(result.note));

	const buildArgs = watch
		? [...WATCH_PACKAGE_FILTERS.flatMap((filter) => ['--filter', filter]), '-r', 'run', 'build']
		: ['-r', 'run', 'build'];
	heading(watch ? 'Preparing typed workspace packages' : 'Building application');
	await run('pnpm', buildArgs, { cwd: ROOT, stdio: 'pipe' });
	ok(watch ? 'SDKs, plugins, and themes built' : 'Application built');

	if (watch) {
		console.log(`\n${bold('Watch mode enabled')}`);
		console.log(`${dim('Dashboard: http://localhost:5173 · API: http://localhost:3000')}\n`);
		await run('pnpm', ['-r', '--parallel', 'run', 'dev'], { cwd: ROOT });
		return;
	}

	console.log(`\n${bold('Starting API, builder worker, and dashboard…')}\n`);
	await run(
		process.execPath,
		[join(ROOT, 'scripts', 'start.mjs'), '--skip-infra', '--status-only', ...(debug ? ['--debug'] : [])],
		{ cwd: ROOT }
	);
}

main().catch((error) => {
	printError(error, { debug });
	process.exit(1);
});
