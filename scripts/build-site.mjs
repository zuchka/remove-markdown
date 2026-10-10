import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const output = path.join(root, 'dist/site');

export async function buildSite() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  await mkdir(path.join(output, 'vendor'), { recursive: true });
  await cp(path.join(root, 'showcase'), output, { recursive: true });
  await cp(path.join(root, 'index.mjs'), path.join(output, 'vendor/remove-markdown.mjs'));
  await cp(path.join(root, 'LICENSE'), path.join(output, 'vendor/LICENSE'));
  await cp(path.join(root, 'fixtures/corpus.mjs'), path.join(output, 'corpus.mjs'));
  for (const page of ['index.html', 'benchmarks/index.html']) {
    const filename = path.join(output, page);
    try { await writeFile(filename, (await readFile(filename, 'utf8')).replaceAll('__VERSION__', pkg.version)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await mkdir(path.join(output, 'results'), { recursive: true });
  for (const name of ['latest.json', 'sizes.json']) {
    try { await cp(path.join(root, 'bench/results', name), path.join(output, 'results', name)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  try { await cp(path.join(root, 'bench/README.md'), path.join(output, 'results/methodology.md')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log(`Built remove-markdown v${pkg.version} → ${output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildSite();
