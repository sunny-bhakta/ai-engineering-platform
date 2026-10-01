import { readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const isDryRun = process.argv.includes('--dry-run');
const rootNodeModulesDir = resolve(rootDir, 'node_modules');

/** @type {string[]} */
const matches = [];

async function findNodeModules(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = join(dir, entry.name);

    if (entry.name === 'node_modules') {
      if (resolve(fullPath) === rootNodeModulesDir) {
        continue;
      }

      matches.push(fullPath);
      continue;
    }

    await findNodeModules(fullPath);
  }
}

async function main() {
  const startDir = resolve(rootDir);

  console.log(`Scanning for node_modules folders under: ${startDir}`);
  await findNodeModules(startDir);

  if (matches.length === 0) {
    console.log('No node_modules folders found.');
    return;
  }

  console.log(`Found ${matches.length} node_modules folder(s).`);

  if (isDryRun) {
    console.log('\nDry run mode: no folders were deleted.');
    for (const dir of matches) {
      console.log(`- ${dir}`);
    }
    return;
  }

  for (const dir of matches) {
    await rm(dir, { recursive: true, force: true });
    console.log(`Deleted: ${dir}`);
  }

  console.log(`\nDone. Deleted ${matches.length} node_modules folder(s).`);
}

main().catch((error) => {
  console.error('Failed to clean node_modules folders.');
  console.error(error);
  process.exitCode = 1;
});
