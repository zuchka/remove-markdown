'use strict';

var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    stripMd = require('../'),
    markdown = fs.readFileSync(path.resolve(__dirname, 'markdown.md')).toString(),
    result = fs.readFileSync(path.resolve(__dirname, 'result.txt')).toString();

describe('strip-markdown', function () {
  it('should strip markdown', function () {
    stripMd(markdown).should.eql(result);
  });
});