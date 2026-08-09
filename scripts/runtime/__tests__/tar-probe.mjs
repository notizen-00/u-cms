import { extractTar } from '../archive.mjs';
await extractTar(process.argv[2], process.argv[3]);
console.log('done');
