/**
 * Port availability probing and selection for the portable runtime.
 *
 * "Available" here means "nothing accepts a connection right now" — good
 * enough for picking a port to bind and for the coarse existing-service probe
 * in runtime-manager.mjs (which then does its own protocol-level check on
 * top, per PRD §27, rather than trusting an open port alone).
 */
import net from 'node:net';

/** True if something is listening on host:port. */
export function isPortOpen(port, host = '127.0.0.1', timeout = 800) {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		const finish = (open) => {
			socket.destroy();
			resolve(open);
		};
		socket.setTimeout(timeout);
		socket.once('connect', () => finish(true));
		socket.once('timeout', () => finish(false));
		socket.once('error', () => finish(false));
		socket.connect(port, host);
	});
}

/** True if `port` is free to bind on `host` — actually binds and releases it. */
export function isPortFree(port, host = '127.0.0.1') {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.listen(port, host, () => {
			server.close(() => resolve(true));
		});
	});
}

/**
 * Returns `preferred` if free, otherwise the next free port after it (up to
 * `maxAttempts` steps). Only ever called for ports THIS tool will bind itself
 * (portable services) — a port already owned by someone else's service is a
 * different code path (reuse it, never relocate it; PRD §26).
 */
export async function findAvailablePort(preferred, { host = '127.0.0.1', maxAttempts = 50 } = {}) {
	for (let port = preferred; port < preferred + maxAttempts; port += 1) {
		if (await isPortFree(port, host)) return port;
	}
	throw new Error(`No free port found starting at ${preferred} (tried ${maxAttempts} ports on ${host}).`);
}
