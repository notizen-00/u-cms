#!/usr/bin/env node
/**
 * One-command native installer: `pnpm setup`.
 *
 * Takes a fresh checkout to a runnable instance — toolchain check, .env files,
 * backing services, dependencies, build, database migration — and refuses to
 * continue past anything it cannot actually verify, so a broken step surfaces
 * here rather than as a confusing crash on first run.
 *
 * Backing services (Postgres, Redis, MinIO) are probed on the ports the .env
 * files point at. Anything already listening is used as-is, which is what makes
 * this a genuinely native path: an existing Laragon/Homebrew/system Postgres
 * needs no Docker at all. Docker is offered only to fill in what's missing.
 *
 * Flags:
 *   --yes           never prompt (CI); assume yes for "start missing services"
 *   --skip-infra    don't probe or start Postgres/Redis/MinIO
 *   --skip-build    don't build workspace packages (also skips migrations)
 *   --skip-migrate  don't run database migrations
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { createInterface } from 'node:readline/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND = join(ROOT, 'apps', 'backend');
const DASHBOARD = join(ROOT, 'apps', 'dashboard');

const MIN_NODE_MAJOR = 22;
const PNPM_VERSION = '10.12.4';

const args = new Set(process.argv.slice(2));
const flags = {
	yes: args.has('--yes') || args.has('-y') || !process.stdin.isTTY,
	skipInfra: args.has('--skip-infra'),
	skipBuild: args.has('--skip-build'),
	skipMigrate: args.has('--skip-migrate') || args.has('--skip-build')
};

/* ------------------------------------------------------------------ output */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const bold = (text) => paint('1', text);
const dim = (text) => paint('2', text);
const green = (text) => paint('32', text);
const yellow = (text) => paint('33', text);
const red = (text) => paint('31', text);
const cyan = (text) => paint('36', text);

let stepNumber = 0;
const step = (title) => console.log(`\n${cyan(`[${++stepNumber}]`)} ${bold(title)}`);
const ok = (text) => console.log(`    ${green('✓')} ${text}`);
const info = (text) => console.log(`    ${dim('·')} ${dim(text)}`);
const warn = (text) => console.log(`    ${yellow('!')} ${text}`);

class SetupError extends Error {
	constructor(message, hint) {
		super(message);
		this.hint = hint;
	}
}

/* ------------------------------------------------------------------- utils */

/**
 * Windows needs a shell to resolve the `.cmd` shims that pnpm, corepack, and
 * docker install into PATH. Node 24 deprecates passing an argv array alongside
 * `shell: true` (DEP0190), so the shell path gets one pre-joined string —
 * safe here because every argument below is a literal from this file, never
 * user input.
 */
function spawnArgs(command, commandArgs, options) {
	return process.platform === 'win32'
		? [`${command} ${commandArgs.join(' ')}`, undefined, { ...options, shell: true }]
		: [command, commandArgs, options];
}

function capture(command, commandArgs, options = {}) {
	const result = spawnSync(...spawnArgs(command, commandArgs, { encoding: 'utf8', ...options }));
	if (result.error || result.status !== 0) return null;
	return (result.stdout ?? '').trim();
}

function run(command, commandArgs, { cwd = ROOT, label } = {}) {
	const printable = `${command} ${commandArgs.join(' ')}`;
	info(`${printable}${cwd === ROOT ? '' : `  (in ${relative(ROOT, cwd)})`}`);
	const result = spawnSync(...spawnArgs(command, commandArgs, { cwd, stdio: 'inherit' }));
	if (result.error) throw new SetupError(`Could not run \`${printable}\`: ${result.error.message}`);
	if (result.status !== 0) {
		throw new SetupError(`${label ?? printable} failed with exit code ${result.status}.`);
	}
}

async function confirm(question) {
	if (flags.yes) return true;
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = (await rl.question(`    ${question} [Y/n] `)).trim().toLowerCase();
		return answer === '' || answer === 'y' || answer === 'yes';
	} finally {
		rl.close();
	}
}

/** Minimal KEY=VALUE reader — enough for the env shapes this repo writes. */
function readEnv(path) {
	if (!existsSync(path)) return {};
	const values = {};
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
		if (!match) continue;
		values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
	}
	return values;
}

/** Resolves when something accepts a TCP connection on host:port. */
function probe(host, port, timeout = 1500) {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		const finish = (reachable) => {
			socket.destroy();
			resolve(reachable);
		};
		socket.setTimeout(timeout);
		socket.once('connect', () => finish(true));
		socket.once('timeout', () => finish(false));
		socket.once('error', () => finish(false));
		socket.connect(port, host);
	});
}

