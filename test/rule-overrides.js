'use strict';

const assert = require('node:assert/strict');
const commonJs = require('../index.js');
let portableEsm;

describe('rule overrides', function () {
  before(async function () {
    portableEsm = (await import('../index.mjs')).default;
  });

  for (const [format, convert] of [
    ['CommonJS', commonJs],
    ['portable ESM', (...args) => portableEsm(...args)],
  ]) {
    describe(format, function () {
      it('skips only HTML stripping when html is false', function () {
        assert.equal(convert('<b>**bold**</b>', { rules: { html: false } }), '<b>bold</b>');
      });

      it('runs custom HTML handling once and continues processing its output', function () {
        const seen = [];
        const rules = Object.freeze({ html(text) {
          seen.push(text);
          return text.replace(/<[^>]*>/g, '') + ' **added**';
        } });
        assert.equal(convert('- <b>text</b>', { rules }), 'text added');
        assert.deepEqual(seen, ['<b>text</b>']);
        assert.equal(convert('<b>text</b>'), 'text');
      });

      it('lets the HTML override supersede htmlTagsToSkip', function () {
        assert.equal(convert('<b>text</b>', {
          htmlTagsToSkip: ['b'], rules: { html: text => text.replace(/<[^>]*>/g, '') },
        }), 'text');
        assert.equal(convert('<b>text</b>', {
          htmlTagsToSkip: ['['], rules: { html: false },
        }), '<b>text</b>');
      });

      it('skips the image operation while later link handling still runs', function () {
        assert.equal(convert('![alt](image.png)', { rules: { images: false } }), '!alt');
      });

      it('replaces image handling once, superseding useImgAltText', function () {
        const seen = [];
        assert.equal(convert('<b>![alt](image.png)</b>', {
          useImgAltText: false,
          rules: { images(text) {
            seen.push(text);
            return text.replace('![alt](image.png)', '**custom image**');
          } },
        }), 'custom image');
        assert.deepEqual(seen, ['![alt](image.png)']);
        assert.equal(convert('![alt](image.png)', { rules: { images: () => '' } }), '');
      });

      it('snapshots entries so a callback cannot replace a later rule in the current call', function () {
        const imageRule = () => 'original';
        const rules = { html(text) { rules.images = () => 'changed'; return text; }, images: imageRule };
        assert.equal(convert('text', { rules }), 'original');
        assert.equal(convert('text', { rules }), 'changed');
        assert.equal(convert('![alt](image.png)'), 'alt');
      });

      it('skips both link paths when inlineLinks is false', function () {
        assert.equal(convert('[label](url) and [other][ref]', {
          separateLinksAndTexts: ': ', replaceLinksWithURL: true,
          rules: { inlineLinks: false },
        }), '[label](url) and [other][ref]');
      });

      it('runs the inline-link callback once after HTML and images', function () {
        const seen = [];
        assert.equal(convert('<b>[label](url)</b> ![alt](image.png)', {
          separateLinksAndTexts: ': ', replaceLinksWithURL: true,
          rules: { inlineLinks(text) {
            seen.push(text);
            return text.replace('[label](url)', '**custom**');
          } },
        }), 'custom alt');
        assert.deepEqual(seen, ['[label](url) alt']);
      });

      it('preserves image syntax when both image and link operations are skipped', function () {
        assert.equal(convert('![alt](image.png)', {
          separateLinksAndTexts: ': ',
          rules: { images: false, inlineLinks: false },
        }), '![alt](image.png)');
      });

      it('keeps the legacy separator pass when only another rule is overridden', function () {
        assert.equal(convert('[<b>label</b>](url)', {
          separateLinksAndTexts: ': ', rules: { html: false },
        }), '<b>label</b>: url');
      });

      it('leaves link-definition cleanup independent of inline-link overrides', function () {
        assert.equal(convert('[label](url)\n\n[ref]: target', {
          rules: { inlineLinks: false },
        }), '[label](url)');
      });

      it('skips both emphasis passes while other formatting is still removed', function () {
        assert.equal(convert('# **bold** _italic_', { rules: { emphasis: false } }),
          '**bold** _italic_');
        assert.equal(convert('- *item*', { rules: { emphasis: false } }), '*item*');
      });

      it('runs custom emphasis once without reapplying built-in emphasis', function () {
        const seen = [];
        assert.equal(convert('# **bold** _italic_', { rules: { emphasis(text) {
          seen.push(text);
          return '__custom__';
        } } }), '__custom__');
        assert.deepEqual(seen, ['**bold** _italic_']);
      });

      it('runs frozen override maps in the existing operation order', function () {
        const seen = [];
        const rules = Object.freeze({
          emphasis(text) { seen.push('emphasis'); return text.replace('**bold**', 'bold'); },
          inlineLinks(text) { seen.push('inlineLinks'); return text.replace('[label](url)', 'link'); },
          images(text) { seen.push('images'); return text.replace('![alt](image.png)', 'image'); },
          html(text) { seen.push('html'); return text.replace(/<\/?b>/g, ''); },
        });
        assert.equal(convert('<b>![alt](image.png) [label](url) **bold**</b>', { rules }),
          'image link bold');
        assert.deepEqual(seen, ['html', 'images', 'inlineLinks', 'emphasis']);
      });

      it('validates the full map before invoking any callback', function () {
        let calls = 0;
        assert.throws(() => convert('text', {
          rules: { html() { calls++; return ''; }, emphasis: true }, throwError: true,
        }), TypeError);
        assert.equal(calls, 0);
      });

      it('uses only explicitly supplied rules and own rule entries', function () {
        assert.equal(convert('<b>text</b>', Object.create({ rules: { html: false } })), 'text');
        assert.equal(convert('<b>text</b>', { rules: Object.create({ html: false }) }), 'text');
        assert.equal(convert('<b>text</b>', {
          rules: Object.assign(Object.create(null), { html: false }),
        }), '<b>text</b>');
      });

      it('rejects invalid configurations when throwError is enabled', function () {
        for (const rules of [null, false, [], 'html', () => '', { typo: false },
          { toString: false }, { html: true }, { html: /html/g }]) {
          assert.throws(() => convert('text', { rules, throwError: true }), TypeError);
        }
      });

      it('rejects non-string results and propagates callback errors', function () {
        for (const result of [undefined, null, 42, {}, Promise.resolve('text')]) {
          assert.throws(() => convert('text', {
            rules: { html: () => result }, throwError: true,
          }), /Rule html must return a string/);
        }
        const error = new Error('custom rule failed');
        assert.throws(() => convert('text', {
          rules: { html: () => { throw error; } }, throwError: true,
        }), error);
      });

      it('logs errors and returns the original input by default', function () {
        const input = '- <b>text</b>';
        const logs = [];
        const original = console.error;
        console.error = (...args) => logs.push(args);
        try {
          assert.equal(convert(input, { rules: { html: () => 42 } }), input);
          assert.equal(convert(input, { rules: { typo: false } }), input);
          assert.equal(logs.length, 2);
        } finally {
          console.error = original;
        }
      });

      it('handles rejected async results without an unhandled rejection', async function () {
        assert.throws(() => convert('text', {
          rules: { html: async () => { throw new Error('async failure'); } },
          throwError: true,
        }), /Rule html must return a string/);
        await new Promise(resolve => setImmediate(resolve));
      });

      for (const name of ['html', 'images', 'inlineLinks', 'emphasis']) {
        it('validates results and recovers from errors in ' + name, function () {
          assert.equal(convert('text', { rules: { [name]: () => '' } }), '');
          assert.throws(() => convert('text', {
            rules: { [name]: () => false }, throwError: true,
          }), new RegExp('Rule ' + name + ' must return a string'));
          const error = new Error(name + ' failed');
          const log = console.error;
          const logs = [];
          console.error = (...args) => logs.push(args);
          try {
            assert.equal(convert('- **original**', {
              rules: { [name]: () => { throw error; } },
            }), '- **original**');
            assert.equal(logs.length, 1);
            assert.strictEqual(logs[0][1], error);
          } finally {
            console.error = log;
          }
        });
      }
    });
  }
});
