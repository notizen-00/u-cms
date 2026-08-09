#!/usr/bin/env node
/** Native static-site preview for builder output (the nginx equivalent in Docker). */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BACKEND = resolve(ROOT, 'apps', 'backend');

function readEnv(path) {
	if (!existsSync(path)) return {};
	const values = {};
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
		if (!match) continue;
		values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
	}
	return values;
}

const rootEnv = readEnv(resolve(ROOT, '.env'));
const backendEnv = readEnv(resolve(BACKEND, '.env'));
const port = Number(process.env.PUBLIC_SITE_PORT ?? rootEnv.PUBLIC_SITE_PORT) || 8080;
const outputDir = resolve(BACKEND, process.env.BUILD_OUTPUT_DIR ?? backendEnv.BUILD_OUTPUT_DIR ?? './data/sites');
const host = process.env.PUBLIC_SITE_BIND ?? '127.0.0.1';

const CONTENT_TYPES = {
	'.avif': 'image/avif',
	'.css': 'text/css; charset=utf-8',
	'.gif': 'image/gif',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain; charset=utf-8',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};

function sendText(response, status, text) {
	response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
	response.end(text);
}

function requestTarget(request) {
	const hostname = (request.headers.host ?? '').split(':')[0].toLowerCase();
	const domainMatch = /^([a-z0-9-]+)\.localhost$/.exec(hostname);
	let pathname;
	try {
		pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname);
	} catch {
		return null;
	}

	if (domainMatch) return { slug: domainMatch[1], pathname };
	if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;

	const match = /^\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
	if (!match) return { index: true };
	return { slug: match[1], pathname: match[2] || '/' };
}

function safeFile(siteRoot, pathname) {
	const candidate = resolve(siteRoot, `.${pathname}`);
	const rel = relative(siteRoot, candidate);
	if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;

	try {
		const info = statSync(candidate);
		if (info.isFile()) return { file: candidate };
		if (info.isDirectory()) {
			const index = resolve(candidate, 'index.html');
			if (statSync(index).isFile()) return { file: index, directory: true };
		}
	} catch {
		// Try generated directory-style routes below.
	}

	try {
		const index = resolve(candidate, 'index.html');
		if (statSync(index).isFile()) return { file: index, directory: true };
	} catch {
		return null;
	}
	return null;
}

const server = createServer((request, response) => {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		response.writeHead(405, { allow: 'GET, HEAD' });
		response.end();
		return;
	}

	const target = requestTarget(request);
	if (!target) {
		sendText(response, 404, 'Site not found.\n');
		return;
	}
	if (target.index) {
		sendText(response, 200, 'UNEJ CMS static preview.\nUse http://{site-slug}.localhost:8080/ to view a published site.\n');
		return;
	}

	const siteRoot = resolve(outputDir, target.slug, 'current');
	const result = safeFile(siteRoot, target.pathname);
	if (!result) {
		sendText(response, 404, `No published build found for ${target.slug}.\n`);
		return;
	}

	const originalUrl = new URL(request.url ?? '/', 'http://localhost');
	if (result.directory && !originalUrl.pathname.endsWith('/')) {
		response.writeHead(301, { location: `${originalUrl.pathname}/${originalUrl.search}` });
		response.end();
		return;
	}

	const info = statSync(result.file);
	response.writeHead(200, {
		'content-type': CONTENT_TYPES[extname(result.file).toLowerCase()] ?? 'application/octet-stream',
		'content-length': info.size,
		'cache-control': 'no-store'
	});
	if (request.method === 'HEAD') response.end();
	else createReadStream(result.file).pipe(response);
});

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') console.error(`Static preview port ${port} is already in use.`);
	else console.error(error);
	process.exit(1);
});

server.listen(port, host, () => {
	console.log(`Static site preview ready at http://{site-slug}.localhost:${port}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => server.close(() => process.exit(0)));
}
