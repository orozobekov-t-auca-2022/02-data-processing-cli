import { createReadStream, createWriteStream} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import path from 'node:path';
import { argParser } from '../utils/argParser.js';

class JSONToCSVTransformer extends Transform {
  constructor() {
    super();
    this.buffer = '';
    this.headers = null;
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    callback();
  }

  _flush(callback) {
    const data = JSON.parse(this.buffer);

    if(!Array.isArray(data)) {
      callback(new Error('Invalid JSON format'));
      return;
    }

    this.headers = Object.keys(data[0]);

    this.push(this.headers.join(',') + '\n');

    for(const item of data) {
      const row = this.headers.map(header => item[header]).join(',');
      this.push(row + '\n');
    }

    callback();
  }
}


export async function jsonToCSV(currentDir, args) {
  const parsed = argParser(args);

  const input = parsed['--input'];
  const output = parsed['--output'];

  if(!input || !output) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);
  const outputPath = path.resolve(currentDir, output);

  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);

  const transform = new JSONToCSVTransformer();

  await pipeline(readStream, transform, writeStream);
}
