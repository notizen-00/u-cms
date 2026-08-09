// Throwaway probe: minimal Postgres wire-protocol handshake to confirm our
// single-user-mode CREATE DATABASE actually took effect, without psql.
import { createHash } from 'node:crypto';
import net from 'node:net';

const [, , host, port, user, password, database] = process.argv;

function u32(n) {
	const b = Buffer.alloc(4);
	b.writeUInt32BE(n, 0);
	return b;
}

function cString(value) {
	return Buffer.concat([Buffer.from(value, 'utf8'), Buffer.from([0])]);
}

function startupMessage() {
	const pairs = ['user', user, 'database', database, 'client_encoding', 'UTF8'];
	// One more null byte terminates the whole key/value list, beyond each
	// string's own null terminator.
	const params = Buffer.concat([...pairs.map(cString), Buffer.from([0])]);
	const body = Buffer.concat([u32(196608), params]);
	return Buffer.concat([u32(body.length + 4), body]);
}

function md5AuthResponse(salt) {
	const inner = createHash('md5').update(password + user).digest('hex');
	const outer = 'md5' + createHash('md5').update(Buffer.concat([Buffer.from(inner), salt])).digest('hex');
	const body = Buffer.concat([Buffer.from(outer, 'utf8'), Buffer.from([0])]);
	return Buffer.concat([Buffer.from('p'), u32(body.length + 4), body]);
}

const socket = net.createConnection(Number(port), host, () => {
	socket.write(startupMessage());
});

let buffer = Buffer.alloc(0);
socket.on('data', (chunk) => {
	buffer = Buffer.concat([buffer, chunk]);
	while (buffer.length >= 5) {
		const type = String.fromCharCode(buffer[0]);
		const len = buffer.readUInt32BE(1);
		if (buffer.length < len + 1) break;
		const payload = buffer.subarray(5, len + 1);
		buffer = buffer.subarray(len + 1);

		if (type === 'R') {
			const authType = payload.readUInt32BE(0);
			if (authType === 0) {
				console.log('AUTH_OK (trust)');
			} else if (authType === 5) {
				socket.write(md5AuthResponse(payload.subarray(4, 8)));
			} else if (authType === 10) {
				console.log('SASL requested (scram-sha-256) — auth mechanism confirmed, stopping probe here.');
				socket.end();
			}
		} else if (type === 'E') {
			console.log('ERROR:', payload.toString('utf8').replace(/\0/g, ' | '));
			socket.end();
		} else if (type === 'Z') {
			console.log('READY_FOR_QUERY — connection + auth fully succeeded.');
			socket.end();
		}
	}
});

socket.on('error', (err) => console.log('SOCKET ERROR:', err.message));
socket.setTimeout(5000, () => {
	console.log('TIMEOUT');
	socket.destroy();
});
