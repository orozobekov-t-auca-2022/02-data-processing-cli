import { createReadStream } from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';

const STATUS_TEMPLATE = {
	'2xx': 0,
	'3xx': 0,
	'4xx': 0,
	'5xx': 0
};

function parseStatusClass(statusCode) {
	if (!Number.isInteger(statusCode)) {
		return null;
	}

	const key = `${Math.floor(statusCode / 100)}xx`;
	return Object.hasOwn(STATUS_TEMPLATE, key) ? key : null;
}

function processLine(line, stats) {
	const trimmed = line.trim();

	if (!trimmed) {
		return;
	}

	const parts = trimmed.split(/\s+/);
	if (parts.length < 7) {
		return;
	}

	const level = parts[1];
	const statusCode = Number(parts[3]);
	const responseTime = Number(parts[4]);
	const requestPath = parts[6];

	if (!Number.isFinite(statusCode) || !Number.isFinite(responseTime)) {
		return;
	}

	stats.total += 1;
	stats.responseSum += responseTime;
	stats.levels[level] = (stats.levels[level] || 0) + 1;
	stats.paths[requestPath] = (stats.paths[requestPath] || 0) + 1;

	const statusClass = parseStatusClass(statusCode);
	if (statusClass) {
		stats.status[statusClass] += 1;
	}
}

function createInitialStats() {
	return {
		total: 0,
		responseSum: 0,
		levels: {},
		status: { ...STATUS_TEMPLATE },
		paths: {}
	};
}

async function execute() {
	const { inputPath, start, endExclusive } = workerData;
	const stats = createInitialStats();

	if (!parentPort) {
		return;
	}

	if (typeof start !== 'number' || typeof endExclusive !== 'number' || endExclusive <= start) {
		parentPort.postMessage(stats);
		return;
	}

	const stream = createReadStream(inputPath, {
		start,
		end: endExclusive - 1,
		encoding: 'utf8'
	});

	let buffer = '';

	for await (const chunk of stream) {
		const text = buffer + chunk;
		const lines = text.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			processLine(line, stats);
		}
	}

	if (buffer) {
		processLine(buffer, stats);
	}

	parentPort.postMessage(stats);
}

execute().catch((error) => {
	throw error;
});
