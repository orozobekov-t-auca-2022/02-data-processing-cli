import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export async function ls(currentDir) {
  const entries = await readdir(currentDir);
  const result = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry);
    const info = await stat(fullPath);

    result.push({
      name: entry,
      type: info.isDirectory() ? 'folder' : 'file'
    });
  }

  result.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (const item of result) {
    console.log(`${item.name} [${item.type}]`);
  }
}

export async function up(currentDir) {
  const parent = path.dirname(currentDir);
  
  if(parent === currentDir) {
    return currentDir;
  }
  
  return parent;
}

export async function cd(currentDir, target) {
  const newPath = path.resolve(currentDir, target);

  const info = await stat(newPath);

  if(!info.isDirectory) {
    throw new Error();
  }

  return newPath;
}