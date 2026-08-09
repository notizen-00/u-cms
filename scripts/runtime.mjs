#!/usr/bin/env node
/**
 * CLI dispatcher for `pnpm runtime:*` — start/stop/status/doctor/repair/reset
 * against the portable infrastructure (PRD §24–25, §35). All the actual
 * logic lives in runtime/runtime-manager.mjs; this file is just argv parsing.
 */
import { ensureAll, doctor, repair, reset, status, stopManaged } from './runtime/runtime-manager.mjs';
import { bold, cyan, dim, green, heading, printError, red } from './runtime/ui.mjs';

const [subcommand, ...rest] = process.argv.slice(2);
const args = new Set(rest);
const flags = { yes: args.has('--yes') || args.has('-y'), debug: args.has('--debug') };

const SERVICE_LABELS = { postgres: 'PostgreSQL', redis: 'Redis', minio: 'MinIO' };

async function cmdStart() {
	heading('Starting managed infrastructure');
	const result = await ensureAll({ mode: 'auto', yes: flags.yes });
	if (result.mode === 'docker') {
		console.log(dim(result.note));
		return;
	}
	console.log(`\n${bold('Done.')}`);
}

async function cmdStop() {
	heading('Stopping managed infrastructure');
	await stopManaged();
}

async function cmdStatus() {
	heading('Runtime status');
	const report = await status();
	for (const [service, info] of Object.entries(report)) {
		const managedLabel = info.managed === true ? 'portable' : info.managed === false ? 'external/system' : 'unresolved';
		const runningLabel = info.running ? green('running') : red('stopped');
		const portLabel = info.port ? ` @ 127.0.0.1:${info.port}${info.consolePort ? ` (console ${info.consolePort})` : ''}` : '';
		console.log(`${bold(SERVICE_LABELS[service])}  ${managedLabel}  ${runningLabel}${portLabel}`);
	}
}

async function cmdDoctor() {
	const healthy = await doctor();
	if (!healthy) process.exitCode = 1;
}

async function cmdRepair() {
	heading('Repairing portable runtime');
	await repair();
}

async function cmdReset() {
	await reset({ yes: flags.yes });
}

const COMMANDS = {
	start: cmdStart,
	stop: cmdStop,
	status: cmdStatus,
	doctor: cmdDoctor,
	repair: cmdRepair,
	reset: cmdReset
};

async function main() {
	const handler = COMMANDS[subcommand];
	if (!handler) {
		console.error(`Usage: pnpm runtime:<${Object.keys(COMMANDS).join('|')}>`);
		process.exit(1);
	}
	await handler();
}

main().catch((error) => {
	printError(error, { debug: flags.debug });
	process.exit(1);
});
