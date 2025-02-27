[![npm version](https://img.shields.io/npm/v/remove-markdown.svg)](https://www.npmjs.com/package/remove-markdown)
[![npm downloads](https://img.shields.io/npm/dm/remove-markdown.svg)](https://npm-compare.com/remove-markdown/#timeRange=THREE_YEARS)
[![GitHub Actions Build Status](https://github.com/zuchka/remove-markdown/actions/workflows/default.yaml/badge.svg)](https://github.com/zuchka/remove-markdown/actions/workflows/default.yaml)

## What is it?
**remove-markdown** is a node.js module that will remove (strip) Markdown formatting from text.
*Markdown formatting* means pretty much anything that doesn’t look like regular text, like square brackets, asterisks etc.

## When do I need it?
The typical use case is to display an excerpt from some Markdown text, without any of the actual Markdown syntax - for example in a list of posts.

## Installation

```
npm install remove-markdown
```

## Usage
```js
const removeMd = require('remove-markdown');
const markdown = '# This is a heading\n\nThis is a paragraph with [a link](http://www.disney.com/) in it.';
const plainText = removeMd(markdown); // plainText is now 'This is a heading\n\nThis is a paragraph with a link in it.'
```

You can also supply an options object to the function. Currently, the following options are supported:

```js
const plainText = removeMd(markdown, {
  stripListLeaders: true , // strip list leaders (default: true)
  listUnicodeChar: '',     // char to insert instead of stripped list leaders (default: '')
  gfm: true                // support GitHub-Flavored Markdown (default: true)
  useImgAltText: true      // replace images with alt-text, if present (default: true)
});
```

Setting `stripListLeaders` to false will retain any list characters (`*, -, +, (digit).`).

## TODO
PRs are very much welcome. Here are some ideas for future enhancements:

* Allow the RegEx expressions to be customized per rule
* Make the rules more robust, support more edge cases
* Add more (comprehensive) tests

## Credits
The code is based on [Markdown Service Tools - Strip Markdown](http://brettterpstra.com/2013/10/18/a-markdown-service-to-strip-markdown/) by Brett Terpstra.

## Authors
Stian Grytøyr (original creator)
[zuchka](https://github.com/zuchka) (maintainer since 2023)
