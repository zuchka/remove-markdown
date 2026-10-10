import test from 'node:test';
import assert from 'node:assert/strict';
import { adapters, createAdapter } from './adapters.mjs';
import { timingDocument, normalizeContent } from '../fixtures/corpus.mjs';

for (const adapter of adapters) {
  test(`${adapter.id}: timed fixture retains the declared content`, async () => {
    const convert = await createAdapter(adapter.id);
    assert.equal(normalizeContent(convert(timingDocument.input)), normalizeContent(timingDocument.expected));
    assert.equal(typeof convert(''), 'string');
  });
}
for (const id of ['marked-html', 'markdown-it-html']) {
  test(`${id}: HTML profile preserves alt text without adding image sources`, async () => {
    const convert = await createAdapter(id);
    assert.equal(normalizeContent(convert('![A still lake](lake.jpg)')), 'A still lake');
    assert.equal(normalizeContent(convert('Before ![](lake.jpg) after.')), 'Before after.');
    assert.equal(normalizeContent(convert('# Case matters\n\n1. One\n2. Two')), 'Case matters One Two');
  });
}
