import removeMd from '../index.mjs';

Deno.test('the ESM entry works in Deno', () => {
  const actual = removeMd('# Heading\n\n[link](https://example.com)');
  const expected = 'Heading\n\nlink';

  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
});
