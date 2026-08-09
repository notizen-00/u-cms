/**
 * Orchestrates PostgreSQL, Redis, and MinIO across the four infra modes
 * (PRD §4). This is the ONLY place that decides "reuse what's there" vs.
 * "install our own" — application code never sees that decision, only the
 * resulting `DATABASE_URL`/`REDIS_URL`/`MINIO_*` (PRD §42, Architecture
 * Boundary).
 *
 * Mode resolution, per service:
 *   system    reuse only — a compatible service MUST already answer at the
 *             configured host:port, or this throws with a clear remediation.
 *   portable  always install/run our own, unconditionally.
 *   auto      try reuse first; fall back to portable if nothing answers.
 *   docker    out of scope here — delegates to the already-working
 *             `docker compose` / `pnpm infra:up` path (PRD §4.4) rather than
 *             reimplementing container lifecycle in this manager.
 *
 * Idempotency (PRD §28) hinges on ONE distinction: did *this* process just
 * create `apps/backend/.env`, or did it already exist? A freshly-created env
 * only ever holds `.env.example`'s generic placeholder values, so going
 * portable is free to generate real credentials and overwrite those specific
 * lines. A pre-existing env might hold a previous portable install's real
 * generated credentials and port — those are read back and reused verbatim,
 * never regenerated, which is what makes "stop everything, run setup again"
 * (PRD §45) preserve content instead of quietly starting a second instance.
 */
import { createInterface } from 'node:readline/promises';
import { BACKEND_ENV_PATH, DASHBOARD_ENV_PATH, parseEnvFile, parseInfraTargets, setEnvValues } from '../setup/environment.mjs';
import { detectPlatform } from './platform.mjs';
import { isPortOpen } from './ports.mjs';
import { readOwnedPid } from './process.mjs';
import { readConfig, writeConfig } from './config.mjs';
import { RUNTIME_DIR, RUNTIME_LOGS_DIR, RUNTIME_PIDS_DIR, servicePaths } from './paths.mjs';
import { randomAlnum } from './secrets.mjs';
import { UserFacingError, bold, cyan, dim, green, info, ok, red, warn } from './ui.mjs';

import { resolvePostgresTarget } from './postgres/manifest.mjs';
import { createPostgresRuntime } from './postgres/postgres-runtime.mjs';
import { probePostgres } from './postgres/protocol.mjs';

import { resolveRedisTarget } from './redis/manifest.mjs';
import { createRedisRuntime } from './redis/redis-runtime.mjs';
import { probeRedisPing } from './redis/protocol.mjs';

import { resolveMinioTarget } from './minio/manifest.mjs';
import { createMinioRuntime } from './minio/minio-runtime.mjs';
import { probeMinioHealth } from './minio/protocol.mjs';

const SERVICE_LABELS = { postgres: 'PostgreSQL', redis: 'Redis', minio: 'MinIO' };

async function confirm(question, { yes }) {
	if (yes || !process.stdin.isTTY) return true;
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = (await rl.question(`${question} [Y/n] `)).trim().toLowerCase();
		return answer === '' || answer === 'y' || answer === 'yes';
	} finally {
		rl.close();
	}
}

function buildPostgresRuntime(target, resolution, known) {
	const paths = servicePaths('postgres');
	return createPostgresRuntime({
		target,
		runtimeDir: paths.runtimeDir,
		dataDir: paths.dataDir,
		logFile: paths.logFile,
		pidFile: paths.pidFile,
		credentials: { user: resolution.user, password: resolution.password, database: resolution.database },
		knownPort: known?.port ?? resolution.port
	});
}

function buildRedisRuntime(target, known) {
	const paths = servicePaths('redis');
	return createRedisRuntime({
		target,
		runtimeDir: paths.runtimeDir,
		dataDir: paths.dataDir,
		logFile: paths.logFile,
		pidFile: paths.pidFile,
		knownPort: known?.port
	});
}

function buildMinioRuntime(target, resolution, known) {
	const paths = servicePaths('minio');
	return createMinioRuntime({
		target,
		runtimeDir: paths.runtimeDir,
		dataDir: paths.dataDir,
		logFile: paths.logFile,
		pidFile: paths.pidFile,
		credentials: { accessKey: resolution.accessKey, secretKey: resolution.secretKey },
		knownPort: known?.port ?? resolution.port,
		knownConsolePort: known?.consolePort
	});
}

/** Every service factory this manager knows how to build, keyed by id — used by status/doctor/repair. */
async function allRuntimes(env) {
	const targets = parseInfraTargets(env);
	const { target: platformTarget } = detectPlatform();
	const config = await readConfig();

	return {
		postgres: buildPostgresRuntime(
			resolvePostgresTarget(platformTarget),
			targets.postgres ?? { user: 'unej_cms', password: '', database: 'unej_cms', port: 5432 },
			config.services.postgres
		),
		redis: buildRedisRuntime(resolveRedisTarget(platformTarget), config.services.redis),
		minio: buildMinioRuntime(
			resolveMinioTarget(platformTarget),
			targets.minio ?? { accessKey: 'unej_cms', secretKey: '', port: 9000 },
			config.services.minio
		)
	};
}

