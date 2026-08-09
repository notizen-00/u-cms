import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../runtime/shell.mjs';
import { ROOT } from '../runtime/paths.mjs';
import { UserFacingError, ok } from '../runtime/ui.mjs';

const BACKEND = join(ROOT, 'apps', 'backend');
const DASHBOARD = join(ROOT, 'apps', 'dashboard');

/** What `pnpm start` and the migration step depend on existing afterwards. */
const BUILD_ARTIFACTS = [
	{ label: 'API', path: join(BACKEND, 'dist', 'main.js') },
	{ label: 'builder worker', path: join(BACKEND, 'dist', 'main-worker.js') },
	{ label: 'migration runner', path: join(BACKEND, 'dist', 'database', 'migrate.js') },
	{ label: 'dashboard', path: join(DASHBOARD, 'build', 'index.js') }
];

export async function buildWorkspace() {
	await run('pnpm', ['-r', 'run', 'build'], { cwd: ROOT });

	// A build tool can report success and still emit nothing (stale
	// incremental state is the classic cause) — checking the artifacts turns
	// that into a clear failure here instead of a puzzling one steps later.
	const missing = BUILD_ARTIFACTS.filter((artifact) => !existsSync(artifact.path));
	if (missing.length > 0) {
		throw new UserFacingError(
			`The build reported success but produced no ${missing.map((a) => a.label).join(', ')} output.`,
			'Try `pnpm clean && pnpm build` — a stale build cache is the usual cause.'
		);
	}
	ok('SDK packages, plugins, themes, API, and dashboard built');
}
