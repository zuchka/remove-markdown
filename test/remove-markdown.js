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

    describe('acceptance: links, brackets and code spans', function () {
      // Every case is checked for the default output ('text') and for replaceLinksWithURL ('url').
      // 'same' stands for a string that has to come back unchanged in both modes.
      function expectBoth(cases) {
        cases.forEach(function (test) {
          const text = test.same !== undefined ? test.same : test.text;
          const url = test.same !== undefined ? test.same : test.url;
          expect(removeMd(test.string), JSON.stringify(test.string)).to.equal(text);
          expect(removeMd(test.string, { replaceLinksWithURL: true }), JSON.stringify(test.string) + ' (url)').to.equal(url);
        });
      }

      it('should remove links', function () {
        expectBoth([
          { string: 'This is a [link](http://www.disney.com/).', text: 'This is a link.', url: 'This is a http://www.disney.com/.' },
          { string: 'a [text][ref] b', text: 'a text b', url: 'a ref b' },
        ]);
      });

      it('should remove links whose text has nested square brackets', function () {
        expectBoth([
          { string: 'This is a [link [with brackets]](http://www.disney.com/).', text: 'This is a link [with brackets].', url: 'This is a http://www.disney.com/.' },
          { string: '[link [foo [bar]]](/uri)', text: 'link [foo [bar]]', url: '/uri' },
          { string: '[a [b [c [d]]]](u)', text: 'a [b [c [d]]]', url: 'u' },
          { string: 'x [link [foo [bar]]](/uri) y [z](w)', text: 'x link [foo [bar]] y z', url: 'x /uri y w' },
          { string: '[x] and [link [nested]](u)', text: '[x] and link [nested]', url: '[x] and u' },
        ]);
      });

      it('should respect escaped square brackets in link text', function () {
        expectBoth([
          { string: '[link \\[bar](/uri)', text: 'link \\[bar', url: '/uri' },
          { string: '[a \\] b](/u)', text: 'a \\] b', url: '/u' },
          { string: '[a \\\\](u) z', text: 'a \\\\ z', url: 'u z' },
        ]);
      });

      it('should not count square brackets inside code spans, inside or outside link text', function () {
        expectBoth([
          { string: '[foo `]` bar](/uri)', text: 'foo ] bar', url: '/uri' },
          { string: '[foo `[` bar](/uri)', text: 'foo [ bar', url: '/uri' },
          { string: '[foo ``]`` bar](/uri)', text: 'foo `]` bar', url: '/uri' },
          { string: 'use `a[0]` and [link](u)', text: 'use a[0] and link', url: 'use a[0] and u' },
          { string: 'Use `[` and [link](u) after `code`.', text: 'Use [ and link after code.', url: 'Use [ and u after code.' },
          { string: 'Use `]` and [link](u).', text: 'Use ] and link.', url: 'Use ] and u.' },
          // Brackets in a code span are never a link.
          { string: '`[a](b)` and [c](d)', text: '[a](b) and c', url: '[a](b) and d' },
        ]);
      });

      it('should keep bracketed text that is not a link, and not let it swallow a later link', function () {
        expectBoth([
          { string: 'see [1] and [link](http://x.y) end', text: 'see [1] and link end', url: 'see [1] and http://x.y end' },
          { string: 'Press [Enter] then [docs](http://d.e)', text: 'Press [Enter] then docs', url: 'Press [Enter] then http://d.e' },
          { string: '[x]\n\nSome text\n\n[link](u)', text: '[x]\n\nSome text\n\nlink', url: '[x]\n\nSome text\n\nu' },
          {
            string: 'to the west.[15] Ashgabat is the capital.[16] See [docs](http://d.e).',
            text: 'to the west.[15] Ashgabat is the capital.[16] See docs.',
            url: 'to the west.[15] Ashgabat is the capital.[16] See http://d.e.',
          },
          { string: 'a [1] ![alt](http://i.png) b [text][ref]', text: 'a [1] alt b text', url: 'a [1] alt b ref' },
        ]);
      });

      it('should only treat a destination that follows the closing bracket immediately as a link', function () {
        expectBoth([
          { string: 'Smith et al. [12] (see appendix) and [Jones] (2020)', same: 'Smith et al. [12] (see appendix) and [Jones] (2020)' },
          { string: '[text] [ref]', same: '[text] [ref]' },
          { string: 'Smith [12](see appendix)', text: 'Smith 12', url: 'Smith see appendix' },
        ]);
      });

      describe('a backtick never closes a code span in another block', function () {
        // The first line holds a lone backtick inside the link text, the later block another one.
        const link = '[foo `bar](/uri)';

        it('should stop at blank lines (LF, CRLF and CR)', function () {
          expectBoth([
            { string: link + '\n\nText with `code`.', text: 'foo `bar\n\nText with code.', url: '/uri\n\nText with code.' },
            { string: link + '\n  \nText with `code`.', text: 'foo `bar\n  \nText with code.', url: '/uri\n  \nText with code.' },
            { string: link + '\r\n\r\nText with `code`.', text: 'foo `bar\r\n\r\nText with code.', url: '/uri\r\n\r\nText with code.' },
            { string: link + '\r\rText with `code`.', text: 'foo `bar\r\rText with code.', url: '/uri\r\rText with code.' },
          ]);
        });

        it('should stop at headings', function () {
          expectBoth([
            { string: link + '\n# Heading `code`', text: 'foo `bar\nHeading code', url: '/uri\nHeading code' },
            { string: link + '\r# Heading `code`', text: 'foo `bar\rHeading code', url: '/uri\rHeading code' },
            { string: link + '\r\n# Heading `code`', text: 'foo `bar\r\nHeading code', url: '/uri\r\nHeading code' },
          ]);
        });

        it('should stop at blockquotes', function () {
          expectBoth([
            { string: link + '\n> quote `code`', text: 'foo `bar\nquote code', url: '/uri\nquote code' },
            { string: link + '\r\n> quote `code`', text: 'foo `bar\r\nquote code', url: '/uri\r\nquote code' },
          ]);
        });

        it('should stop at list items', function () {
          expectBoth([
            { string: link + '\n- list `code`', text: 'foo `bar\nlist code', url: '/uri\nlist code' },
            { string: link + '\n* list `code`', text: 'foo `bar\nlist code', url: '/uri\nlist code' },
            { string: link + '\n1. list `code`', text: 'foo `bar\nlist code', url: '/uri\nlist code' },
            { string: link + '\r- list `code`', text: 'foo `bar\rlist code', url: '/uri\rlist code' },
            { string: '- [foo `bar](/uri)\n- item `code`', text: 'foo `bar\nitem code', url: '/uri\nitem code' },
            { string: 'Intro\n\n- one [a `b](u)\n- two `c`', text: 'Intro\n\none a `b\ntwo c', url: 'Intro\n\none u\ntwo c' },
          ]);
        });

        it('should stop at thematic breaks and after fenced code, which are removed before links', function () {
          expectBoth([
            { string: link + '\n---\nText `code`', text: 'foo `bar\nText code', url: '/uri\nText code' },
            { string: '```js\nx\n```\n' + link + '\n- list `code`', text: 'x\nfoo `bar\nlist code', url: 'x\n/uri\nlist code' },
          ]);
        });
      });

      describe('a code span can still continue within one paragraph', function () {
        it('should keep a code span that spans lines (LF, CRLF and CR)', function () {
          expectBoth([
            { string: '[foo `a\nb]` bar](/uri)', text: 'foo `a\nb]` bar', url: '/uri' },
            { string: '[foo `a\r\nb]` bar](/uri)', text: 'foo `a\r\nb]` bar', url: '/uri' },
            { string: '[foo `a\rb]` bar](/uri)', text: 'foo `a\rb]` bar', url: '/uri' },
          ]);
        });

        // A lazy continuation line and the lines of one quoted paragraph belong to the same
        // paragraph, as in CommonMark, so a backtick can still pair across them.
        it('should treat the lines of one paragraph as one block, quoted or not', function () {
          expectBoth([
            { string: '[foo `bar](/uri)\ntext `code`', same: '[foo `bar](/uri)\ntext code' },
            { string: '> [foo `bar](/uri)\n> text `code`', same: '[foo `bar](/uri)\ntext code' },
          ]);
        });
      });
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
