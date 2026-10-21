import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import candidateEsm from '../index.mjs';
import preOverrides from './fixtures/pre-rule-overrides.cjs';

const candidateCommonJs = createRequire(import.meta.url)('../index.js');

import {
  installPackedPackage,
  installRegistryPackage,
  packProject,
} from './helpers/package-fixture.mjs';

const representativeInputs = [
  '',
  'Plain text',
  '# Heading',
  '## Heading with #hashtag',
  '*italic* and **bold** and _underscore_',
  '[link](https://example.com)',
  '![alt text](image.png)',
  '> quoted\n> text',
  '- one\n- two\n  - nested',
  '1. first\n2. second',
  '```js\nconst answer = 42;\n```',
  '<div>HTML <sub>subscript</sub></div>',
  '~~struck~~ and `inline code`',
  '*[HTML]: Hyper Text Markup Language\nHTML',
  'Text with [nested [brackets]](https://example.com)',
  'import { A, B } from "pkg";\n\n# Text',
  '- import "data" using the "Import" button.',
  '```js\nimport A from "pkg";\n```',
];

const optionSets = [
  undefined,
  { stripMdxImports: false },
  { stripListLeaders: false },
  { listUnicodeChar: '•' },
  { gfm: false },
  { useImgAltText: false },
  { abbr: true },
  { replaceLinksWithURL: true },
  { separateLinksAndTexts: ': ' },
  { htmlTagsToSkip: ['sub', 'span'] },
  { throwError: true },
  {
    abbr: true,
    gfm: false,
    htmlTagsToSkip: ['sub'],
    replaceLinksWithURL: true,
    stripListLeaders: false,
    throwError: true,
    useImgAltText: false,
  },
];

function generatedInputs(count) {
  const tokens = [
    'text', ' ', '\n', '# ', '*bold*', '_italic_', '`code`',
    '[link](https://example.com)', '![alt](image.png)', '> quote',
    '- item', '1. item', '<em>html</em>', '~~strike~~', '\\*escaped\\*',
  ];
  const inputs = [];
  let state = 0x5eed1234;

  for (let index = 0; index < count; index += 1) {
    let input = '';
    const tokenCount = 3 + (state % 12);
    for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      input += tokens[state % tokens.length];
    }
    inputs.push(input);
  }
  return inputs;
}

function cloneOptions(options) {
  return options === undefined ? undefined : JSON.parse(JSON.stringify(options));
}

test('omitted and empty overrides preserve the pre-feature contract', () => {
  const inputs = representativeInputs.concat(generatedInputs(1000), [
    '[<b>label</b>](https://example.com/<x>)',
    '![**alt**](image.png) and [**label**](url)',
    '[label](url) and [other][ref]\n\n[ref]: target',
    '**2*3** and **4*5**',
    '_***_hello**_',
    '[foo `bar](/uri)\n> quote `code`',
    '<span title="1 < 2">hello</span>',
    '<!--x><!--x>',
    'import A from "pkg";\n\n# Heading',
  ]);
  const configurations = optionSets.concat([
    { stripMdxImports: true },
    { separateLinksAndTexts: ': ', replaceLinksWithURL: true, htmlTagsToSkip: ['b'] },
  ]);
  const emptyRules = [undefined, {}, {
    html: undefined,
  }];

  for (const convert of [candidateCommonJs, candidateEsm]) {
    for (const input of inputs) {
      for (const options of configurations) {
        const expectedOptions = cloneOptions(options);
        const expected = preOverrides(input, expectedOptions);
        const actualOptions = cloneOptions(options);
        assert.equal(convert(input, actualOptions), expected);
        assert.deepEqual(actualOptions, expectedOptions, 'existing option normalization changed');
        for (const rules of emptyRules) {
          assert.equal(convert(input, { ...cloneOptions(options), rules }), expected,
            JSON.stringify({ input, options, rules }));
        }
      }
    }
    for (const input of ['', undefined, null, false, 0]) {
      assert.equal(convert(input), preOverrides(input));
    }
  }
});

test('the candidate matches published 0.6.4 behavior', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'remove-markdown-differential-'));

  try {
    const { tarball } = packProject(temporaryDirectory);
    const consumer = installPackedPackage(
      temporaryDirectory,
      'differential-consumer',
      tarball,
      'commonjs',
    );
    installRegistryPackage(
      consumer,
      'remove-markdown-baseline@npm:remove-markdown@0.6.4',
    );

    const consumerRequire = createRequire(join(consumer, 'consumer.cjs'));
    const baseline = consumerRequire('remove-markdown-baseline');
    const candidate = consumerRequire('remove-markdown');
    const inputs = representativeInputs.concat(generatedInputs(1000));

    for (const input of inputs) {
      for (const options of optionSets) {
        const expected = baseline(input, cloneOptions(options));

        assert.equal(
          candidate(input, cloneOptions(options)),
          expected,
          `CommonJS output differed for ${JSON.stringify({ input, options })}`,
        );
        assert.equal(
          candidateEsm(input, cloneOptions(options)),
          expected,
          `ESM output differed for ${JSON.stringify({ input, options })}`,
        );
      }
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
