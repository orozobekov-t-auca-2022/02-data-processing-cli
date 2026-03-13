import os from 'node:os';
import { rl } from './repl.js';
import { ls, cd, up } from './navigation.js';
import { csvToJson } from './commands/csvToJson.js';

let currentDir = os.homedir();

console.log('Welcome to Data Processing CLI!');
console.log(`You are currently in ${currentDir}`);

const commands = {
  ls,
  cd,
  up,
  'csv-to-json': csvToJson
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
