import os from 'node:os';
import { rl } from './repl.js';
import { ls, cd, up } from './navigation.js';
import { csvToJson } from './commands/csvToJson.js';
import { jsonToCSV } from './commands/jsonToCsv.js';
import { count } from './commands/count.js';
import { hash } from './commands/hash.js';
import { hashCompare } from './commands/hashCompare.js';
import { encrypt } from './commands/encrypt.js';

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
}

rl.prompt();

rl.on('line', async (input) => {
  const [command, ...args] = input.trim().split(' ');
  const pathArg = args.join(' ');
  try {
    const handler = commands[command];
    if(!handler) {
      console.log('invalid input');
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
