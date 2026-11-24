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

    describe('angle brackets in prose and HTML', function () {
      // The third column gives the expected output when <sub> is kept.
      const cases = [
        ['5 < 10 and 10 > 5', '5 < 10 and 10 > 5'],
        ['low <= limit and high >= limit', 'low <= limit and high >= limit'],
        ['x\t<\ty and y > z', 'x\t<\ty and y > z'],
        ['x <\r\ny and y > z', 'x <\r\ny and y > z'],
        ['1 < 2 < 3 > 0', '1 < 2 < 3 > 0'],
        ['> 2 < 3 and **4** > 1', '2 < 3 and 4 > 1'],
        ['[2 < 3](url) and ![4 > 1](image)', '2 < 3 and 4 > 1'],
        ['2 < 3 <br/> 4 > 1 <sub>ok</sub>', '2 < 3  4 > 1 ok', '2 < 3  4 > 1 <sub>ok</sub>'],
        ['<div title="1 < 2">x < y</div>', 'x < y'],
        ['<sub title="1 < 2">x</sub>', 'x', '<sub title="1 < 2">x</sub>'],
        ['<x-note\nclass="a">ok</x-note><hr />', 'ok'],
        ['<!DOCTYPE html><!-- x < y --><?pi?><![CDATA[x < y]]>ok', 'ok'],
        ['Visit <https://example.com> or <1@example.com>.', 'Visit https://example.com or .'],
        ['x < y > z. Visit <https://example.com>. Try `<b>x</b>`.', 'x < y > z. Visit https://example.com. Try x.'],
        ['List<T> and <placeholder>', 'List and '],
        ['< a><\nfoo><>', ''],
        ['Keep < label > here', 'Keep < label > here'],
        ['5<10 and 10>5', '55'],
      ];

      for (const [input, expected, withSub = expected] of cases) {
        it(JSON.stringify(input), function () {
          expect(removeMd(input)).to.equal(expected);
          expect(removeMd(input, { htmlTagsToSkip: ['sub'] })).to.equal(withSub);
        });
      }
    });

    describe('angle-bracketed HTTP and HTTPS autolinks', function () {
      const url = 'https://example.com';
      const cases = [
        [`<${url}>`, url],
        [`Visit <${url}>.`, `Visit ${url}.`],
        [`(<${url}><${url}>), <HTTP://Example.COM:8080/a>!`, `(${url}${url}), HTTP://Example.COM:8080/a!`],
        ['<https://[::1]:8080/a_(b)?x=1&y=2#here>', 'https://[::1]:8080/a_(b)?x=1&y=2#here'],
        ['<https://h/~~x~~/*a*/_b_/`q`/[a](b)?q=$&>', 'https://h/~~x~~/*a*/_b_/`q`/[a](b)?q=$&'],
        [`**<${url}>** and [notes](dest) ![lake](img)`, `${url} and notes lake`],
        [`2 < 3 and 3 > 2. <div><sub><${url}></sub><br/><my-tag x="1"/></div>`, `2 < 3 and 3 > 2. ${url}`, `2 < 3 and 3 > 2. <sub>${url}</sub>`],
        [`<a href="${url}">label</a> <${url}>`, `label ${url}`],
        [`<sub title="${url}">label</sub> <${url}>`, `label ${url}`, `<sub title="${url}">label</sub> ${url}`],
        [`<p title="before > <https://inside>">ok</p> <${url}>`, ` ">ok ${url}`],
        [`<p title=<https://inside>>ok</p> <${url}>`, `ok ${url}`],
        [`<sub title='before > <https://inside>'>ok</sub> <${url}>`, ` '>ok ${url}`, `<sub title='before > '>ok</sub> ${url}`],
        [`<!-- before > <https://inside> -->outside <${url}>`, `  -->outside ${url}`],
        [`<![CDATA[a > <https://inside>]]><?pi > <https://inside>?> <${url}>`, ` ]]> ?> ${url}`],
        [`<${url}> <mailto:hi@example.com> <hi@example.com> <ftp://h> ${url}`, `${url}    ${url}`],
        [`<https://> <https://a b> <https://a\nb> <https://a\x01b> <${url}`, `    <${url}`],
        [`<<${url}>> tail`, 'tail'],
        [`\\<${url}> <${url}>`, `\\ ${url}`],
        [`\\\\<${url}>`, `\\\\${url}`],
        [`Try \`<${url}>\`. Visit <${url}>.`, `Try \`\`. Visit ${url}.`],
        [`\`line\n<https://inside>\`. Visit <${url}>.`, `\`line\n\`. Visit ${url}.`],
        [`\`<https://foo.bar.\`baz>\`\n`, '\`\`\n'],
        ['```txt\n<https://inside>\n```\nSee <https://outside>', '\nSee https://outside'],
        ['```code```\n\nVisit <https://example.com>.', 'code\n\nVisit https://example.com.'],
        ['```<https://inside>```\r\n\r\nSee <https://outside>', '\r\n\r\nSee https://outside'],
        ['````<https://inside>```` See <https://outside> and `other`.', ' See https://outside and other.'],
        ['   ```a ` b``` See <https://outside>', '   a ` b See https://outside'],
        ['```doc\n<https://inside>\nSee <https://other>', '`doc\n\nSee '],
        ['~~~lang`id\n<https://inside>\n~~~\nSee <https://outside>', '\nSee https://outside'],
        ['~~~\n<https://inside>\n~~~\nSee <https://outside>', '\nSee https://outside'],
        ['````md\n```\n<https://inside>\n```\n````\nSee <https://outside>', '\n\n`\nSee https://outside'],
        [`\uE000<b></b>0\uE001 <${url}/\uE000> \uE0001\uE001`, `\uE0000\uE001 ${url}/\uE000 \uE0001\uE001`],
      ];
      for (const [input, expected, withSub = expected] of cases) {
        it(JSON.stringify(input), function () {
          expect(removeMd(input)).to.equal(expected);
          expect(removeMd(input, { htmlTagsToSkip: ['sub'] })).to.equal(withSub);
        });
      }

      it('keeps autolinks literal while applying the configured link and image options', function () {
        const input = `[label](dest) <${url}/[a](b)> ![alt](image)`;
        expect(removeMd(input, { replaceLinksWithURL: true, useImgAltText: false })).to.equal(`dest ${url}/[a](b) `);
        expect(removeMd(input, { separateLinksAndTexts: ': ' })).to.equal(`label: dest ${url}/[a](b) !alt: image`);
      });

      it('distinguishes an autolink from an angle-delimited Markdown link destination', function () {
        const input = `[label](<${url}>) <${url}>\n\n[ref]: <${url}>`;
        expect(removeMd(input)).to.equal(`label ${url}`);
        expect(removeMd(input, { replaceLinksWithURL: true })).to.equal(` ${url}`);
        expect(removeMd(input, { separateLinksAndTexts: ': ' })).to.equal(`label:  ${url}`);
      });

      it('preserves literal marker characters supplied by list and link options', function () {
        const literal = '\uE0000\uE001';
        const input = `- [label](dest) <${url}>`;
        expect(removeMd(input, { listUnicodeChar: literal, separateLinksAndTexts: literal }))
          .to.equal(`${literal} label${literal}dest ${url}`);
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
