import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import removeMd from '../index.node.mjs';
import { defaults, changedOptions, parseTags, usageSnippet } from '../showcase/options.mjs';
import { diffText } from '../showcase/diff.mjs';
import { examples, cases, timingDocument, normalizeContent } from '../fixtures/corpus.mjs';
import { percentile, shuffled, summarize } from '../bench/statistics.mjs';

test('option inventory covers every published option', async () => {
  const declarations = await readFile(new URL('../index.d.ts', import.meta.url), 'utf8');
  const keys = [...declarations.matchAll(/^  (\w+)\?:/gm)].map((match) => match[1]).sort();
  assert.deepEqual(Object.keys(defaults).sort(), keys);
  assert.deepEqual(changedOptions(structuredClone(defaults)), {});
});

test('copied JavaScript reproduces the selected example and its settings', () => {
  for (const example of examples) {
    const options = { ...structuredClone(defaults), ...structuredClone(example.options) };
    const snippet = usageSnippet(example.input, options).replace("import removeMd from 'remove-markdown';", '');
    const result = vm.runInNewContext(snippet + '\ntext;', { removeMd });
    assert.equal(result, removeMd(example.input, structuredClone(example.options)), example.id);
  }
});

test('tag names accept custom elements and reject regex expressions', () => {
  assert.deepEqual(parseTags(' Strong, em, strong, my-note, '), ['strong', 'em', 'my-note']);
  assert.deepEqual(parseTags(''), []);
  for (const invalid of ['[', 'a|b', '<strong>', 'script onload=x']) assert.throws(() => parseTags(invalid));
});

test('diff reconstructs both texts, including empty, Unicode, and large input', () => {
  const pairs = [['', 'hello'], ['hello', ''], ['a b c', 'a d c'], ['a\n\nb', 'a b'], ['你好 🌿', '你好 **🌿**'], ['same', 'same'], [Array(300).fill('a').join(' '), Array(300).fill('b').join(' ')]];
  let seed = 123;
  const word = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return ['one', 'two', '\n', ' ', '🌿'][seed % 5]; };
  for (let i = 0; i < 50; i++) pairs.push([Array.from({ length: 20 }, word).join(''), Array.from({ length: 20 }, word).join('')]);
  for (const [before, after] of pairs) {
    const parts = diffText(before, after);
    assert.equal(parts.filter((part) => part.type !== 'added').map((part) => part.text).join(''), before);
    assert.equal(parts.filter((part) => part.type !== 'removed').map((part) => part.text).join(''), after);
  }
});

test('corpus IDs are unique and the timed document meets the declared policy', () => {
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);
  assert.equal(normalizeContent(removeMd(timingDocument.input)), normalizeContent(timingDocument.expected));
  assert.ok(cases.some((item) => item.category === 'Code'));
  assert.ok(cases.some((item) => item.options?.stripMdxImports));
});

test('statistics do not mutate samples and shuffle is reproducible', () => {
  const values = [4, 1, 3, 2];
  assert.equal(percentile(values, .5), 2.5);
  assert.deepEqual(values, [4, 1, 3, 2]);
  assert.equal(summarize([1000, 1000, 1000], 1048576).throughputMiBPerSecond, 1);
  assert.deepEqual(shuffled(values, 42), shuffled(values, 42));
  assert.deepEqual([...shuffled(values, 42)].sort(), [...values].sort());
});

test('theme follows system changes, persists explicit choices, and survives blocked storage', async () => {
  const source = await readFile(new URL('../showcase/theme.mjs', import.meta.url), 'utf8');
  for (const storageBlocked of [false, true]) {
    const listeners = {};
    const store = {};
    const media = { matches: true, addEventListener: (name, fn) => { listeners.system = fn; } };
    const select = { value: '', addEventListener: (name, fn) => { listeners.select = fn; } };
    const root = { dataset: {} };
    const context = { matchMedia: () => media, document: { documentElement: root, querySelector: () => select }, localStorage: { getItem: (key) => { if (storageBlocked) throw new Error('blocked'); return store[key]; }, setItem: (key, value) => { if (storageBlocked) throw new Error('blocked'); store[key] = value; } } };
    vm.runInNewContext(source, context);
    assert.equal(select.value, 'system'); assert.equal(root.dataset.theme, 'dark');
    media.matches = false; listeners.system(); assert.equal(root.dataset.theme, 'light');
    select.value = 'dark'; listeners.select(); assert.equal(root.dataset.theme, 'dark');
    media.matches = false; listeners.system(); assert.equal(root.dataset.theme, 'dark');
    select.value = 'light'; listeners.select(); assert.equal(root.dataset.theme, 'light');
    media.matches = true; listeners.system(); assert.equal(root.dataset.theme, 'light');
    select.value = 'system'; listeners.select(); assert.equal(root.dataset.theme, 'dark');
    if (!storageBlocked) assert.equal(store['remove-markdown-theme'], 'system');
  }
});
