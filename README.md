## What is it?
**strip-markdown** is a node module that will strip Markdown stuff from a text. By "Markdown stuff" I mean anything that doesn’t look like regular text, like square brackets, stars etc.

## Why?
The typical use case is to display an excerpt of a Markdown text, without the actual Markdown (or rendered HTML, for that matter), for example in a list of posts.

## Installation

```
npm install strip-markdown
```

## Usage
```js
var stripMd = require('strip-markdown');
var markdown = '# This is a heading\n\nThis is a paragraph with [a link](http://www.disney.com/) in it.';
var plainText = stripMd(markdown); // plainText is now 'This is a heading\n\nThis is a paragraph with a link in it.'
```

You can also supply an options object to the strip function. Currently, the only option you can set is whether to strip list leaders:

```js
var plainText = stripMd(markdown, {stripListLeaders: false}); // The default is true
```

This will retain any list characters (`*, -, +, (digit).`).

## Credits
The code is based on [Markdown Service Tools - Strip Markdown](http://brettterpstra.com/2013/10/18/a-markdown-service-to-strip-markdown/) by Brett Terpstra.

## Author
Stian Grytøyr
