#!/usr/bin/env node
/**
 * `pnpm dev` — ensures the managed runtime is up (PRD §21), then hands off to
 * the existing `pnpm -r --parallel run dev`, which already runs every
 * workspace package's own dev script (backend API + worker, dashboard's Vite
 * server, every SDK/plugin/theme's `tsup --watch`). This file only adds the
 * infra preflight in front of that; it doesn't reimplement it.
 */
import { ensureAll } from './runtime/runtime-manager.mjs';
import { ROOT } from './runtime/paths.mjs';
import { run } from './runtime/shell.mjs';
import { bold, dim, heading, printError } from './runtime/ui.mjs';

async function main() {
	heading('Checking infrastructure');
	const result = await ensureAll({ mode: 'auto', yes: false });
	if (result.mode === 'docker') console.log(dim(result.note));

	console.log(`\n${bold('Starting API, builder worker, dashboard, and package watchers…')}\n`);
	await run('pnpm', ['-r', '--parallel', 'run', 'dev'], { cwd: ROOT });
}

main().catch((error) => {
	printError(error);
	process.exit(1);
});
