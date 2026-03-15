import path from "node:path";
import { argParser } from "../utils/argParser.js";
import { createDecipheriv, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

export async function decrypt(currentDir, args) {
  const parsed = argParser(args);

  const input = parsed['--input'];
  const output = parsed['--output'];
  const password = parsed['--password'];

  if(!input || !output || !password) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);
  const outputPath = path.resolve(currentDir, output);

  const stat = await fs.stat(inputPath);
  const fileSize = stat.size;

  const header = Buffer.alloc(28);
  const fd = await fs.open(inputPath, "r");
  await fd.read(header, 0, 28, 0);

  const salt = header.subarray(0, 16);
  const iv = header.subarray(16, 28);

  const tagBuffer = Buffer.alloc(16);
  await fd.read(tagBuffer, 0, 16, fileSize - 16);

  const authTag = tagBuffer;

  const scryptAsync = promisify(scrypt);
  const key = await scryptAsync(password, salt, 32);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const readStream = createReadStream(inputPath, {
    start: 28,
    end: fileSize - 17
  });

  await pipeline(
    readStream,
    decipher,
    createWriteStream(outputPath)
  );
  await fd.close();
}
