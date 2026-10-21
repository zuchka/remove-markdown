import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

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

for (const replacement of ['$$', '$5', '$&', '$`', "$'", '$10', '$99', '$0', '$3']) {
  optionSets.push(
    { separateLinksAndTexts: ` ${replacement} ` },
    { listUnicodeChar: replacement },
  );
}

function blockPairs() {
  // Combine complete constructs, including syntax removed before inline links.
  // Ambiguous/nested parsing fixes need their own explicit expected-output cases;
  // the published baseline here checks behavior that is intended to stay stable.
  const blocks = [
    '',
    'Plain text',
    'Price: $5, $$10 and $&',
    'Unicode: café 😀 漢字',
    '# Heading',
    '## Heading with #hashtag',
    '- list item',
    '1. numbered item',
    '> quoted text',
    '**bold** and _italic_',
    '`inline code`',
    '[label](https://example.com)',
    '![alt text](image.png)',
    '<em>HTML</em>',
    '~~strike~~',
    '---',
    '*[HTML]: Hyper Text Markup Language\nHTML',
    '```js\nconst answer = 42;\n```',
    '\\*escaped\\*',
    '  indented text',
  ];
  const inputs = [];
  for (const before of blocks) {
    for (const after of blocks) {
      for (const lineEnding of ['\n', '\r\n', '\r']) {
        inputs.push([before, after].join('\n').replace(/\n/g, lineEnding));
      }
    }
  }
  return inputs;
}

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

test('the packed entry points match unaffected published 0.6.4 behavior', async (t) => {
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
    const implementations = [
      ['CommonJS', consumerRequire('remove-markdown')],
      ['portable ESM', (await import(pathToFileURL(consumerRequire.resolve('remove-markdown/index.mjs')))).default],
    ];
    const inputs = representativeInputs.concat(generatedInputs(1000), blockPairs());

    for (const input of inputs) {
      for (const options of optionSets) {
        const expectedOptions = cloneOptions(options);
        const expected = baseline(input, expectedOptions);
        // This option was added after 0.6.4. Account for its released default
        // explicitly while preserving the normalization of all legacy options.
        if (expectedOptions && !Object.hasOwn(expectedOptions, 'stripMdxImports')) {
          expectedOptions.stripMdxImports = false;
        }
        for (const [name, convert] of implementations) {
          const actualOptions = cloneOptions(options);
          const context = `${name}: ${JSON.stringify({ input, options })}`;
          assert.equal(convert(input, actualOptions), expected, context);
          assert.deepEqual(actualOptions, expectedOptions, `option normalization changed for ${context}`);
        }
      }
    }
    t.diagnostic(`${inputs.length} inputs × ${optionSets.length} option sets × ${implementations.length} packed entry points`);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
