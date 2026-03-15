import os from 'node:os';
import { argParser } from '../utils/argParser.js';
import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const STATUS_TEMPLATE = {
  '2xx': 0,
  '3xx': 0,
  '4xx': 0,
  '5xx': 0
};

async function findNextLineStart(fileHandle, position, fileSize) {
  if (position <= 0) {
    return 0;
  }

  if (position >= fileSize) {
    return fileSize;
  }

  const buffer = Buffer.alloc(64 * 1024);
  let cursor = position;

  while (cursor < fileSize) {
    const bytesToRead = Math.min(buffer.length, fileSize - cursor);
    const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, cursor);

    if (bytesRead === 0) {
      return fileSize;
    }

    const newlineIndex = buffer.subarray(0, bytesRead).indexOf(0x0a);
    if (newlineIndex !== -1) {
      return cursor + newlineIndex + 1;
    }

    cursor += bytesRead;
  }

  return fileSize;
}

async function buildLineAlignedRanges(inputPath, workersCount) {
  const stat = await fs.stat(inputPath);
  const fileSize = stat.size;

  if (fileSize === 0) {
    return [];
  }

  const fileHandle = await fs.open(inputPath, 'r');

  try {
    const boundaries = [0];

    for (let i = 1; i < workersCount; i++) {
      const target = Math.floor((fileSize * i) / workersCount);
      const aligned = await findNextLineStart(fileHandle, target, fileSize);
      boundaries.push(aligned);
    }

    boundaries.push(fileSize);

    const uniqueBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);
    const ranges = [];

    for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
      const start = uniqueBoundaries[i];
      const endExclusive = uniqueBoundaries[i + 1];

      if (endExclusive > start) {
        ranges.push({ start, endExclusive });
      }
    }

    return ranges;
  } finally {
    await fileHandle.close();
  }
}

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/logWorker.js', import.meta.url), {
      workerData
    });

    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

export async function logStats(currentDir, args) {
  const parsed = argParser(args);

  const input = parsed['--input'];
  const output = parsed['--output'];

  if (!input || !output) {
    throw new Error();
  }

  const inputPath = path.resolve(currentDir, input);
  const outputPath = path.resolve(currentDir, output);
  const workersCount = Math.max(1, os.cpus().length);
  const ranges = await buildLineAlignedRanges(inputPath, workersCount);

  const results = await Promise.all(
    ranges.map((range) => runWorker({ inputPath, ...range }))
  );

  const aggregate = {
    status: { ...STATUS_TEMPLATE },
    levels: {},
    paths: {},
    total: 0,
    responseSum: 0
  };

  for (const partial of results) {
    aggregate.total += partial.total;
    aggregate.responseSum += partial.responseSum;

    for (const [level, count] of Object.entries(partial.levels)) {
      aggregate.levels[level] = (aggregate.levels[level] || 0) + count;
    }

    for (const [statusKey, count] of Object.entries(partial.status)) {
      aggregate.status[statusKey] = (aggregate.status[statusKey] || 0) + count;
    }

    for (const [requestPath, count] of Object.entries(partial.paths)) {
      aggregate.paths[requestPath] = (aggregate.paths[requestPath] || 0) + count;
    }
  }

  const topPaths = Object.entries(aggregate.paths)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([requestPath, count]) => ({ path: requestPath, count }));

  const avgResponseTimeMs = aggregate.total === 0
    ? 0
    : Number((aggregate.responseSum / aggregate.total).toFixed(2));

  const finalStats = {
    total: aggregate.total,
    levels: aggregate.levels,
    status: aggregate.status,
    topPaths,
    avgResponseTimeMs
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await pipeline(
    Readable.from([`${JSON.stringify(finalStats, null, 2)}\n`]),
    createWriteStream(outputPath)
  );
}