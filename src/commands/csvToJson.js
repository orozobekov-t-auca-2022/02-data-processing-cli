import { createReadStream, createWriteStream} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import path from 'node:path';
import { argParser } from '../utils/argParser.js';

class CSVToJSONTransformer extends Transform {
  constructor() {
    super();
    this.headers = null;
    this.openingBraket = true;
  }

  _transform(chunk, callback) {
    const lines = chunk.toString().split('\n');

    for(const line of lines) {
      if(!line.trim()) {
        continue;
      }

      if(!this.headers) {
        this.headers = line.split(',').map(header => header.trim());
      } else {
        const values = line.split(',').map(value => value.trim());

        const obj = {};

        this.headers.forEach((header, i) => {
          obj[header] = values[i];
        });

        if(this.openingBraket) {
          this.push('[\n');
          this.openingBraket = false;
        } else {
          this.push(',\n');
        }

        this.push(' ' + JSON.stringify(obj));
      }
    }
    callback();
  }

  _flush(callback) {
    if(!this.openingBraket) {
      this.push('\n]\n');
    } else {
      this.push('[]');
    }
    callback();
  }
}


export async function csvToJson(currentDir, args) {
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

  const transform = new CSVToJSONTransformer();

  await pipeline(readStream, transform, writeStream);
}

