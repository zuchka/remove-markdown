import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

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
