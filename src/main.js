import os from 'node:os';
import { rl } from './repl.js';
import { ls, cd, up } from './navigation.js';

let currentDir = os.homedir();

console.log('Welcome to Data Processing CLI!');
console.log(`You are currently in ${currentDir}`);

// function parseArgs(args) {
//   const result = {};

//   for (let i = 0; i < args.length; i += 2) {
//     result[args[i]] = args[i + 1];
//   }

//   return result;
// }

const commands = {
  ls,
  cd,
  up
}

rl.prompt();

rl.on('line', async (input) => {
  const [command, ...args] = input.trim().split(' ');
  try {
    const handler = commands[command];
    if(!handler) {
      console.log('invalid input');
    } else {
      await ls(currentDir);
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
