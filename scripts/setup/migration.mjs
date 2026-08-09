import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../runtime/shell.mjs';
import { ROOT } from '../runtime/paths.mjs';
import { UserFacingError, ok } from '../runtime/ui.mjs';

const BACKEND = join(ROOT, 'apps', 'backend');

export async function migrateDatabase() {
	const compiled = join(BACKEND, 'dist', 'database', 'migrate.js');
	if (!existsSync(compiled)) {
		throw new UserFacingError(
			'apps/backend/dist/database/migrate.js is missing, so migrations cannot run.',
			'Run `pnpm build` first, then `pnpm db:migrate`.'
		);
	}
	// cwd matters: migrate.js loads DATABASE_URL through `dotenv/config`, which
	// reads .env relative to the working directory.
	await run('node', ['dist/database/migrate.js'], { cwd: BACKEND });
	ok('Schema is up to date');
}
