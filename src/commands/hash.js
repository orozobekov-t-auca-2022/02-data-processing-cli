import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { argParser } from '../utils/argParser.js';

const algorithms = ['sha256', 'md5', 'sha512'];

export async function hash(currentDir, args) {
  const parsed = argParser(args);

  const input = parsed['--input'];
  const algorithm = parsed['--algorithm'] || 'sha256';
  const save = '--save' in parsed;

  if(!input || !algorithms.includes(algorithm)) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);

  const stream = createReadStream(inputPath);

  const hashType = createHash(algorithm);

  await pipeline(stream, hashType);
  const result = hashType.digest('hex');

  const outputPrompt = `${algorithm}: ${result}`
  console.log(outputPrompt);

  if(save) {
    const output = `${inputPath}.${algorithm}`;
    const writeStream = createWriteStream(output);
    writeStream.write(outputPrompt + '\n');
    writeStream.end();
  }
}
