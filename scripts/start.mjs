#!/usr/bin/env node
/**
 * Runs the three long-lived processes of a native production install — API,
 * builder worker, dashboard — from one terminal, with prefixed output.
 *
 * Deliberately dependency-free (no concurrently/pm2): `pnpm setup` must work on
 * a clean checkout before anything is installed, and this is the command it
 * points people at afterwards. For a real deployment, run each process under
 * your own supervisor (systemd, pm2, Docker) instead.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND = join(ROOT, 'apps', 'backend');
const DASHBOARD = join(ROOT, 'apps', 'dashboard');

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

/**
 * Minimal KEY=VALUE reader.
 *
 * The backend gets its .env for free through Nest's ConfigModule, but the
 * dashboard does not: SvelteKit's `$env/dynamic/*` reads `process.env` at
 * runtime and adapter-node never loads a .env file, so a customised
 * PUBLIC_API_URL would be silently ignored by a native production run. Loading
 * each service's own file here makes those files mean the same thing in dev
 * and in production.
 */
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

const backendEnv = readEnv(join(BACKEND, '.env'));
const dashboardEnv = readEnv(join(DASHBOARD, '.env'));

const apiPort = process.env.PORT ?? backendEnv.PORT ?? '3000';
// adapter-node defaults to 3000, which the API already holds.
const dashboardPort = process.env.DASHBOARD_PORT ?? dashboardEnv.PORT ?? '5173';

const services = [
	{ name: 'api', color: '36', cwd: BACKEND, entry: 'dist/main.js', file: backendEnv },
	{ name: 'worker', color: '35', cwd: BACKEND, entry: 'dist/main-worker.js', file: backendEnv },
	{
		name: 'dashboard',
		color: '32',
		cwd: DASHBOARD,
		entry: 'build/index.js',
		file: dashboardEnv,
		overrides: { PORT: dashboardPort }
	}
];

const missing = services.filter((service) => !existsSync(join(service.cwd, service.entry)));
if (missing.length > 0) {
	console.error(
		`\n${paint('31', 'Nothing to start:')} ${missing.map((s) => s.name).join(', ')} ` +
			`have no build output.\n\nRun \`pnpm build\` (or \`pnpm setup\`) first.\n`
	);
	process.exit(1);
}

const width = Math.max(...services.map((service) => service.name.length));
const children = [];
let shuttingDown = false;

/** Prefixes each line so three interleaved logs stay readable. */
function pipe(stream, label, target) {
	let buffer = '';
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => {
		buffer += chunk;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) target.write(`${label} ${line}\n`);
	});
	stream.on('end', () => {
		if (buffer) target.write(`${label} ${buffer}\n`);
	});
}

function shutdown(exitCode) {
	if (shuttingDown) return;
	shuttingDown = true;
	for (const child of children) {
		if (child.exitCode === null && child.signalCode === null) child.kill();
	}
	setTimeout(() => process.exit(exitCode), 300).unref();
}

for (const service of services) {
	const label = paint(service.color, `[${service.name.padEnd(width)}]`);
	const child = spawn(process.execPath, [service.entry], {
		cwd: service.cwd,
		// An explicitly exported variable outranks the .env file, matching how
		// dotenv itself resolves the two.
		env: {
			...service.file,
			...process.env,
			NODE_ENV: process.env.NODE_ENV ?? 'production',
			...service.overrides
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});

	pipe(child.stdout, label, process.stdout);
	pipe(child.stderr, label, process.stderr);

	child.on('exit', (code, signal) => {
		if (shuttingDown) return;
		// One process dying leaves a half-working instance, which is more
		// confusing than a clean stop — take the whole group down with it.
		console.error(`${label} exited (${signal ?? `code ${code}`}); stopping the rest.`);
		shutdown(code ?? 1);
	});

	children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(
	`\n${paint('1', 'Unej CMS running.')}  ` +
		`dashboard http://localhost:${dashboardPort}  ·  api http://localhost:${apiPort}\n` +
		`${paint('2', 'Press Ctrl+C to stop all three.')}\n`
);
