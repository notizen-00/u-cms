import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extractZip } from '../archive.mjs';

const jarPath = process.argv[2];
const outDir = process.argv[3];

const names = await extractZip(jarPath, outDir);
console.log('entries:', names);
const inner = names.find((name) => name.endsWith('.txz'));
const buf = readFileSync(`${outDir}/${inner}`);
console.log('inner:', inner, 'size:', buf.length);
console.log('inner sha256:', createHash('sha256').update(buf).digest('hex'));
