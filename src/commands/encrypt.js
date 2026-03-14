import path from "node:path";
import { argParser } from "../utils/argParser.js";
import { createCipheriv, randomBytes, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

export async function encrypt(currentDir, args) {
  const parsed = argParser(args);

  const input = parsed['--input'];
  const output = parsed['--output'];
  const password = parsed['--password'];

  if(!input || !output || !password) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);
  const outputPath = path.resolve(currentDir, output);

  const salt = randomBytes(16);
  const scryptAsync = promisify(scrypt);
  const key = await scryptAsync(password, salt, 32);

  const iv = randomBytes(12);
  let cipher = createCipheriv('aes-256-gcm', key, iv);

  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);

  writeStream.write(salt);
  writeStream.write(iv);

  await pipeline(readStream, cipher, writeStream, {end: false});
  const authTag = cipher.getAuthTag();
  writeStream.write(authTag);
  writeStream.end();
}
