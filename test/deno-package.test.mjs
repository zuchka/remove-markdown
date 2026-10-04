import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  installPackedPackage,
  packProject,
  run,
  writeText,
} from './helpers/package-fixture.mjs';

test('Deno checks and executes the packed npm package', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'remove-markdown-deno-'));

  try {
    const { tarball } = packProject(temporaryDirectory);
    const consumer = installPackedPackage(
      temporaryDirectory,
      'deno-consumer',
      tarball,
      'module',
    );
    writeText(
      join(consumer, 'consumer.test.mjs'),
      `import removeMd from 'remove-markdown';
import removeMdFromIndexMjs from 'remove-markdown/index.mjs';

Deno.test('the installed package works', () => {
  const actual = removeMd('**bold** and [link](https://example.com)');
  const expected = 'bold and link';

  if (actual !== expected) {
    throw new Error(\`Expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
  }
  if (removeMdFromIndexMjs('~~portable~~') !== 'portable') {
    throw new Error('The explicit ESM entry returned unexpected output');
  }
});
`,
    );

    run('deno', ['check', '--node-modules-dir=manual', 'consumer.test.mjs'], consumer);
    run(
      'deno',
      [
        'test',
        '--node-modules-dir=manual',
        '--allow-read',
        '--allow-env',
        'consumer.test.mjs',
      ],
      consumer,
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
