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

test('CommonJS and portable ESM agree on the links, brackets and code spans acceptance cases', () => {
  const commonJs = require('remove-markdown');
  const link = '[foo `bar](/uri)';
  // [input, default output, replaceLinksWithURL output]
  const cases = [
    ['[link [foo [bar]]](/uri)', 'link [foo [bar]]', '/uri'],
    ['[link \\[bar](/uri)', 'link \\[bar', '/uri'],
    ['[foo `]` bar](/uri)', 'foo ] bar', '/uri'],
    ['see [1] and [link](http://x.y) end', 'see [1] and link end', 'see [1] and http://x.y end'],
    ['Smith et al. [12] (see appendix)', 'Smith et al. [12] (see appendix)', 'Smith et al. [12] (see appendix)'],
    ['Use `[` and [link](u) after `code`.', 'Use [ and link after code.', 'Use [ and u after code.'],
    [`${link}\n\nText with \`code\`.`, 'foo `bar\n\nText with code.', '/uri\n\nText with code.'],
    [`${link}\r\rText with \`code\`.`, 'foo `bar\r\rText with code.', '/uri\r\rText with code.'],
    [`${link}\r\n\r\nText with \`code\`.`, 'foo `bar\r\n\r\nText with code.', '/uri\r\n\r\nText with code.'],
    [`${link}\n# Heading \`code\``, 'foo `bar\nHeading code', '/uri\nHeading code'],
    [`${link}\n> quote \`code\``, 'foo `bar\nquote code', '/uri\nquote code'],
    [`${link}\n- list \`code\``, 'foo `bar\nlist code', '/uri\nlist code'],
    [`${link}\n1. list \`code\``, 'foo `bar\nlist code', '/uri\nlist code'],
    ['[foo `a\r\nb]` bar](/uri)', 'foo `a\r\nb]` bar', '/uri'],
  ];

  for (const [markdown, expected, expectedUrl] of cases) {
    for (const [implementation, name] of [[commonJs, 'CommonJS'], [removeMdFromPortableEsm, 'ESM']]) {
      assert.equal(implementation(markdown), expected, `${name} ${JSON.stringify(markdown)}`);
      assert.equal(
        implementation(markdown, { replaceLinksWithURL: true }),
        expectedUrl,
        `${name} ${JSON.stringify(markdown)} (url)`,
      );
    }
  }
});

test('the generated ESM implementation is synchronized with index.js', () => {
  run(process.execPath, ['scripts/build-esm.mjs', '--check'], projectRoot);
});
