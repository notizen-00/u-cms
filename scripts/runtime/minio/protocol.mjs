/** MinIO's own liveness endpoint — a real health check, not just an open port. */
import http from 'node:http';

export function probeMinioHealth({ host, port, timeoutMs = 3000 }) {
	return new Promise((resolve) => {
		const request = http.get({ host, port, path: '/minio/health/live', timeout: timeoutMs }, (response) => {
			response.resume();
			resolve(response.statusCode === 200);
		});
		request.on('timeout', () => request.destroy());
		request.on('error', () => resolve(false));
	});
}
