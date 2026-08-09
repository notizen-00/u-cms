#!/usr/bin/env node
/**
 * One-command native installer: `pnpm setup`.
 *
 * Takes a fresh checkout to a runnable instance: toolchain check, .env files,
 * infrastructure (reuse what's already running, or install a portable copy
 * of what's missing), dependencies, build, database migration. See
 * `docs/native_prd.md` for the full design; `scripts/runtime/runtime-manager.mjs`
 * is where the actual infra decisions get made.
 *
 * Flags:
 *   --infra=auto|portable|system|docker   default: auto
 *   --yes, -y        never prompt (CI); accept installing portable infra
 *   --skip-infra     don't touch PostgreSQL/Redis/MinIO at all
 *   --skip-build     don't build workspace packages (implies --skip-migrate)
 *   --skip-migrate   don't run database migrations
 *   --debug          show full stack traces on failure
 */
import { ensureEnvFile, BACKEND_ENV_EXAMPLE_PATH, BACKEND_ENV_PATH, DASHBOARD_ENV_EXAMPLE_PATH, DASHBOARD_ENV_PATH, ROOT_ENV_EXAMPLE_PATH, ROOT_ENV_PATH } from './setup/environment.mjs';
import { checkToolchain } from './setup/workspace.mjs';
import { installDependencies } from './setup/dependencies.mjs';
import { buildWorkspace } from './setup/build.mjs';
import { migrateDatabase } from './setup/migration.mjs';
import { ensureAll } from './runtime/runtime-manager.mjs';
import { bold, cyan, dim, heading, info, ok, printError, warn } from './runtime/ui.mjs';

const args = new Set(process.argv.slice(2));
const infraArg = process.argv.slice(2).find((arg) => arg.startsWith('--infra='));
const flags = {
	infra: infraArg ? infraArg.slice('--infra='.length) : 'auto',
	yes: args.has('--yes') || args.has('-y') || !process.stdin.isTTY,
	skipInfra: args.has('--skip-infra'),
	skipBuild: args.has('--skip-build'),
	skipMigrate: args.has('--skip-migrate') || args.has('--skip-build'),
	debug: args.has('--debug')
};

if (!['auto', 'portable', 'system', 'docker'].includes(flags.infra)) {
	console.error(`Unknown --infra value: ${flags.infra}\nExpected one of: auto, portable, system, docker`);
	process.exit(1);
}

let stepNumber = 0;
const step = (title) => console.log(`\n${cyan(`[${++stepNumber}]`)} ${bold(title)}`);

async function prepareEnvFiles() {
	const backend = await ensureEnvFile(BACKEND_ENV_EXAMPLE_PATH, BACKEND_ENV_PATH);
	const dashboard = await ensureEnvFile(DASHBOARD_ENV_EXAMPLE_PATH, DASHBOARD_ENV_PATH);
	await ensureEnvFile(ROOT_ENV_EXAMPLE_PATH, ROOT_ENV_PATH);

	for (const [label, result] of [
		['apps/backend/.env', backend],
		['apps/dashboard/.env', dashboard]
	]) {
		ok(result.wasCreated ? `${label} created from .env.example` : `${label} already exists — left untouched`);
	}
	info('Defaults are development-only. Change credentials before exposing this instance.');

	return { backendWasCreated: backend.wasCreated };
}

async function resolveInfrastructure(backendWasCreated) {
	if (flags.skipInfra) {
		warn('--skip-infra: not touching PostgreSQL, Redis, or MinIO.');
		return;
	}

	const result = await ensureAll({ mode: flags.infra, yes: flags.yes, backendEnvWasCreated: backendWasCreated });
	if (result.mode === 'docker') {
		info(result.note);
		return;
	}
}

async function main() {
	heading('UNEJ CMS Setup');

	step('Checking toolchain');
	await checkToolchain();

	step('Preparing .env files');
	const { backendWasCreated } = await prepareEnvFiles();

	step(`Resolving infrastructure (${flags.infra})`);
	await resolveInfrastructure(backendWasCreated);

	step('Installing dependencies');
	await installDependencies();

	step('Building packages');
	if (flags.skipBuild) {
		warn('--skip-build: nothing built. The API and dashboard cannot start until you run `pnpm build`.');
	} else {
		await buildWorkspace();
	}

	step('Applying database migrations');
	if (flags.skipMigrate) {
		warn('Skipped. Run `pnpm db:migrate` once the backend is built.');
	} else {
		await migrateDatabase();
	}

	console.log(`\n${bold('UNEJ CMS is ready.')}\n`);
	console.log(`Run:\n\n  ${cyan('pnpm dev')}\n`);
	console.log(`Dashboard:\n  http://localhost:5173\n`);
	console.log(`First installation:\n  http://localhost:5173/setup\n`);
	console.log(dim('Diagnose infrastructure any time with `pnpm runtime:doctor`.'));
	console.log(dim('Everything in containers instead: `docker compose up -d`.\n'));
}

main().catch((error) => {
	printError(error, { debug: flags.debug });
	process.exit(1);
});
