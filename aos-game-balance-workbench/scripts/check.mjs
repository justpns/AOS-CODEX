import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith('.js') || path.endsWith('.mjs')) files.push(path);
  }
}
await walk('src');
await walk('tests');
for (const path of files) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status) { process.stderr.write(result.stderr); process.exit(result.status); }
}
process.stdout.write('Syntax checked ' + files.length + ' ES module files.\n');
