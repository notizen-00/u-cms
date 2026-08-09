import { run } from '../runtime/shell.mjs';
import { ROOT } from '../runtime/paths.mjs';
import { ok } from '../runtime/ui.mjs';

export async function installDependencies() {
	await run('pnpm', ['install'], { cwd: ROOT });
	ok('Workspace dependencies installed');
}
