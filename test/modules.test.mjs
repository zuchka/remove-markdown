import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import removeMd from 'remove-markdown';

const require = createRequire(import.meta.url);

test('CommonJS and ESM expose the same function', async () => {
  const commonJs = require('remove-markdown');
  const dynamicImport = await import('remove-markdown');

  assert.strictEqual(removeMd, commonJs);
  assert.strictEqual(dynamicImport.default, commonJs);
  assert.equal(removeMd('# Heading'), 'Heading');
});