async function waitFor(services, attempts = 40) {
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		const pending = [];
		for (const service of services) {
			if (!(await probe(service.host, service.port))) pending.push(service.name);
		}
		if (pending.length === 0) return true;
		if (attempt === attempts) {
			throw new SetupError(
				`Timed out waiting for: ${pending.join(', ')}.`,
				'Check `docker compose ps` and the service logs, then re-run `pnpm setup`.'
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}
	return false;
}

/* ------------------------------------------------------------------- steps */

function checkToolchain() {
	step('Checking toolchain');

	const major = Number(process.versions.node.split('.')[0]);
	if (major < MIN_NODE_MAJOR) {
		throw new SetupError(
			`Node ${process.versions.node} is too old — this project needs Node ${MIN_NODE_MAJOR} or newer.`,
			'Install it from https://nodejs.org (or `nvm install 22`) and re-run `pnpm setup`.'
		);
	}
	ok(`Node ${process.versions.node}`);

	let pnpmVersion = capture('pnpm', ['--version']);
	if (!pnpmVersion) {
		info('pnpm not found — enabling it through corepack');
		capture('corepack', ['enable']);
		capture('corepack', ['prepare', `pnpm@${PNPM_VERSION}`, '--activate']);
		pnpmVersion = capture('pnpm', ['--version']);
	}
	if (!pnpmVersion) {
		throw new SetupError(
			'pnpm is not available and corepack could not install it.',
			`Install it manually with \`npm install -g pnpm@${PNPM_VERSION}\` and re-run.`
		);
	}
	ok(`pnpm ${pnpmVersion}`);
}

function createEnvFiles() {
	step('Preparing .env files');

	const targets = [
		{ example: join(BACKEND, '.env.example'), file: join(BACKEND, '.env') },
		{ example: join(DASHBOARD, '.env.example'), file: join(DASHBOARD, '.env') },
		{ example: join(ROOT, '.env.example'), file: join(ROOT, '.env') }
	];

	for (const { example, file } of targets) {
		const shown = relative(ROOT, file).replace(/\\/g, '/');
		if (existsSync(file)) {
			ok(`${shown} already exists — left untouched`);
			continue;
		}
		if (!existsSync(example)) {
			warn(`${shown}: no .env.example to copy from, skipping`);
			continue;
		}
		copyFileSync(example, file);
		ok(`${shown} created from .env.example`);
	}

	info('Defaults are development-only. Change the credentials before exposing this instance.');
}

/** Backing services, resolved from what the backend .env actually points at. */
function infraTargets() {
	const env = { ...readEnv(join(BACKEND, '.env.example')), ...readEnv(join(BACKEND, '.env')) };
	const services = [];

	const parseUrl = (value, fallbackPort) => {
		try {
			const url = new URL(value);
			return { host: url.hostname, port: Number(url.port) || fallbackPort };
		} catch {
			return null;
		}
	};

	const postgres = parseUrl(env.DATABASE_URL ?? '', 5432);
	if (postgres) services.push({ name: 'PostgreSQL', compose: 'postgres', ...postgres });

	const redis = parseUrl(env.REDIS_URL ?? '', 6379);
	if (redis) services.push({ name: 'Redis', compose: 'redis', ...redis });

	if (env.MINIO_ENDPOINT) {
		services.push({
			name: 'MinIO',
			compose: 'minio',
			host: env.MINIO_ENDPOINT,
			port: Number(env.MINIO_PORT) || 9000
		});
	}

	return services;
}

async function ensureInfra() {
	step('Checking backing services');

	if (flags.skipInfra) {
		warn('--skip-infra: not checking PostgreSQL, Redis, or MinIO.');
		return;
	}

	const services = infraTargets();
	if (services.length === 0) {
		warn('Could not read service URLs from apps/backend/.env — skipping the check.');
		return;
	}

	const missing = [];
	for (const service of services) {
		if (await probe(service.host, service.port)) {
			ok(`${service.name} reachable on ${service.host}:${service.port}`);
		} else {
			warn(`${service.name} NOT reachable on ${service.host}:${service.port}`);
			missing.push(service);
		}
	}
	if (missing.length === 0) return;

	// Only services pointed at this machine can be started locally; a .env
	// aimed at a remote host is the operator's to bring up, not ours.
	const startable = missing.filter((service) => ['localhost', '127.0.0.1', '::1'].includes(service.host));
	const hasDocker = Boolean(capture('docker', ['--version']));

	if (!hasDocker || startable.length !== missing.length) {
		throw new SetupError(
			`Not running: ${missing.map((service) => service.name).join(', ')}.`,
			hasDocker
				? 'Those point at a non-local host — start them there, then re-run `pnpm setup`.'
				: 'Start them yourself, or install Docker Desktop and re-run `pnpm setup` to have them started for you.\n' +
					'  Ports come from apps/backend/.env, so you can also point that file at services you already run.'
		);
	}

	const names = startable.map((service) => service.compose);
	console.log();
	if (!(await confirm(`Start ${names.join(', ')} with Docker now?`))) {
		throw new SetupError(
			'Backing services are not running.',
			`Start them with \`pnpm infra:up\` (or your own instances), then re-run \`pnpm setup\`.`
		);
	}

	run('docker', ['compose', 'up', '-d', ...names], { label: 'docker compose up' });
	info('Waiting for services to accept connections…');
	await waitFor(startable);
	for (const service of startable) ok(`${service.name} ready on ${service.host}:${service.port}`);
}

function installDependencies() {
	step('Installing dependencies');
	run('pnpm', ['install'], { label: 'pnpm install' });
	ok('Workspace dependencies installed');
}

/** Entry points `pnpm start` and the migration step depend on existing. */
const BUILD_ARTIFACTS = [
	{ label: 'API', path: join(BACKEND, 'dist', 'main.js') },
	{ label: 'builder worker', path: join(BACKEND, 'dist', 'main-worker.js') },
	{ label: 'migration runner', path: join(BACKEND, 'dist', 'database', 'migrate.js') },
	{ label: 'dashboard', path: join(DASHBOARD, 'build', 'index.js') }
];

function buildWorkspace() {
	step('Building packages');
	if (flags.skipBuild) {
		warn('--skip-build: nothing built. The API and dashboard cannot start until you run `pnpm build`.');
		return;
	}
	run('pnpm', ['-r', 'run', 'build'], { label: 'pnpm -r run build' });

	// A build tool can report success and still emit nothing (stale incremental
	// state is the classic cause). Checking the artifacts turns that into a
	// clear failure here instead of a puzzling one three steps later.
	const missing = BUILD_ARTIFACTS.filter((artifact) => !existsSync(artifact.path));
	if (missing.length > 0) {
		throw new SetupError(
			`The build reported success but produced no ${missing.map((a) => a.label).join(', ')} output.`,
			'Try `pnpm clean && pnpm build` — a stale build cache is the usual cause.'
		);
	}
	ok('SDK packages, plugins, themes, API, and dashboard built');
}

function migrateDatabase() {
	step('Applying database migrations');
	if (flags.skipMigrate) {
		warn('Skipped. Run `pnpm db:migrate` once the backend is built.');
		return;
	}

	const compiled = join(BACKEND, 'dist', 'database', 'migrate.js');
	if (!existsSync(compiled)) {
		throw new SetupError(
			'apps/backend/dist/database/migrate.js is missing, so migrations cannot run.',
			'Run `pnpm build` first, then `pnpm db:migrate`.'
		);
	}

	// cwd matters: migrate.js loads DATABASE_URL through `dotenv/config`, which
	// reads .env relative to the working directory.
	run('node', ['dist/database/migrate.js'], { cwd: BACKEND, label: 'Database migration' });
	ok('Schema is up to date');
}

function summary() {
	const dashboardEnv = readEnv(join(DASHBOARD, '.env'));
	const adminUrl = dashboardEnv.ORIGIN || 'http://localhost:5173';

	console.log(`\n${green(bold('Setup complete.'))}\n`);
	console.log(`  ${bold('Development')}   ${cyan('pnpm dev')}     API, builder worker, dashboard, and package watchers`);
	console.log(`  ${bold('Production')}    ${cyan('pnpm start')}   the same three processes, from the built output`);
	console.log(`\n  Then open ${cyan(adminUrl)} — the dashboard sends you to /setup to create`);
	console.log('  the first super admin and website.\n');
	console.log(dim('  Backing services:  pnpm infra:up / pnpm infra:down'));
	console.log(dim('  Everything in containers instead:  docker compose up -d\n'));
}

/* -------------------------------------------------------------------- main */

async function main() {
	console.log(bold('\nUnej CMS — native setup\n'));
	checkToolchain();
	createEnvFiles();
	await ensureInfra();
	installDependencies();
	buildWorkspace();
	migrateDatabase();
	summary();
}

main().catch((error) => {
	console.error(`\n${red(bold('Setup failed.'))} ${error.message}`);
	if (error.hint) console.error(`\n${error.hint}`);
	console.error();
	process.exit(1);
});
