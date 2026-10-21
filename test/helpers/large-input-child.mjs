import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [format, family, size, mode] = process.argv.slice(2);
const count = Number(size);
assert.ok(Number.isSafeInteger(count) && count > 0);
assert.ok(['commonjs', 'portable-esm'].includes(format));
assert.ok(['default', 'catch', 'throw'].includes(mode));

const documents = {
  headings: ['# h\n', 'h\n'],
  paragraphs: ['text\n\n', 'text\n\n'],
  lists: ['- item\n', 'item\n'],
};
assert.ok(Object.hasOwn(documents, family));
const [input, expected] = documents[family].map((part) => part.repeat(count));
// Resolve from the installed consumer, not from this repository's source tree.
const require = createRequire(join(process.cwd(), 'consumer.cjs'));
const removeMd = format === 'commonjs'
  ? require('remove-markdown')
  : (await import(pathToFileURL(require.resolve('remove-markdown/index.mjs')))).default;
const options = mode === 'default' ? undefined : { throwError: mode === 'throw' };
const errors = [];
const originalError = console.error;
let actual;
try {
  console.error = (...args) => errors.push(args);
  actual = removeMd(input, options);
} finally {
  console.error = originalError;
}

// Returning the original input after a caught error must fail even for plain text.
assert.equal(errors.length, 0, 'conversion logged an unexpected error');
assert.equal(typeof actual, 'string');
assert.equal(actual.length, expected.length, 'output length changed');
assert.ok(actual === expected, 'output content changed');
