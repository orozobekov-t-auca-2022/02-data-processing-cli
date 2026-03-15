import os from 'node:os';
import { rl } from './repl.js';
import { ls, cd, up } from './navigation.js';
import { csvToJson } from './commands/csvToJson.js';
import { jsonToCSV } from './commands/jsonToCsv.js';
import { count } from './commands/count.js';
import { hash } from './commands/hash.js';
import { hashCompare } from './commands/hashCompare.js';
import { encrypt } from './commands/encrypt.js';
import { decrypt } from './commands/decrypt.js';
import { logStats } from './commands/logStats.js';

let currentDir = os.homedir();

console.log('Welcome to Data Processing CLI!');
console.log(`You are currently in ${currentDir}`);

const commands = {
  ls,
  cd,
  up,
  'csv-to-json': csvToJson,
  'json-to-csv': jsonToCSV,
  count,
  hash,
  'hash-compare': hashCompare,
  encrypt,
  decrypt,
  'log-stats': logStats,
}

const requiredOptions = {
  'csv-to-json': ['--input', '--output'],
  'json-to-csv': ['--input', '--output'],
  count: ['--input'],
  hash: ['--input'],
  'hash-compare': ['--input', '--hash'],
  encrypt: ['--input', '--output', '--password'],
  decrypt: ['--input', '--output', '--password'],
  'log-stats': ['--input', '--output']
};

const valueOptions = {
  'csv-to-json': ['--input', '--output'],
  'json-to-csv': ['--input', '--output'],
  count: ['--input'],
  hash: ['--input', '--algorithm'],
  'hash-compare': ['--input', '--hash', '--algorithm'],
  encrypt: ['--input', '--output', '--password'],
  decrypt: ['--input', '--output', '--password'],
  'log-stats': ['--input', '--output']
};

function hasOptionValue(args, option) {
  const index = args.indexOf(option);

  if (index === -1) {
    return false;
  }

  const value = args[index + 1];
  return Boolean(value) && !value.startsWith('--');
}

function hasMissingRequiredInput(command, args, pathArg) {
  if (command === 'cd') {
    return !pathArg.trim();
  }

  const required = requiredOptions[command] || [];
  return required.some((option) => !hasOptionValue(args, option));
}

function hasMalformedOptionInput(command, args) {
  const optionsWithValues = valueOptions[command] || [];

  return optionsWithValues.some((option) => {
    const index = args.indexOf(option);

    if (index === -1) {
      return false;
    }

    const value = args[index + 1];
    return !value || value.startsWith('--');
  });
}

rl.prompt();

rl.on('line', async (input) => {
  const [command, ...args] = input.trim().split(/\s+/);
  const pathArg = args.join(' ');
  try {
    const handler = commands[command];
    if(!handler) {
      console.log('Invalid input');
    } else if (hasMissingRequiredInput(command, args, pathArg) || hasMalformedOptionInput(command, args)) {
      console.log('Invalid input');
    } else {
      switch(command) {
        case 'cd':
          currentDir = await cd(currentDir, pathArg);
          break;
        case 'up':
          currentDir = up(currentDir);
          break;
        case 'ls':
          await ls(currentDir);
          break;
        case 'csv-to-json':
          await csvToJson(currentDir, args);
          break;
        case 'json-to-csv':
          await jsonToCSV(currentDir, args);
          break;
        case 'count':
          await count(currentDir, args);
          break;
        case 'hash':
          await hash(currentDir, args);
          break;
        case 'hash-compare':
          await hashCompare(currentDir, args);
          break;
        case 'encrypt':
          await encrypt(currentDir, args);
          break;
        case 'decrypt':
          await decrypt(currentDir, args);
          break;
        case 'log-stats':
          await logStats(currentDir, args);
          break;
        default:
          console.log('Unknown command');
          break;
      }

      console.log(`You are currently in ${currentDir}`);
    }
  } catch {
    console.log('Operation failed')
  }
  rl.prompt();
});

rl.on('close', () => {
  console.log('Thank you for using Data Processing CLI!');
  process.exit(0);
})
