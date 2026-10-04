import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
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

    const esbuildResult = await build({
      bundle: true,
      entryPoints: [entry],
      format: 'esm',
      metafile: true,
      outfile: join(consumer, 'esbuild-output.mjs'),
      platform: 'browser',
    });
    const esbuildInputs = Object.keys(esbuildResult.metafile.inputs).map(
      (path) => basename(path),
    );
    assert.ok(esbuildInputs.includes('index.mjs'));
    assert.ok(!esbuildInputs.includes('index.node.mjs'));
    assert.ok(!esbuildInputs.includes('index.js'));
    runNode('esbuild-output.mjs', consumer);

    const bundle = await rollup({
      input: entry,
      plugins: [nodeResolve(), commonjs()],
    });
    try {
      const rollupInputs = bundle.watchFiles.map((path) => basename(path));
      assert.ok(rollupInputs.includes('index.mjs'));
      assert.ok(!rollupInputs.includes('index.node.mjs'));
      assert.ok(!rollupInputs.includes('index.js'));
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
