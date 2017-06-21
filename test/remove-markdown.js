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

    it('should leave non-matching markdown markdown, but strip empty anchors', function () {
      const string = '*Javascript* [developers]()* are the _best_.';
      const expected = 'Javascript developers* are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip anchors', function () {
      const string = '*Javascript* [developers](https://engineering.condenast.io/)* are the _best_.';
      const expected = 'Javascript developers* are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip img tags', function () {
      const string = '![bear](https://placebear.com/640/480)*Javascript* developers are the _best_.';
      const expected = 'Javascript developers are the best.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should strip code tags', function () {
      const string = 'In `Getting Started` we set up `something` foo.';
      const expected = 'In Getting Started we set up something foo.';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should leave hashtags in headings', function () {
      const string = '## This #heading contains #hashtags';
      const expected = 'This #heading contains #hashtags';
      expect(removeMd(string)).to.equal(expected);
    });

    it('should handle paragrahs with markdown', function () {
      const paragraph = '\n## This is a heading ##\n\nThis is a paragraph with [a link](http://www.disney.com/).\n\n### This is another heading\n\nIn `Getting Started` we set up `something` foo.\n\n  * Some list\n  * With items\n    * Even indented';
      const expected = '\nThis is a heading\n\nThis is a paragraph with a link.\n\nThis is another heading\n\nIn Getting Started we set up something foo.\n\n  Some list\n  With items\n    Even indented';
      expect(removeMd(paragraph)).to.equal(expected);
    });
  });
});
