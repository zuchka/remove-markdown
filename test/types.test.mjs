import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  installPackedPackage,
  packProject,
  projectRoot,
  runAttw,
  runTypeScript,
  writeJson,
  writeText,
} from './helpers/package-fixture.mjs';

const compilerOptions = {
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  noEmit: true,
  skipLibCheck: false,
  strict: true,
  target: 'ES2022',
};

test('the npm tarball exposes matching CommonJS and ESM declarations', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'remove-markdown-types-'));

  try {
    const { tarball } = packProject(temporaryDirectory);

    const commonJsConsumer = installPackedPackage(
      temporaryDirectory,
      'commonjs-types-consumer',
      tarball,
      'commonjs',
    );
    writeText(
      join(commonJsConsumer, 'consumer.cts'),
      `import removeMd = require('remove-markdown');
import removeMdFromIndex = require('remove-markdown/index');
import removeMdFromIndexJs = require('remove-markdown/index.js');

const output: string = removeMd('# Heading', {
  stripListLeaders: true,
  listUnicodeChar: '',
  gfm: true,
  useImgAltText: true,
  abbr: false,
  replaceLinksWithURL: false,
  separateLinksAndTexts: ': ',
  htmlTagsToSkip: ['a'],
  throwError: true,
});
const indexOutput: string = removeMdFromIndex('**bold**');
const indexJsOutput: string = removeMdFromIndexJs('_italic_');
void output;
void indexOutput;
void indexJsOutput;

// @ts-expect-error Markdown input must be a string.
removeMd(42);
// @ts-expect-error gfm must be a boolean.
removeMd('text', { gfm: 'yes' });
`,
    );
    writeJson(join(commonJsConsumer, 'tsconfig.json'), {
      compilerOptions,
      files: ['./consumer.cts'],
    });
    runTypeScript('tsconfig.json', commonJsConsumer);

    const esmConsumer = installPackedPackage(
      temporaryDirectory,
      'esm-types-consumer',
      tarball,
      'module',
    );
    writeText(
      join(esmConsumer, 'consumer.mts'),
      `import removeMd from 'remove-markdown';
import removeMdFromIndex from 'remove-markdown/index';
import removeMdFromIndexJs from 'remove-markdown/index.js';

const output: string = removeMd('[link](https://example.com)', {
  stripListLeaders: false,
  listUnicodeChar: '•',
  gfm: false,
  useImgAltText: false,
  abbr: true,
  replaceLinksWithURL: true,
  separateLinksAndTexts: ' — ',
  htmlTagsToSkip: ['sub', 'span'],
  throwError: false,
});
const indexOutput: string = removeMdFromIndex('**bold**');
const indexJsOutput: string = removeMdFromIndexJs('_italic_');
void output;
void indexOutput;
void indexJsOutput;

// @ts-expect-error Markdown input must be a string.
removeMd({});
// @ts-expect-error htmlTagsToSkip must contain strings.
removeMd('text', { htmlTagsToSkip: [1] });
`,
    );
    writeJson(join(esmConsumer, 'tsconfig.json'), {
      compilerOptions,
      files: ['./consumer.mts'],
    });
    runTypeScript('tsconfig.json', esmConsumer);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('the package entry points pass Are the Types Wrong validation', () => {
  runAttw(projectRoot);
});
