'use strict';
const expect = require('chai').expect;
const removeMd = require('../');

describe('remove Markdown', function () {
  describe('removeMd', function () {
    it('should leave a string alone without markdown', function () {
      const string = 'Javascript Developers are the best.';
      expect(removeMd(string)).to.equal(string);
    });

    it('should strip out remaining markdown', function () {
      const string = '*Javascript* developers are the _best_.';
      const expected = 'Javascript developers are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should leave non-matching markdown markdown', function () {
      const string = '*Javascript* developers* are the _best_.';
      const expected = 'Javascript developers* are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should leave non-matching markdown, but strip empty anchors', function () {
      const string = '*Javascript* [developers]()* are the _best_.';
      const expected = 'Javascript developers* are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip HTML', function () {
      const string = '<p>Hello World</p>';
      const expected = 'Hello World';
      expect(removeMd(string)).to.equal(expected);
    });

    describe('acceptance: angle brackets, HTML and bounded runtime', function () {
      describe('ordinary text is preserved', function () {
        it('should not strip plain-text angle brackets that do not form HTML', function () {
          const tests = [
            { string: 'The equations 2 < 3 and 3 > 1 are both true', expected: 'The equations 2 < 3 and 3 > 1 are both true' },
            { string: 'Cost: $5 < $10 and $20 > $15, so choose.', expected: 'Cost: $5 < $10 and $20 > $15, so choose.' },
            { string: 'You can write to John Doe <john.doe AT example DOT com>', expected: 'You can write to John Doe <john.doe AT example DOT com>' },
            { string: '1 < 100 and 100 > 0', expected: '1 < 100 and 100 > 0' },
            { string: '2 << 3 >> 1', expected: '2 << 3 >> 1' },
            { string: 'x <-> y <=> z', expected: 'x <-> y <=> z' },
            { string: 'a <! word > b', expected: 'a <! word > b' },
            { string: 'if x < 3 then say "hi" > y', expected: 'if x < 3 then say "hi" > y' },
          ];
          tests.forEach(function (test) {
            expect(removeMd(test.string)).to.equal(test.expected);
            expect(removeMd(test.string, { htmlTagsToSkip: ['b'] })).to.equal(test.expected);
          });
        });

        it('should not treat a "<" outside a quoted attribute value as part of a tag', function () {
          expect(removeMd('<a title=1 < 2>x</a>')).to.equal('<a title=1 < 2>x');
        });

        it('should still remove valid links and images next to stray square brackets', function () {
          const stray = String.fromCharCode(0xE000);
          const escape = String.fromCharCode(0xE001);
          const allPrivateUse = Array.from({ length: 6400 }, function (_, i) { return String.fromCharCode(0xE000 + i); }).join('');
          const tests = [
            { string: 'x [a](b) y [ [ [', expected: 'x a y [ [ [' },
            { string: '![i](p.png) [ [ [ and [ ref ] [l](u)', expected: 'i  [ [ and [ ref (u)' },
            { string: 'note[^1] [ [ [\n\n[^1]: the note', expected: 'note [ [ [\n\n' },
            { string: 'a\n[ref]: http://r\n[ [ [', expected: 'a\n[ref]: http://r\n[ [ [' },
            { string: 'a\n\n[ref]: http://r', expected: 'a' },
            // Text that happens to hold a character used internally must come back unchanged.
            { string: stray + ' [a](b) ' + stray, expected: stray + ' a ' + stray },
            { string: escape + '1 [a](b) ' + stray + '2 [ ' + escape + escape + '2', expected: escape + '1 a ' + stray + '2 [ ' + escape + escape + '2' },
            { string: allPrivateUse + ' [a](b) [ [ [ ![i](p) ' + allPrivateUse, expected: allPrivateUse + ' a [ [ [ i ' + allPrivateUse },
          ];
          tests.forEach(function (test) {
            expect(removeMd(test.string)).to.equal(test.expected);
          });
        });
      });

      describe('HTML constructs are stripped', function () {
        it('should strip HTML comments, declarations, CDATA, processing instructions and autolinks', function () {
          const tests = [
            { string: '<p>Hello <b>World</b><br/><img src="a.png" alt="x"></p>', expected: 'Hello World' },
            { string: 'a <!-- comment > still a comment --> b', expected: 'a  b' },
            { string: 'a <![CDATA[ x > y ]]> b', expected: 'a  b' },
            { string: 'a <?php echo 1; ?> b', expected: 'a  b' },
            { string: '<!DOCTYPE html><html><body>hi</body></html>', expected: 'hi' },
            { string: 'visit <https://example.com/x> or <me@example.com>', expected: 'visit  or ' },
            { string: '<div\nclass="x">multi</div>', expected: 'multi' },
          ];
          tests.forEach(function (test) {
            expect(removeMd(test.string)).to.equal(test.expected);
          });
        });

        it('should leave unterminated comments, CDATA sections and processing instructions as text', function () {
          const tests = [
            { string: 'a <!-- b', expected: 'a <!-- b' },
            { string: 'a <![CDATA[ b > c', expected: 'a <![CDATA[ b > c' },
            { string: 'a <?php b > c', expected: 'a <?php b > c' },
            { string: 'a <!-- b --> c <!-- d <!-- e', expected: 'a  c <!-- d <!-- e' },
            { string: 'a <![CDATA[ b ]]> c <![CDATA[ d <![CDATA[ e', expected: 'a  c <![CDATA[ d <![CDATA[ e' },
            { string: 'a <?p b ?> c <?q d <?r e', expected: 'a  c <?q d <?r e' },
          ];
          tests.forEach(function (test) {
            expect(removeMd(test.string)).to.equal(test.expected);
          });
        });
      });

      describe('quoted attribute values may contain angle brackets', function () {
        it('should strip such tags with default options and with htmlTagsToSkip', function () {
          const tests = [
            { string: '<span title="1 < 2">hello</span>', expected: 'hello' },
            { string: "<span title='1 < 2'>hello</span>", expected: 'hello' },
            { string: '<img src=x onerror="alert(1)" data-note="<">', expected: '' },
            { string: "<img src=x onerror='alert(1)' data-note='<'>", expected: '' },
            { string: "<a href='x' title=\"a<b\">t</a>", expected: 't' },
          ];
          tests.forEach(function (test) {
            expect(removeMd(test.string)).to.equal(test.expected);
            expect(removeMd(test.string, { htmlTagsToSkip: ['b'] })).to.equal(test.expected);
          });
        });
      });

      describe('htmlTagsToSkip', function () {
        it('should keep listed tags and still strip the others', function () {
          expect(removeMd('<p>Hello <b>World</b> 2 < 3 > 1</p>', { htmlTagsToSkip: ['b'] })).to.equal('Hello <b>World</b> 2 < 3 > 1');
        });

        it('should keep listed tags whose quoted attribute values contain angle brackets', function () {
          const options = { htmlTagsToSkip: ['b'] };
          expect(removeMd('<b title="1 < 2">x</b> <i title=\'a<b\'>y</i>', options)).to.equal('<b title="1 < 2">x</b> y');
        });
      });

      describe('runtime stays bounded (each probe runs in its own process)', function () {
        const { spawnSync } = require('child_process');
        const entry = require.resolve('../');
        const allPrivateUse = "Array.from({ length: 6400 }, (_, i) => String.fromCharCode(0xE000 + i)).join('')";

        // Converts `prefix + unit.repeat(size)` in a fresh process: returns the time of the call and
        // whether the output equals the input (these inputs hold nothing to strip).
        function probe(unit, size, prefix) {
          const code = [
            'const removeMd = require(' + JSON.stringify(entry) + ');',
            "removeMd('warmup');",
            'const input = ' + (prefix || "''") + ' + ' + JSON.stringify(unit) + '.repeat(' + size + ');',
            'const start = Date.now();',
            'const output = removeMd(input);',
            'console.log(JSON.stringify([Date.now() - start, output === input]));',
          ].join('\n');
          const result = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 10000 });
          const label = JSON.stringify(unit) + ' x ' + size + (prefix ? ' after U+E000..U+F8FF' : '');
          expect(result.error && result.error.code, label).to.equal(undefined);
          expect(result.status, label + ' ' + result.stderr).to.equal(0);
          const measured = JSON.parse(result.stdout);
          expect(measured[1], label + ' output').to.equal(true);
          return measured[0];
        }

        // A linear conversion takes about 4 times as long for 4 times the input, a quadratic one
        // about 16 times as long. The absolute bound is generous; the ratio is only checked when
        // the small run is long enough to measure.
        function expectLinear(unit, prefix) {
          const small = probe(unit, 16000, prefix);
          const large = probe(unit, 64000, prefix);
          const label = JSON.stringify(unit) + (prefix ? ' after U+E000..U+F8FF' : '') + ': ' + small + ' ms, then ' + large + ' ms for 4x the input';
          expect(large, label).to.be.below(3000);
          if (small >= 25) expect(large / small, label).to.be.below(10);
        }

        [
          ['unterminated comments', '<!--x>'],
          ['unterminated CDATA sections', '<![CDATA[x>'],
          ['unterminated CDATA sections with "]"', '<![CDATA[x]>'],
          ['unterminated processing instructions', '<?x>'],
          ['unterminated declarations', '<!a'],
          ['comments holding "["', '<!--[x>'],
          ['processing instructions holding "["', '<?[x>'],
          ['"<" followed by "["', '<[x>'],
          ['a repeated "!["', '![a'],
        ].forEach(function (probeCase) {
          it('should take linear time on ' + probeCase[0], function () {
            expectLinear(probeCase[1]);
          });
        });

        it('should take linear time on unterminated CDATA sections and plain "<[" text after every character from U+E000 to U+F8FF', function () {
          expectLinear('<![CDATA[x>', allPrivateUse);
          expectLinear('<[x>', allPrivateUse);
          expectLinear('<!--x>', allPrivateUse);
        });
      });
    });

    it('should strip MDX import statements', function () {
      const tests = [
        { string: 'import page404 from "@/assets/images/404.png"\n\nHere is some text', expected: 'Here is some text' },
        { string: 'import "mycomponent.astro";\nWelcome back!', expected: 'Welcome back!' },
        { string: "import { Validator as val } from '../util.js'\nSuper imports?", expected: 'Super imports?' },
        { string: 'import page404 from "@/assets/images/404.png";\nimport page403 from "@/assets/images/403.png";\n\nSome errors, huh', expected: 'Some errors, huh' },
        { string: `
import a from 'b'
import * as a from 'b'
import {a} from 'b'
import {a as b} from 'c'
import a, {b as c} from 'd'
import a, * as b from 'c'
import 'a'`, expected: '' },
        { string: 'import "with-carrier-return"\r\nA', expected: "A" },
        { string: 'After text:\nimport "keep-it!"', expected: 'After text:\nimport "keep-it!"' }
      ];
      tests.forEach(function (test) {
        expect(removeMd(test.string, { stripMdxImports: true })).to.equal(test.expected);
      });
    })

    it('should not strip import statements from code blocks', function () {
      const string = 'import test from "module";\n```\nimport test from "module";\ntest.run();```';
      const expected = 'import test from "module";\ntest.run();';
      expect(removeMd(string, { stripMdxImports: true })).to.equal(expected);
    })

    it('should not strip MDX imports by default', function () {
      const string = 'import test from "module";\n';
      expect(removeMd(string)).to.equal(string)
    })

    describe('MDX import regressions', function () {
      const imports = [
        'import { A, B } from "pkg";',
        'import { A, B as C, } from "pkg";',
        'import Default, { A, B as C } from "pkg";',
        'import {\n  A,\n  B as C,\n} from "pkg";',
        'import Default,\n{ A, B }\nfrom "pkg";',
        'import {} from "pkg";',
        'import $Component from "pkg";',
        'import  Default from "pkg";',
        'import Default, * as components from "pkg";',
        String.raw`import Component from 'path/with\'quote';`,
      ];

      imports.forEach(function (statement) {
        it('should strip ' + JSON.stringify(statement), function () {
          const string = statement + '\nimport Next from "next";\n\n# Text';
          expect(removeMd(string, { stripMdxImports: true })).to.equal('Text');
          expect(removeMd(statement, { stripMdxImports: true })).to.equal('');
          expect(removeMd(statement)).to.equal(statement);
          expect(removeMd(statement, { stripMdxImports: false })).to.equal(statement);
        });
      });

      ['\n', '\r\n'].forEach(function (newline) {
        it('should consume trailing and blank-line whitespace with ' + JSON.stringify(newline), function () {
          const string = ' \t' + newline +
            'import A from "a"; \t' + newline +
            ' \t' + newline +
            'import { B, C } from "b" \t; \t' + newline +
            '\t ' + newline + '# Text';
          expect(removeMd(string, { stripMdxImports: true })).to.equal('Text');
        });
      });

      it('should consume trailing whitespace at EOF', function () {
        expect(removeMd('import A from "a"; \t', { stripMdxImports: true })).to.equal('');
      });

      const contentCases = [
        ['a list item', '- import "data"\n\nText', 'import "data"\n\nText'],
        ['an ordered list item', '1. import "data"\n\nText', 'import "data"\n\nText'],
        ['quoted prose in a list', '- import "data" using the "Import" button.', 'import "data" using the "Import" button.'],
        ['quoted prose', 'import "data" using the "Import" button.', 'import "data" using the "Import" button.'],
        ['indented code', '    import A from "a";\n\nText', '    import A from "a";\n\nText'],
        ['a horizontal rule', '---\nimport A from "a";\n\nText', 'import A from "a";\n\nText'],
        ['a heading', '# Heading\n\nimport A from "a";\n\nText', 'Heading\n\nimport A from "a";\n\nText'],
        ['a code fence', '```js\nimport A from "a";\n```', 'import A from "a";'],
        ['a trailing comment', 'import A from "a"; // comment\n\nText', 'import A from "a"; // comment\n\nText'],
        ['an unsupported import', 'import A from "a" with { type: "json" };\nimport B from "b";', 'import A from "a" with { type: "json" };\nimport B from "b";'],
      ];

      contentCases.forEach(function ([name, string, expected]) {
        it('should preserve content after ' + name, function () {
          expect(removeMd(string, { stripMdxImports: true })).to.equal(expected);
          expect(removeMd('import First from "first";\n\n' + string, {
            stripMdxImports: true,
          })).to.equal(expected);
        });
      });

      it('should preserve list options when stripping imports', function () {
        const string = 'import First from "first";\n\n- import "data"';
        expect(removeMd(string, { stripMdxImports: true, stripListLeaders: false })).to.equal('- import "data"');
        expect(removeMd(string, { stripMdxImports: true, listUnicodeChar: '•' })).to.equal('• import "data"');
      });
    });

    it('should strip anchors', function () {
      const string = '*Javascript* [developers](https://engineering.condenast.io/)* are the _best_.';
      const expected = 'Javascript developers* are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip img tags', function () {
      const string = '![](https://placebear.com/640/480)*Javascript* developers are the _best_.';
      const expected = 'Javascript developers are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should use the alt-text of an image, if it is provided', function () {
      const string = '![This is the alt-text](https://www.example.com/images/logo.png)';
      const expected = 'This is the alt-text';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip code tags', function () {
      const string = 'In `Getting Started` we set up `something` foo.';
      const expected = 'In Getting Started we set up something foo.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip simple multiline code tags', function () {
      const string = '```\ncode\n```';
      const expected = 'code';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip complex multiline code blocks with language specified', function () {
      const string = '```javascript\nconst x = 1;\nconst y = 2;\nconsole.log(x + y);\n```';
      const expected = 'const x = 1;\nconst y = 2;\nconsole.log(x + y);';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip multiline code blocks with multiple paragraphs', function () {
      const string = 'Text before\n\n```\ncode line 1\n\ncode line 2\n```\n\nText after';
      const expected = 'Text before\n\ncode line 1\n\ncode line 2\n\nText after';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should leave hashtags in headings', function () {
      const string = '## This #heading contains #hashtags';
      const expected = 'This #heading contains #hashtags';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove emphasis', function () {
      const string = 'I italicized an *I* and it _made_ me *sad*.';
      const expected = 'I italicized an I and it made me sad.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove emphasis only if there is no space between word and emphasis characters.', function () {
      const string = 'There should be no _space_, *before* *closing * _ephasis character _.';
      const expected = 'There should be no space, before *closing * _ephasis character _.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove "_" emphasis only if there is space before opening and after closing emphasis characters.', function () {
      const string = '._Spaces_ _ before_ and _after _ emphasised character results in no emphasis.';
      const expected = '.Spaces _ before_ and _after _ emphasised character results in no emphasis.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove double emphasis', function () {
      const string = '**this sentence has __double styling__**';
      const expected = 'this sentence has double styling';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should not mistake a horizontal rule when symbols are mixed ', function () {
      const string = 'Some text on a line\n\n--*\n\nA line below';
      const expected = 'Some text on a line\n\n--*\n\nA line below';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove horizontal rules', function () {
      const string = 'Some text on a line\n\n---\n\nA line below';
      const expected = 'Some text on a line\n\nA line below';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove horizontal rules with space-separated asterisks', function () {
      const string = 'Some text on a line\n\n* * *\n\nA line below';
      const expected = 'Some text on a line\n\nA line below';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove blockquotes', function () {
      const string = '>I am a blockquote';
      const expected = 'I am a blockquote';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove blockquotes with spaces', function () {
      const string = '> I am a blockquote';
      const expected = 'I am a blockquote';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove indented blockquotes', function () {
        var tests = [
            { string: ' > I am a blockquote', expected: 'I am a blockquote' },
            { string: '  > I am a blockquote', expected: 'I am a blockquote' },
            { string: '   > I am a blockquote', expected: 'I am a blockquote' },
        ];
        tests.forEach(function (test) {
            expect(removeMd(test.string)).to.equal(test.expected);
        });
    });

    it('should remove blockquotes over multiple lines', function () {
      const string = '> I am a blockquote firstline  \n>I am a blockquote secondline';
      const expected = 'I am a blockquote firstline  \nI am a blockquote secondline';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove blockquotes following other content', function () {
      const string = '## A headline\n\nA paragraph of text\n\n> I am a blockquote';
      const expected = 'A headline\n\nA paragraph of text\n\nI am a blockquote';

      expect(removeMd(string)).to.equal(expected);
    });

    it('should not remove greater than signs', function () {
      var tests = [
        { string: '100 > 0', expected: '100 > 0' },
        { string: '100 >= 0', expected: '100 >= 0' },
        { string: '100>0', expected: '100>0' },
        { string: '> 100 > 0', expected: '100 > 0' },
        { string: '1 < 100', expected: '1 < 100' },
        { string: '1 <= 100', expected: '1 <= 100' },
      ];
      tests.forEach(function (test) {
        expect(removeMd(test.string)).to.equal(test.expected);
      });
    });

    it('should strip unordered list leaders', function () {
      const string = 'Some text on a line\n\n* A list Item\n* Another list item';
      const expected = 'Some text on a line\n\nA list Item\nAnother list item';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip ordered list leaders', function () {
      const string = 'Some text on a line\n\n9. A list Item\n10. Another list item';
      const expected = 'Some text on a line\n\nA list Item\nAnother list item';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip list items with bold word in the beginning', function () {
      const string = 'Some text on a line\n\n- **A** list Item\n- **Another** list item';
      const expected = 'Some text on a line\n\nA list Item\nAnother list item';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should handle paragraphs with markdown', function () {
      const paragraph = '\n## This is a heading ##\n\nThis is a paragraph with [a link](http://www.disney.com/).\n\n### This is another heading\n\nIn `Getting Started` we set up `something` foo.\n\n  * Some list\n  * With items\n    * Even indented';
      const expected = '\nThis is a heading\n\nThis is a paragraph with a link.\n\nThis is another heading\n\nIn Getting Started we set up something foo.\n\n  Some list\n  With items\n    Even indented';
      expect(removeMd(paragraph)).to.equal(expected);
    });

    it('should remove links', function () {
      const string = 'This is a [link](http://www.disney.com/).';
      const expected = 'This is a link.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should remove links with square brackets', function () {
      const string = 'This is a [link [with brackets]](http://www.disney.com/).';
      const expected = 'This is a link [with brackets].';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should keep url instead of text when replaceLinksWithURL is enabled', function () {
      const string = 'This is a [link](http://www.disney.com/).';
      const expected = 'This is a http://www.disney.com/.';
      expect(removeMd(string, { replaceLinksWithURL: true })).to.equal(expected);
    });

    it('should not strip paragraphs without content', function() {
      const paragraph = '\n#This paragraph\n##This paragraph#';
      const expected = paragraph;
      expect(removeMd(paragraph)).to.equal(expected);
    });

    it('should not trigger ReDoS with atx-headers', function () {
      const start = Date.now();

      const paragraph = '\n## This is a long "'+' '.repeat(200)+'" heading ##\n';
      const expected = /\nThis is a long " {200}" heading\n/;
      expect(removeMd(paragraph)).to.match(expected);

      const duration = Date.now()-start;
      expect(duration).to.be.lt(1000);
    });

    it('should work fast even with lots of whitespace', function () {
      const string = 'Some text with lots of                                                                                                                                                                                                       whitespace';
      const expected = 'Some text with lots of                                                                                                                                                                                                       whitespace';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should still remove escaped markdown syntax', function () {
      const string = '\# Heading in _italic_';
      const expected = 'Heading in italic';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should skip specified HTML tags when htmlTagsToSkip option is provided', () => {
      const markdown =
        '<div>HTML content <sub>Superscript</sub> <span>span text</span></div>'
      const result = removeMd(markdown, {htmlTagsToSkip: ['sub']})
      expect(result).to.equal('HTML content <sub>Superscript</sub> span text')
      const result2 = removeMd(markdown, {htmlTagsToSkip: ['sub', 'span']})
      expect(result2).to.equal(
        'HTML content <sub>Superscript</sub> <span>span text</span>',
      )
    })

    it('should skip HTML tags with attributes when htmlTagsToSkip option is provided', () => {
      const markdown = '<code class="language-js">const x = 1</code>'
      const result = removeMd(markdown, {htmlTagsToSkip: ['code']})
      expect(result).to.equal(
        '<code class="language-js">const x = 1</code>',
      )
    })

    it('should not skip HTML tags whose name merely starts with a skipped tag name', () => {
      const markdown = '<codes>const x = 1</codes>'
      const result = removeMd(markdown, {htmlTagsToSkip: ['code']})
      expect(result).to.equal('const x = 1')
    })

    it('should replace inline link with text and link, with separator', function () {
      const string = 'some [inline link](http://www.disney.com/).';
      const expected = 'some inline link: http://www.disney.com/.';
      expect(removeMd(string, {separateLinksAndTexts: ': '})).to.equal(expected);
    });
  });
});
