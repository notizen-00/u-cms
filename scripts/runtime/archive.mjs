/**
 * Archive extraction for portable runtime downloads.
 *
 * Two formats show up across the three services' upstream distributions:
 *
 *   .zip / .jar   MinIO ships a raw binary (no archive), but the Postgres
 *                 distribution and the Windows Redis build are both plain
 *                 ZIP. Extracted with a small pure-JS reader below instead of
 *                 shelling out, because `unzip` isn't guaranteed present on
 *                 Linux and Windows' Git-Bash `tar` (GNU tar, no zip support)
 *                 can shadow the real bsdtar on PATH — a dependency this
 *                 installer can actually control beats one it has to hope for.
 *
 *   .tar.xz / .txz  Only the inner Postgres archive. Implementing an LZMA
 *                 decoder from scratch isn't worth it when every target OS
 *                 ships a `tar` that already reads xz: bsdtar (Windows 10+,
 *                 macOS) links liblzma directly, and GNU tar auto-shells to
 *                 the system `xz` binary that virtually every real (i.e.
 *                 non-minimal-container) Linux install has. Extraction here
 *                 shells out, with a clear error if `tar` is missing.
 */
import { mkdir, open } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import zlib from 'node:zlib';
import { commandExists, run } from './shell.mjs';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;

/** Rejects `../` escapes from a malicious or corrupt archive entry name (a "zip slip"). */
function safeJoin(baseDir, entryName) {
	const target = normalize(join(baseDir, entryName));
	const base = normalize(baseDir + sep);
	if (target !== normalize(baseDir) && !target.startsWith(base)) {
		throw new Error(`Refusing to extract entry outside destination: ${entryName}`);
	}
	return target;
}

async function readEocd(handle, fileSize) {
	const scanSize = Math.min(fileSize, EOCD_MIN_SIZE + MAX_COMMENT_SIZE);
	const buffer = Buffer.alloc(scanSize);
	await handle.read(buffer, 0, scanSize, fileSize - scanSize);

	for (let i = buffer.length - EOCD_MIN_SIZE; i >= 0; i -= 1) {
		if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
			return {
				entryCount: buffer.readUInt16LE(i + 10),
				centralDirSize: buffer.readUInt32LE(i + 12),
				centralDirOffset: buffer.readUInt32LE(i + 16)
			};
		}
	}
	throw new Error('Not a valid ZIP archive (End Of Central Directory record not found).');
}

async function readCentralDirectory(handle, eocd) {
	const buffer = Buffer.alloc(eocd.centralDirSize);
	await handle.read(buffer, 0, eocd.centralDirSize, eocd.centralDirOffset);

	const entries = [];
	let offset = 0;
	for (let i = 0; i < eocd.entryCount; i += 1) {
		if (buffer.readUInt32LE(offset) !== CENTRAL_DIR_SIGNATURE) {
			throw new Error('Corrupt ZIP central directory.');
		}
		const compressionMethod = buffer.readUInt16LE(offset + 10);
		const compressedSize = buffer.readUInt32LE(offset + 20);
		const uncompressedSize = buffer.readUInt32LE(offset + 24);
		const nameLength = buffer.readUInt16LE(offset + 28);
		const extraLength = buffer.readUInt16LE(offset + 30);
		const commentLength = buffer.readUInt16LE(offset + 32);
		const externalAttrs = buffer.readUInt32LE(offset + 38);
		const localHeaderOffset = buffer.readUInt32LE(offset + 42);
		const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

		entries.push({
			name,
			compressionMethod,
			compressedSize,
			uncompressedSize,
			localHeaderOffset,
			// MS-DOS directory bit, or the conventional trailing-slash name.
			isDirectory: (externalAttrs & 0x10) !== 0 || name.endsWith('/')
		});

		offset += 46 + nameLength + extraLength + commentLength;
	}
	return entries;
}

async function extractEntry(handle, entry, destDir) {
	const targetPath = safeJoin(destDir, entry.name);
	if (entry.isDirectory) {
		await mkdir(targetPath, { recursive: true });
		return;
	}
	await mkdir(dirname(targetPath), { recursive: true });

	// The local header repeats name/extra with possibly different lengths than
	// the central directory copy, so the actual data offset must be computed
	// from THIS header, not assumed from the central directory alone.
	const localHeader = Buffer.alloc(30);
	await handle.read(localHeader, 0, 30, entry.localHeaderOffset);
	if (localHeader.readUInt32LE(0) !== LOCAL_HEADER_SIGNATURE) {
		throw new Error(`Corrupt ZIP local header for entry: ${entry.name}`);
	}
	const nameLength = localHeader.readUInt16LE(26);
	const extraLength = localHeader.readUInt16LE(28);
	const dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;

	const compressed = Buffer.alloc(entry.compressedSize);
	if (entry.compressedSize > 0) {
		await handle.read(compressed, 0, entry.compressedSize, dataOffset);
	}

	let data;
	if (entry.compressionMethod === 0) {
		data = compressed;
	} else if (entry.compressionMethod === 8) {
		data = zlib.inflateRawSync(compressed);
	} else {
		throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for entry: ${entry.name}`);
	}

	await open(targetPath, 'w').then(async (out) => {
		try {
			await out.writeFile(data);
		} finally {
			await out.close();
		}
	});
}

/** Extracts every entry of a ZIP (or JAR, same format) archive into `destDir`. */
export async function extractZip(zipPath, destDir) {
	const handle = await open(zipPath, 'r');
	try {
		const { size } = await handle.stat();
		const eocd = await readEocd(handle, size);
		const entries = await readCentralDirectory(handle, eocd);
		await mkdir(destDir, { recursive: true });
		for (const entry of entries) {
			await extractEntry(handle, entry, destDir);
		}
		return entries.map((entry) => entry.name);
	} finally {
		await handle.close();
	}
}

/**
 * Extracts a `.tar.xz`/`.tar.gz` via the system `tar`. Windows resolves this
 * to the real bsdtar at `%SystemRoot%\System32\tar.exe` (present since
 * Windows 10 1803) as long as the caller is a native process — which
 * `node scripts/...` is, so it never picks up Git Bash's zip-incapable tar.
 */
export async function extractTar(tarPath, destDir) {
	if (!(await commandExists('tar'))) {
		throw new Error(
			`\`tar\` was not found on PATH, needed to extract ${tarPath}.\n` +
				`Windows 10 (1803+), Linux, and macOS all ship one — install it and re-run.`
		);
	}
	await mkdir(destDir, { recursive: true });
	await run('tar', ['-xf', tarPath, '-C', destDir]);
}

/** True if `path` looks like a compressed tarball rather than a ZIP. */
export function isTarArchive(path) {
	return /\.(tar\.xz|txz|tar\.gz|tgz|tar)$/i.test(path);
}
