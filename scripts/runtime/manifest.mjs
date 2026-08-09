/**
 * `.runtime/manifest.json` — what's actually been downloaded and verified
 * (PRD §7). Read before re-downloading anything (idempotency), written after
 * a checksum passes (never before — a manifest entry is a promise that the
 * binary at that path is genuine).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { detectPlatform } from './platform.mjs';
import { MANIFEST_PATH } from './paths.mjs';

const SCHEMA_VERSION = 1;

function emptyManifest() {
	const { platform, arch } = detectPlatform();
	return { schemaVersion: SCHEMA_VERSION, platform, arch, services: {} };
}

export async function readManifest() {
	try {
		const raw = await readFile(MANIFEST_PATH, 'utf8');
		const parsed = JSON.parse(raw);
		if (parsed.schemaVersion !== SCHEMA_VERSION) return emptyManifest();
		return parsed;
	} catch {
		return emptyManifest();
	}
}

export async function writeManifest(manifest) {
	await mkdir(dirname(MANIFEST_PATH), { recursive: true });
	await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/** Records that `service` at `version` is installed, verified, and where. */
export async function markInstalled(service, { version, installDir, sha256 }) {
	const manifest = await readManifest();
	manifest.services[service] = {
		version,
		installDir,
		sha256,
		installed: true,
		installedAt: new Date().toISOString()
	};
	await writeManifest(manifest);
}

export async function serviceManifest(service) {
	const manifest = await readManifest();
	return manifest.services[service] ?? null;
}
