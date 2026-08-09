/**
 * Minimal Postgres wire-protocol handshake — just enough to prove "a real
 * Postgres backend is listening here" (PRD §27) without a full client
 * library. Reaching any well-formed backend message (an authentication
 * request, or an error response with Postgres's structured fields) proves
 * the protocol; completing authentication is deliberately out of scope; a
 * devops liveness probe has no business re-implementing SCRAM-SHA-256.
 */
import net from 'node:net';

function u32(n) {
	const buf = Buffer.alloc(4);
	buf.writeUInt32BE(n, 0);
	return buf;
}

function cString(value) {
	return Buffer.concat([Buffer.from(value, 'utf8'), Buffer.from([0])]);
}

function startupMessage({ user, database }) {
	const pairs = ['user', user, 'database', database, 'client_encoding', 'UTF8'];
	const params = Buffer.concat([...pairs.map(cString), Buffer.from([0])]);
	const body = Buffer.concat([u32(196608), params]);
	return Buffer.concat([u32(body.length + 4), body]);
}

/**
 * Resolves `true` once the server responds with any recognizable Postgres
 * backend message; `false` on timeout, refusal, or a non-Postgres response.
 */
export function probePostgres({ host, port, user = 'postgres', database = 'postgres', timeoutMs = 3000 }) {
	return new Promise((resolve) => {
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(value);
		};

		const socket = net.createConnection(port, host, () => {
			socket.write(startupMessage({ user, database }));
		});

		let buffer = Buffer.alloc(0);
		socket.on('data', (chunk) => {
			buffer = Buffer.concat([buffer, chunk]);
			if (buffer.length < 5) return;
			const type = String.fromCharCode(buffer[0]);
			// 'R' = AuthenticationXxx, 'E' = ErrorResponse — both only ever come
			// from a genuine Postgres backend, whichever this connection gets.
			if (type === 'R' || type === 'E') finish(true);
			else finish(false);
		});

		socket.on('error', () => finish(false));
		socket.setTimeout(timeoutMs, () => finish(false));
	});
}
