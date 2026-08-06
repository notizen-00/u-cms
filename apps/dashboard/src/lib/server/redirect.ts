const LOCAL_ORIGIN = 'http://admin.local';

/** Accept only same-origin absolute paths; rejects protocol-relative and backslash-normalized redirects. */
export function safeLocalRedirect(value: string | null | undefined, fallback = '/'): string {
	if (!value || !value.startsWith('/') || value.includes('\\')) return fallback;

	try {
		const target = new URL(value, LOCAL_ORIGIN);
		if (target.origin !== LOCAL_ORIGIN) return fallback;
		return `${target.pathname}${target.search}${target.hash}`;
	} catch {
		return fallback;
	}
}