/* --------------------------------------------------------------- ensureAll */

/**
 * `backendEnvWasCreated` comes from the setup orchestrator's own (single)
 * call to `ensureEnvFile` — this function only ever reads
 * `apps/backend/.env`, never creates it, so that "was it created THIS run"
 * has exactly one source of truth instead of two calls racing to answer it.
 *
 * `explicitMode` means the caller passed `--infra=X` deliberately (setup.mjs
 * sets this only when the flag was actually typed, not defaulted). Without
 * it, each service's mode is instead pinned to what a PRIOR run already
 * decided for it (`config.json`'s `managed` flag) — this is what makes a
 * bare `pnpm dev`/`pnpm start`, or a second plain `pnpm setup`, correctly
 * leave an external/system service alone and correctly resume our own
 * still-installed portable one, instead of re-probing and possibly
 * reclassifying either one (PRD §22, §28).
 */
export async function ensureAll({ mode = 'auto', yes = false, backendEnvWasCreated = false, explicitMode = false } = {}) {
	if (mode === 'docker') {
		return {
			mode: 'docker',
			note: 'Docker-hosted infrastructure is managed by `docker compose` directly — run `pnpm infra:up`.'
		};
	}

	const env = await parseEnvFile(BACKEND_ENV_PATH);
	const targets = parseInfraTargets(env);
	const { target: platformTarget } = detectPlatform();
	const config = await readConfig();

	/** A prior run's recorded resolution wins unless the caller explicitly overrides it now. */
	function effectiveMode(known) {
		if (explicitMode || !known) return mode;
		return known.managed ? 'portable' : 'system';
	}

	const plan = await Promise.all([
		planPostgres({
			mode: effectiveMode(config.services.postgres),
			wasCreated: backendEnvWasCreated,
			target: targets.postgres,
			platformTarget,
			known: config.services.postgres
		}),
		planRedis({ mode: effectiveMode(config.services.redis), target: targets.redis, platformTarget, known: config.services.redis }),
		planMinio({
			mode: effectiveMode(config.services.minio),
			wasCreated: backendEnvWasCreated,
			target: targets.minio,
			platformTarget,
			known: config.services.minio
		})
	]);

	const needsInstall = plan.filter((entry) => entry.action === 'install');
	if (needsInstall.length > 0) {
		console.log(`\n${bold('Portable infrastructure to install:')}`);
		for (const entry of needsInstall) console.log(`  - ${SERVICE_LABELS[entry.service]}`);
		const proceed = await confirm(`\n${cyan('Download and run these locally?')}`, { yes });
		if (!proceed) {
			throw new UserFacingError(
				'Portable infrastructure declined.',
				'Start your own PostgreSQL/Redis/MinIO and re-run, or re-run with `--yes` to accept.'
			);
		}
	}

	const results = {};
	for (const entry of plan) {
		results[entry.service] = await applyPlan(entry);
	}

	await writeConfig({
		services: {
			postgres: results.postgres.config,
			redis: results.redis.config,
			minio: results.minio.config
		}
	});

	return { mode, services: results };
}

async function planPostgres({ mode, wasCreated, target, platformTarget, known }) {
	const probeTarget = target ?? { host: '127.0.0.1', port: 5432, user: 'unej_cms', password: 'unej_cms', database: 'unej_cms' };

	if (mode !== 'portable') {
		const reachable = await isPortOpen(probeTarget.port, probeTarget.host);
		const compatible = reachable && (await probePostgres({ host: probeTarget.host, port: probeTarget.port, user: probeTarget.user, database: probeTarget.database }));
		if (compatible) return { service: 'postgres', action: 'reuse', target: probeTarget };
		if (mode === 'system') {
			throw new UserFacingError(
				'PostgreSQL was not found.',
				`Install PostgreSQL, or run:\n\n  pnpm setup --infra=portable`
			);
		}
	}

	const resolved = resolvePostgresTarget(platformTarget);
	if (!resolved) throw new UserFacingError(`No portable PostgreSQL build for ${platformTarget}.`);

	// A fresh env holds .env.example's shared placeholder credentials — never
	// let those become a real portable instance's actual password. A
	// pre-existing env's values ARE a previous portable install's real,
	// already-generated credentials, and must be reused verbatim.
	const credentials = wasCreated || !known
		? { user: 'unej_cms', password: randomAlnum(), database: 'unej_cms' }
		: { user: probeTarget.user, password: probeTarget.password, database: probeTarget.database };

	return { service: 'postgres', action: 'install', target: resolved, credentials, known, wasCreated };
}

