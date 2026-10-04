import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import candidateEsm from '../index.mjs';

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
];

const optionSets = [
  undefined,
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
