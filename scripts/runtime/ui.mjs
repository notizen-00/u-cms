/**
 * Shared CLI output styling — one place so `setup`, `runtime:*`, `dev`, and
 * `start` all read as the same tool instead of four differently-formatted
 * scripts.
 */
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

export const bold = (text) => paint('1', text);
export const dim = (text) => paint('2', text);
export const green = (text) => paint('32', text);
export const yellow = (text) => paint('33', text);
export const red = (text) => paint('31', text);
export const cyan = (text) => paint('36', text);

export const ok = (text) => console.log(`${green('✓')} ${text}`);
export const fail = (text) => console.log(`${red('✗')} ${text}`);
export const warn = (text) => console.log(`${yellow('!')} ${text}`);
export const info = (text) => console.log(`${dim('·')} ${dim(text)}`);
export const heading = (text) => console.log(`\n${bold(text)}`);

/**
 * A failure with a plain-English cause and, optionally, a next step — the
 * PRD's "Failure UX" contract (§34): never let a raw stack trace be the only
 * information shown, unless `--debug` was passed.
 */
export class UserFacingError extends Error {
	constructor(message, hint) {
		super(message);
		this.name = 'UserFacingError';
		this.hint = hint;
	}
}

export function printError(error, { debug = false } = {}) {
	if (error instanceof UserFacingError) {
		console.error(`\n${red(bold(error.message))}`);
		if (error.hint) console.error(`\n${error.hint}`);
	} else {
		console.error(`\n${red(bold('Unexpected error:'))} ${error.message}`);
	}
	if (debug && error.stack) {
		console.error(`\n${dim(error.stack)}`);
	} else if (!(error instanceof UserFacingError)) {
		console.error(dim('\nRe-run with --debug to see the full stack trace.'));
	}
	console.error();
}
