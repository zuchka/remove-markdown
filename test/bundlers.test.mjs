import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { build } from 'esbuild';
import { rollup } from 'rollup';

import {
  installPackedPackage,
  packProject,
  runNode,
  writeText,
} from './helpers/package-fixture.mjs';

test('ESM consumers bundle through esbuild and Rollup', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'remove-markdown-bundlers-'));

  try {
    const { tarball } = packProject(temporaryDirectory);
    const consumer = installPackedPackage(
      temporaryDirectory,
      'bundler-consumer',
      tarball,
      'module',
    );
    const entry = join(consumer, 'entry.mjs');
    writeText(
      entry,
      `import removeMd from 'remove-markdown';

const actual = removeMd('# Bundled **output**');
if (actual !== 'Bundled output') {
  throw new Error(\`Unexpected bundled output: \${JSON.stringify(actual)}\`);
}
`,
    );

    await build({
      bundle: true,
      entryPoints: [entry],
      format: 'esm',
      outfile: join(consumer, 'esbuild-output.mjs'),
      platform: 'browser',
    });
    runNode('esbuild-output.mjs', consumer);

    const bundle = await rollup({
      input: entry,
      plugins: [nodeResolve(), commonjs()],
    });
    try {
      await bundle.write({
        file: join(consumer, 'rollup-output.mjs'),
        format: 'esm',
      });
    } finally {
      await bundle.close();
    }
    runNode('rollup-output.mjs', consumer);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
