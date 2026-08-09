/** Node/pnpm toolchain check — the first thing setup verifies, since nothing else can run without it. */
import { capture, run } from '../runtime/shell.mjs';
import { UserFacingError, ok } from '../runtime/ui.mjs';

const MIN_NODE_MAJOR = 22;
const PNPM_VERSION = '10.12.4';

export async function checkToolchain() {
	const major = Number(process.versions.node.split('.')[0]);
	if (major < MIN_NODE_MAJOR) {
		throw new UserFacingError(
			`Node ${process.versions.node} is too old — this project needs Node ${MIN_NODE_MAJOR} or newer.`,
			'Install it from https://nodejs.org (or `nvm install 22`) and re-run `pnpm setup`.'
		);
	}
	ok(`Node ${process.versions.node}`);

	let pnpmVersion = await capture('pnpm', ['--version']);
	if (!pnpmVersion) {
		await run('corepack', ['enable']).catch(() => {});
		await run('corepack', ['prepare', `pnpm@${PNPM_VERSION}`, '--activate']).catch(() => {});
		pnpmVersion = await capture('pnpm', ['--version']);
	}
	if (!pnpmVersion) {
		throw new UserFacingError(
			'pnpm is not available and corepack could not install it.',
			`Install it manually with \`npm install -g pnpm@${PNPM_VERSION}\` and re-run.`
		);
	}
	ok(`pnpm ${pnpmVersion}`);
}