async function planRedis({ mode, target, platformTarget, known }) {
	const probeTarget = target ?? { host: '127.0.0.1', port: 6379 };

	if (mode !== 'portable') {
		const reachable = await isPortOpen(probeTarget.port, probeTarget.host);
		const compatible = reachable && (await probeRedisPing({ host: probeTarget.host, port: probeTarget.port }));
		if (compatible) return { service: 'redis', action: 'reuse', target: probeTarget };
		if (mode === 'system') {
			throw new UserFacingError('Redis was not found.', `Install a Redis-compatible server, or run:\n\n  pnpm setup --infra=portable`);
		}
	}

	const resolved = resolveRedisTarget(platformTarget);
	return { service: 'redis', action: 'install', target: resolved, known };
}

async function planMinio({ mode, wasCreated, target, platformTarget, known }) {
	const probeTarget = target ?? { host: '127.0.0.1', port: 9000, accessKey: 'unej_cms', secretKey: 'unej_cms_secret' };

	if (mode !== 'portable') {
		const reachable = await isPortOpen(probeTarget.port, probeTarget.host);
		const compatible = reachable && (await probeMinioHealth({ host: probeTarget.host, port: probeTarget.port }));
		if (compatible) return { service: 'minio', action: 'reuse', target: probeTarget };
		if (mode === 'system') {
			throw new UserFacingError('MinIO was not found.', `Install MinIO, or run:\n\n  pnpm setup --infra=portable`);
		}
	}

	const resolved = resolveMinioTarget(platformTarget);
	if (!resolved) throw new UserFacingError(`No portable MinIO build for ${platformTarget}.`);

	const credentials = wasCreated || !known
		? { accessKey: 'unej_cms', secretKey: randomAlnum() }
		: { accessKey: probeTarget.accessKey, secretKey: probeTarget.secretKey };

	return { service: 'minio', action: 'install', target: resolved, credentials, known, wasCreated };
}

async function applyPlan(entry) {
	if (entry.action === 'reuse') {
		info(`${SERVICE_LABELS[entry.service]}: reusing existing service at ${entry.target.host}:${entry.target.port}`);
		return { config: { managed: false, host: entry.target.host, port: entry.target.port } };
	}

	const label = SERVICE_LABELS[entry.service];
	const runtime =
		entry.service === 'postgres'
			? buildPostgresRuntime(entry.target, entry.credentials, entry.known)
			: entry.service === 'redis'
				? buildRedisRuntime(entry.target, entry.known)
				: buildMinioRuntime(entry.target, entry.credentials, entry.known);

	// Most `install()` calls here are no-ops (already installed, prior run) —
	// only announce a real download when one is actually about to happen, so
	// `pnpm dev`'s common case ("just restart what's already there") doesn't
	// print a misleading "installing" every time.
	const alreadyInstalled = entry.known?.managed === true;
	console.log(`${dim('·')} ${label}: ${alreadyInstalled ? 'starting' : 'installing portable runtime'}…`);

	await runtime.install();
	await runtime.initialize();
	const state = await runtime.start();
	ok(`${label}: running on 127.0.0.1:${state.port}${state.consolePort ? ` (console ${state.consolePort})` : ''}`);

	if (entry.wasCreated) {
		await writeResolvedEnv(entry.service, { ...state, credentials: entry.credentials });
	}

	return {
		config: {
			managed: true,
			host: '127.0.0.1',
			port: state.port,
			...(state.consolePort ? { consolePort: state.consolePort } : {})
		}
	};
}

/** Only called immediately after this process created apps/backend/.env — see module doc comment. */
async function writeResolvedEnv(service, state) {
	if (service === 'postgres') {
		const { user, password, database } = state.credentials;
		await setEnvValues(BACKEND_ENV_PATH, {
			DATABASE_URL: `postgres://${user}:${password}@127.0.0.1:${state.port}/${database}`
		});
	} else if (service === 'redis') {
		await setEnvValues(BACKEND_ENV_PATH, { REDIS_URL: `redis://127.0.0.1:${state.port}` });
	} else if (service === 'minio') {
		const { accessKey, secretKey } = state.credentials;
		await setEnvValues(BACKEND_ENV_PATH, {
			MINIO_ENDPOINT: '127.0.0.1',
			MINIO_PORT: String(state.port),
			MINIO_ACCESS_KEY: accessKey,
			MINIO_SECRET_KEY: secretKey,
			MINIO_PUBLIC_URL: `http://127.0.0.1:${state.port}`
		});
	}
}

/* -------------------------------------------------------------- lifecycle */

