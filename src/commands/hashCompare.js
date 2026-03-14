import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { argParser } from '../utils/argParser.js';
import { readFile } from 'node:fs/promises';

const algorithms = ['sha256', 'md5', 'sha512'];

export async function hashCompare(currentDir, args) {
  const parsed = argParser(args);

  const input = parsed['--input'];
  const hashFile = parsed['--hash'];
  const algorithm = parsed['--algorithm'] || 'sha256';

  if(!input || !hashFile) {
    throw new Error();
  }

  if(!algorithms.includes(algorithm)) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);
  const hashPath = path.resolve(currentDir, hashFile);

  const readStream = createReadStream(inputPath);
  const hash = createHash(algorithm);

  await pipeline(readStream, hash);
  const calculatedHash = hash.digest('hex');

  const fileContent = await readFile(hashPath, 'utf8');

  let expected = fileContent.trim();

  if(expected.includes(':')) {
    expected = expected.split(':')[1].trim();
  }

  if(calculatedHash.toLowerCase() === expected.toLowerCase()) {
    console.log('OK');
  } else {
    console.log('MISMATCH');
  }
}