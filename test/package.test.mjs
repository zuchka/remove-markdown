import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  expectedPackageFiles,
  installPackedPackage,
  packProject,
  runNode,
  writeText,
} from './helpers/package-fixture.mjs';

test('the npm tarball works for CommonJS and ESM consumers', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'remove-markdown-package-'));

  try {
    const { files, tarball } = packProject(temporaryDirectory);
    assert.deepEqual(files, expectedPackageFiles);

    const commonJsConsumer = installPackedPackage(
      temporaryDirectory,
      'commonjs-consumer',
      tarball,
      'commonjs',
    );
    writeText(
      join(commonJsConsumer, 'consumer.cjs'),
      `'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const removeMd = require('remove-markdown');
const removeMdFromIndex = require('remove-markdown/index');
const removeMdFromIndexJs = require('remove-markdown/index.js');
const packageMetadata = require('remove-markdown/package.json');

assert.strictEqual(removeMd, removeMdFromIndex);
assert.strictEqual(removeMd, removeMdFromIndexJs);
assert.equal(packageMetadata.name, 'remove-markdown');
assert.deepEqual(packageMetadata.exports['./index.mjs'], {
  types: './index.d.mts',
  default: './index.mjs',
});

assert.equal(removeMd('# Heading'), 'Heading');
assert.equal(
  removeMd('[link](https://example.com)', { separateLinksAndTexts: ': ' }),
  'link: https://example.com',
);
assert.match(readFileSync(require.resolve('remove-markdown/README.md'), 'utf8'), /# What is it\?/);
assert.match(readFileSync(require.resolve('remove-markdown/LICENSE'), 'utf8'), /MIT License/);
assert.match(readFileSync(require.resolve('remove-markdown/index.d.ts'), 'utf8'), /export = removeMd/);
assert.match(readFileSync(require.resolve('remove-markdown/index.d.mts'), 'utf8'), /export default removeMd/);
`,
    );
    runNode('consumer.cjs', commonJsConsumer);

    const esmConsumer = installPackedPackage(
      temporaryDirectory,
      'esm-consumer',
      tarball,
      'module',
    );
    writeText(
      join(esmConsumer, 'consumer.mjs'),
      `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import removeMd from 'remove-markdown';
import removeMdFromIndex from 'remove-markdown/index';
import removeMdFromIndexJs from 'remove-markdown/index.js';
import removeMdFromIndexMjs from 'remove-markdown/index.mjs';

const require = createRequire(import.meta.url);
const commonJs = require('remove-markdown');
const dynamicImport = await import('remove-markdown');

assert.strictEqual(removeMd, commonJs);
assert.strictEqual(dynamicImport.default, commonJs);
assert.strictEqual(removeMdFromIndex, commonJs);
assert.strictEqual(removeMdFromIndexJs, commonJs);
assert.equal(removeMd('**bold**'), 'bold');
assert.equal(removeMdFromIndexMjs('**bold**'), 'bold');
assert.equal(removeMd('![alt](image.png)', { useImgAltText: false }), '');
`,
    );
    runNode('consumer.mjs', esmConsumer);

    const nativeUrlConsumer = join(temporaryDirectory, 'native-url-consumer');
    mkdirSync(nativeUrlConsumer);
    writeText(join(nativeUrlConsumer, 'package.json'), '{"type":"module"}\n');
    copyFileSync(
      join(esmConsumer, 'node_modules', 'remove-markdown', 'index.mjs'),
      join(nativeUrlConsumer, 'index.mjs'),
    );
    copyFileSync(
      join(esmConsumer, 'node_modules', 'remove-markdown', 'index.js'),
      join(nativeUrlConsumer, 'index.js'),
    );
    writeText(
      join(nativeUrlConsumer, 'consumer.mjs'),
      `import assert from 'node:assert/strict';
import removeMd from './index.mjs';

assert.equal(removeMd('# Native **ESM**'), 'Native ESM');
`,
    );
    runNode('consumer.mjs', nativeUrlConsumer);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('packed entry points preserve replacement-string options', async (t) => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'remove-markdown-replacements-'));

  try {
    const { tarball } = packProject(temporaryDirectory);
    const consumer = installPackedPackage(temporaryDirectory, 'replacement-consumer', tarball, 'commonjs');
    const require = createRequire(join(consumer, 'consumer.cjs'));
    const implementations = [
      ['CommonJS', require('remove-markdown')],
      ['portable ESM', (await import(pathToFileURL(require.resolve('remove-markdown/index.mjs')))).default],
    ];
    // Preserve the existing String.replace semantics, including literal dollars,
    // nonexistent captures, whole-match/context substitutions and two-digit runs.
    // Expected strings are explicit so parity alone cannot hide shared regressions.
    const cases = [
      ['$$', 'label $ url', '$ item'],
      ['$5', 'label $5 url', '$5 item'],
      ['$&', 'label label url', '-  item'],
      ['$`', 'label  url', ' item'],
      ["$'", 'label  url', 'item item'],
      ['$10', 'label label0 url', '0 item'],
      ['$99', 'label $99 url', '$99 item'],
      ['$0', 'label $0 url', '$0 item'],
      ['$3', 'label $3 url', '$3 item'],
    ];

    for (const [name, convert] of implementations) {
      for (const [replacement, linkExpected, listExpected] of cases) {
        await t.test(`${name}: link separator ${JSON.stringify(replacement)}`, () => {
          assert.equal(convert('[label](url)', {
            separateLinksAndTexts: ` ${replacement} `,
          }), linkExpected);
        });
        await t.test(`${name}: list marker ${JSON.stringify(replacement)}`, () => {
          assert.equal(convert('- item', { listUnicodeChar: replacement }), listExpected);
        });
      }

      for (const [replacement, expected] of [
        ['$`', 'Before label Before  url after.'],
        ["$'", 'Before label  after. url after.'],
      ]) {
        await t.test(`${name}: separator preserves ${replacement} context`, () => {
          assert.equal(convert('Before [label](url) after.', {
            separateLinksAndTexts: ` ${replacement} `,
          }), expected);
        });
      }
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