/** Stops only services this tool's own config.json marks as `managed: true` — never touches system/external ones (PRD §22, §23). */
export async function stopManaged() {
	const env = await parseEnvFile(BACKEND_ENV_PATH);
	const runtimes = await allRuntimes(env);
	const config = await readConfig();

	for (const [service, runtime] of Object.entries(runtimes)) {
		const known = config.services[service];
		if (!known?.managed) continue;
		console.log(`${dim('·')} Stopping ${SERVICE_LABELS[service]}…`);
		await runtime.stop();
		ok(`${SERVICE_LABELS[service]} stopped`);
	}
}

export async function status() {
	const env = await parseEnvFile(BACKEND_ENV_PATH);
	const runtimes = await allRuntimes(env);
	const config = await readConfig();

	const report = {};
	for (const [service, runtime] of Object.entries(runtimes)) {
		const known = config.services[service];
		report[service] = { managed: known?.managed ?? null, ...(await runtime.status()) };
	}
	return report;
}

const pass = (text) => `${green('✓')} ${text}`;
const failLine = (text) => `${red('✗')} ${text}`;

/** Deeper than status(): protocol-level probes plus a read of both app .env files. */
export async function doctor() {
	const platform = detectPlatform();
	const env = await parseEnvFile(BACKEND_ENV_PATH);
	const runtimes = await allRuntimes(env);
	const config = await readConfig();
	const targets = parseInfraTargets(env);

	const lines = [];
	lines.push(bold('UNEJ CMS Runtime Doctor'));
	lines.push('');
	lines.push(bold('Platform'));
	lines.push(pass(`${platform.platform} ${platform.arch}`));
	lines.push('');

	const healthResults = {};
	for (const [service, runtime] of Object.entries(runtimes)) {
		const known = config.services[service];
		const runtimeStatus = await runtime.status();
		const healthy = runtimeStatus.running ? await runtime.healthCheck() : false;
		healthResults[service] = runtimeStatus.running && healthy;

		lines.push(bold(SERVICE_LABELS[service]));
		lines.push(
			known?.managed ? pass('portable') : known?.managed === false ? pass('external / system') : failLine('unresolved (run `pnpm setup`)')
		);
		lines.push(runtimeStatus.running ? pass('running') : failLine('not running'));
		if (runtimeStatus.port) lines.push(pass(`127.0.0.1:${runtimeStatus.port}`));
		if (runtimeStatus.consolePort) lines.push(pass(`Console: 127.0.0.1:${runtimeStatus.consolePort}`));
		lines.push(healthy ? pass('protocol healthy') : failLine('protocol not responding'));
		lines.push('');
	}

	lines.push(bold('Backend configuration'));
	lines.push(targets.postgres && targets.redis && targets.minio ? pass('valid') : failLine('missing required values'));
	lines.push('');
	lines.push(bold('Dashboard configuration'));
	const dashboardEnv = await parseEnvFile(DASHBOARD_ENV_PATH);
	lines.push(dashboardEnv.PUBLIC_API_URL ? pass('valid') : failLine('missing PUBLIC_API_URL'));

	const allHealthy = Object.values(healthResults).every(Boolean);
	lines.push('');
	lines.push(bold('Result:'));
	lines.push(allHealthy ? 'All checks passed.' : 'Some checks failed — see above.');

	console.log(lines.join('\n'));
	return allHealthy;
}

/** Re-downloads portable runtime binaries without touching `.data` (PRD §30). */
export async function repair() {
	const { rm } = await import('node:fs/promises');
	const { writeManifest } = await import('./manifest.mjs');

	await stopManaged();
	await rm(RUNTIME_DIR, { recursive: true, force: true });
	await writeManifest({ schemaVersion: 1, ...detectPlatform(), services: {} });
	warn('Portable runtime binaries cleared — run `pnpm setup` to reinstall them (your data in .data/ is untouched).');
}

/** Destructive: stops managed services and deletes their `.data` (PRD §29). */
export async function reset({ yes = false } = {}) {
	const { rm } = await import('node:fs/promises');
	const config = await readConfig();
	const managedServices = Object.entries(config.services).filter(([, value]) => value?.managed);

	if (managedServices.length === 0) {
		warn('No portable services are recorded as managed — nothing to reset.');
		return;
	}

	console.log(`\n${bold('WARNING')}\n`);
	console.log('This will delete:\n');
	for (const [service] of managedServices) console.log(`  - local ${SERVICE_LABELS[service]} data`);
	console.log('\nThis cannot be undone.\n');

	if (!(await confirm('Continue?', { yes }))) {
		info('Reset cancelled.');
		return;
	}

	await stopManaged();
	for (const [service] of managedServices) {
		await rm(servicePaths(service).dataDir, { recursive: true, force: true });
	}
	await writeConfig({ services: {} });
	ok('Portable data reset.');
}

export { RUNTIME_DIR, RUNTIME_LOGS_DIR, RUNTIME_PIDS_DIR };
