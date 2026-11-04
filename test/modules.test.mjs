import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  ];

  for (const [markdown, options] of cases) {
    assert.equal(
      removeMdFromPortableEsm(markdown, options),
      commonJs(markdown, options),
    );
  }
});

test('CommonJS and portable ESM agree on the angle-bracket acceptance cases', () => {
  const commonJs = require('remove-markdown');
  const skipB = { htmlTagsToSkip: ['b'] };
  const cases = [
    // Ordinary comparisons are preserved.
    ['The equations 2 < 3 and 3 > 1 are both true', undefined, 'The equations 2 < 3 and 3 > 1 are both true'],
    ['if x < 3 then say "hi" > y', skipB, 'if x < 3 then say "hi" > y'],
    // Quoted attribute values may contain "<".
    ['<span title="1 < 2">hello</span>', undefined, 'hello'],
    ['<span title="1 < 2">hello</span>', skipB, 'hello'],
    ['<img src=x onerror="alert(1)" data-note="<">', undefined, ''],
    ["<a href='x' title=\"a<b\">t</a>", undefined, 't'],
    // htmlTagsToSkip keeps the listed tags.
    ['<p>Hello <b>World</b> 2 < 3 > 1</p>', skipB, 'Hello <b>World</b> 2 < 3 > 1'],
    ['<b title="1 < 2">x</b> <i title=\'a<b\'>y</i>', skipB, '<b title="1 < 2">x</b> y'],
    // Raw constructs end at their own terminators and are kept as text when unterminated.
    ['a <!-- comment > still a comment --> b', undefined, 'a  b'],
    ['a <![CDATA[ x > y ]]> b', undefined, 'a  b'],
    ['a <?php echo 1; ?> b', undefined, 'a  b'],
    ['a <!-- b --> c <!-- d <!-- e', undefined, 'a  c <!-- d <!-- e'],
    ['a <![CDATA[ b ]]> c <![CDATA[ d <![CDATA[ e', undefined, 'a  c <![CDATA[ d <![CDATA[ e'],
    ['a <?p b ?> c <?q d <?r e', undefined, 'a  c <?q d <?r e'],
  ];

  for (const [markdown, options, expected] of cases) {
    assert.equal(commonJs(markdown, options && { ...options }), expected, markdown);
    assert.equal(removeMdFromPortableEsm(markdown, options && { ...options }), expected, markdown);
  }
});

test('portable ESM stays linear on unterminated raw constructs, also after every U+E000..U+F8FF character', () => {
  const entry = pathToFileURL(fileURLToPath(new URL('../index.mjs', import.meta.url))).href;
  const privateUse = "Array.from({ length: 6400 }, (_, i) => String.fromCharCode(0xE000 + i)).join('')";
  const probe = (unit, size, prefix) => {
    const code = [
      `import removeMd from ${JSON.stringify(entry)};`,
      "removeMd('warmup');",
      `const input = ${prefix} + ${JSON.stringify(unit)}.repeat(${size});`,
      'const start = Date.now();',
      'const output = removeMd(input);',
      'console.log(JSON.stringify([Date.now() - start, output === input]));',
    ].join('\n');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 10000 });
    const label = `${JSON.stringify(unit)} x ${size}${prefix === "''" ? '' : ' after U+E000..U+F8FF'}`;
    assert.equal(result.error?.code, undefined, label);
    assert.equal(result.status, 0, `${label} ${result.stderr}`);
    const [elapsed, unchanged] = JSON.parse(result.stdout);
    assert.ok(unchanged, `${label} changed the text`);
    return elapsed;
  };

  for (const [unit, prefix] of [
    ['<!--x>', "''"],
    ['<![CDATA[x>', "''"],
    ['<?x>', "''"],
    ['<![CDATA[x>', privateUse],
  ]) {
    const small = probe(unit, 16000, prefix);
    const large = probe(unit, 64000, prefix);
    const label = `${JSON.stringify(unit)}: ${small} ms, then ${large} ms for 4x the input`;
    assert.ok(large < 3000, label);
    if (small >= 25) assert.ok(large / small < 10, label);
  }
});

test('the generated ESM implementation is synchronized with index.js', () => {
  run(process.execPath, ['scripts/build-esm.mjs', '--check'], projectRoot);
});
