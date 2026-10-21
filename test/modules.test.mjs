import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import removeMd from 'remove-markdown';
import removeMdFromPortableEsm from 'remove-markdown/index.mjs';

import { projectRoot, run } from './helpers/package-fixture.mjs';

const require = createRequire(import.meta.url);

test('CommonJS and ESM expose the same function', async () => {
  const commonJs = require('remove-markdown');
  const dynamicImport = await import('remove-markdown');
  const portableDynamicImport = await import('remove-markdown/index.mjs');

  assert.strictEqual(removeMd, commonJs);
  assert.strictEqual(dynamicImport.default, commonJs);
  assert.strictEqual(portableDynamicImport.default, removeMdFromPortableEsm);
  assert.equal(removeMd('# Heading'), 'Heading');
  assert.equal(removeMdFromPortableEsm('# Heading'), 'Heading');
});

test('the portable ESM implementation matches the CommonJS implementation', () => {
  const commonJs = require('remove-markdown');
  const cases = [
    ['**bold** and _italic_', undefined],
    ['[link](https://example.com)', { replaceLinksWithURL: true }],
    ['![alt](image.png)', { useImgAltText: false }],
    ['<span>kept</span><em>removed</em>', { htmlTagsToSkip: ['span'] }],
    ['import { A, B as C, } from "pkg"; \t\r\n \r\n# Text', { stripMdxImports: true }],
    ['import A from "pkg";\n\n- import "data"', { stripMdxImports: true }],
    ['import { A, B } from "pkg";\n\n# Text', { stripMdxImports: false }],
    ['[foo `bar](/uri)\n\nText with `code`.', undefined],
    ['Use `[` and [link](u) after `code`.', { replaceLinksWithURL: true }],
  ];

  for (const [markdown, options] of cases) {
    assert.equal(
      removeMdFromPortableEsm(markdown, options),
      commonJs(markdown, options),
    );
  }
});

test('CommonJS and portable ESM scope code spans to a block and to a link', () => {
  const commonJs = require('remove-markdown');
  const cases = [
    ['[foo `bar](/uri)\n\nText with `code`.', undefined, 'foo `bar\n\nText with code.'],
    ['[foo `bar](/uri)\n\nText with `code`.', { replaceLinksWithURL: true }, '/uri\n\nText with code.'],
    ['Use `[` and [link](u) after `code`.', undefined, 'Use [ and link after code.'],
    ['Use `[` and [link](u) after `code`.', { replaceLinksWithURL: true }, 'Use [ and u after code.'],
  ];

  for (const [markdown, options, expected] of cases) {
    assert.equal(commonJs(markdown, options && { ...options }), expected);
    assert.equal(removeMdFromPortableEsm(markdown, options && { ...options }), expected);
  }
});

test('the generated ESM implementation is synchronized with index.js', () => {
  run(process.execPath, ['scripts/build-esm.mjs', '--check'], projectRoot);
});
