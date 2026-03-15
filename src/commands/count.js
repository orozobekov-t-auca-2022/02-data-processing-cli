import { createReadStream, createWriteStream, read} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import path from 'node:path';
import { argParser } from '../utils/argParser.js';

class CountTransformer extends Transform {
  constructor() {
    super();
    this.lineCount = 0;
    this.wordCount = 0;
    this.charCount = 0;
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    const tempText = chunk.toString();
    this.charCount += tempText.length

    const words = tempText.trim().split(/\s+/).filter(Boolean);
    this.wordCount += words.length;

    const data = this.buffer + tempText;
    const lines = data.split('\n');

    this.buffer = lines.pop();
    this.lineCount += lines.length;

    callback();
  }

  _flush(callback) {
    if(this.buffer.trim()) {
      this.lineCount++;
    }
    console.log(`Lines: ${this.lineCount}`);
    console.log(`Words: ${this.wordCount}`);
    console.log(`Characters: ${this.charCount}`);
    callback();
  }
}

export async function count(currentDir, args) {
  const parsed = argParser(args);
  
  const input = parsed['--input'];

  if(!input) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);
  const readStream = createReadStream(inputPath);
  const transform = new CountTransformer();
  await pipeline(readStream, transform);
}