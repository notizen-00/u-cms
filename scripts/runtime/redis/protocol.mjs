/**
 * Raw RESP `PING` — enough to prove a real Redis-protocol server is
 * listening, without adding a Redis client library as a dependency of the
 * installer itself.
 */
import net from 'node:net';

export function probeRedisPing({ host, port, timeoutMs = 3000 }) {
	return new Promise((resolve) => {
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(value);
		};

		const socket = net.createConnection(port, host, () => {
			socket.write('PING\r\n');
		});

		let buffer = '';
		socket.on('data', (chunk) => {
			buffer += chunk.toString('latin1');
			if (buffer.includes('\r\n')) finish(buffer.startsWith('+PONG'));
		});

		socket.on('error', () => finish(false));
		socket.setTimeout(timeoutMs, () => finish(false));
	});
}

/** Fire-and-forget graceful shutdown; Redis closes the connection itself, so a reset on our end is expected. */
export function sendRedisShutdown({ host, port, timeoutMs = 3000 }) {
	return new Promise((resolve) => {
		const socket = net.createConnection(port, host, () => {
			socket.write('SHUTDOWN SAVE\r\n');
		});
		socket.on('error', () => resolve());
		socket.on('close', () => resolve());
		socket.setTimeout(timeoutMs, () => {
			socket.destroy();
			resolve();
		});
	});
}
