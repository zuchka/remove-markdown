import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const entry = fileURLToPath(new URL('../index.js', import.meta.url));
const worker = `
  const { performance } = require('node:perf_hooks');
  const removeMd = require(process.argv[1]);
  const name = process.argv[2];
  const cases = {
    brackets: ['['.repeat(100000) + 'x'],
    asterisks: ['*'.repeat(100000) + 'x'],
    underscores: ['_'.repeat(100000) + 'x'],
    backticks: [String.fromCharCode(96).repeat(100000) + 'x'],
    html: ['<'.repeat(100000) + 'x'],
    tildes: ['~'.repeat(100000) + 'x'],
    footnotes: ['[^'.repeat(50000) + 'x'],
    images: ['!['.repeat(50000) + 'x'],
    spacedAsterisks: [' *['.repeat(33333) + 'x', { abbr: true }],
    whitespace: [String.fromCharCode(32, 10).repeat(50000) + 'x'],
  };
  const [input, options] = cases[name];
  const start = performance.now();
  removeMd(input, options);
  process.stdout.write(String(performance.now() - start));
`;

for (const name of [
  'brackets', 'asterisks', 'underscores', 'backticks', 'html',
  'tildes', 'footnotes', 'images', 'spacedAsterisks', 'whitespace',
]) {
  test(`${name} completes within a bounded time`, () => {
    const result = spawnSync(process.execPath, ['-e', worker, entry, name], {
      encoding: 'utf8',
      timeout: 5000,
    });

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const duration = Number(result.stdout);
    assert.ok(Number.isFinite(duration));
    assert.ok(duration < 1500, `${name} took ${duration.toFixed(0)} ms`);
  });
}
