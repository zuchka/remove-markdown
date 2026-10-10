// Original examples authored for this project; MIT, like the parent repository.
// Expected text describes the policy, never the result of a particular library.
export const corpusVersion = 1;

export const examples = [
  {
    id: 'everyday', label: 'Everyday Markdown', category: 'Basics',
    description: 'A little of everything: headings, emphasis, links, lists, and code.',
    input: '# A quieter kind of writing\n\nKeep the **important words**, lose the _extra syntax_.\n\nRead [the field notes](https://example.com/notes), then make something.\n\n- Start with an idea\n- Leave room to explore\n- Keep it simple\n\n> Good tools get out of the way.\n\nTry `removeMd(markdown)`.',
    options: { separateLinksAndTexts: ' → ' },
  },
  {
    id: 'links', label: 'Links & URLs', category: 'Links',
    description: 'Keep the label, the destination, or both. A separator takes precedence over URL-only mode.',
    input: 'Meet me at [the library](https://example.com/library).\n\nBring [your reading list](https://example.com/books).',
    options: { separateLinksAndTexts: ' → ' },
  },
  {
    id: 'lists', label: 'Lists', category: 'Lists',
    description: 'Remove, preserve, or replace markers. In v0.8.0, a blank line before a list can move its first replacement bullet onto a separate line.',
    input: '# A small checklist\n\n- A notebook\n- A good pen\n- An open afternoon\n\n1. Find a quiet place\n2. Write something down',
    options: { listUnicodeChar: '•' },
  },
  {
    id: 'images', label: 'Image descriptions', category: 'Images',
    description: 'Image alt text can become part of your excerpt, or the image can disappear entirely.',
    input: 'A view worth the walk.\n\n![Pine trees reflected in a still lake](lake.jpg)\n\nBack before sunset.',
    options: { useImgAltText: false },
  },
  {
    id: 'code', label: 'Code & GFM', category: 'Syntax',
    description: 'Explore fences and headings. The GFM option is a set of transformations, not a full GFM parser.',
    input: 'Field notes\n==========\n\n~~An old idea~~ A better one.\n\n```js\nconst message = "Hello, world";\nconsole.log(message);\n```',
    options: { gfm: false },
  },
  {
    id: 'html', label: 'HTML tags', category: 'HTML',
    description: 'Selected tags can survive conversion. They are shown as literal text here.',
    input: '<p>A <strong>small detail</strong> makes a difference.</p>\n\n<span>Keep the words.</span>',
    options: { htmlTagsToSkip: ['strong'] },
  },
  {
    id: 'abbr', label: 'Abbreviations', category: 'Syntax',
    description: 'Remove abbreviation definitions while leaving their uses in the text.',
    input: '*[HTML]: HyperText Markup Language\n\nHTML is a language for the web.',
    options: { abbr: true },
  },
  {
    id: 'mdx', label: 'MDX imports', category: 'MDX',
    description: 'Remove supported imports at the beginning of a document. This does not evaluate MDX.',
    input: 'import { Note } from "./components";\nimport "./styles.css";\n\n# Notes from the studio\n\nA **fresh start**, with room to grow.',
    options: { stripMdxImports: true },
  },
];

export const cases = [
  { id: 'plain', category: 'Text', input: 'Keep the words.', expected: 'Keep the words.' },
  { id: 'heading', category: 'Headings', input: '# Field notes', expected: 'Field notes' },
  { id: 'heading-inline-hash', category: 'Headings', input: '## A #small detail', expected: 'A #small detail' },
  { id: 'setext', category: 'Headings', input: 'Field notes\n==========', expected: 'Field notes' },
  { id: 'emphasis', category: 'Emphasis', input: 'Keep **bold**, *italic*, and _quiet_ words.', expected: 'Keep bold, italic, and quiet words.' },
  { id: 'nested-emphasis', category: 'Emphasis', input: 'A **very _small_ detail**.', expected: 'A very small detail.' },
  { id: 'literal-underscore', category: 'Text', input: 'Use snake_case for this_name.', expected: 'Use snake_case for this_name.' },
  { id: 'literal-comparison', category: 'Text', input: '1 < 2 and 3 > 2', expected: '1 < 2 and 3 > 2' },
  { id: 'escape', category: 'Escapes', input: 'A \\*literal\\* star.', expected: 'A *literal* star.' },
  { id: 'unicode', category: 'Text', input: '**你好** — café 🌿', expected: '你好 — café 🌿' },
  { id: 'link', category: 'Links', input: 'Read [the notes](https://example.com).', expected: 'Read the notes.' },
  { id: 'link-title', category: 'Links', input: '[Notes](https://example.com "A title")', expected: 'Notes' },
  { id: 'link-parentheses', category: 'Links', input: '[Notes](https://example.com/a_(b))', expected: 'Notes' },
  { id: 'reference', category: 'Links', input: 'Read [the notes][notes].\n\n[notes]: https://example.com', expected: 'Read the notes.' },
  { id: 'autolink', category: 'Links', input: 'Visit <https://example.com>.', expected: 'Visit https://example.com.' },
  { id: 'image-alt', category: 'Images', input: '![A still lake](lake.jpg)', expected: 'A still lake' },
  { id: 'image-empty', category: 'Images', input: 'Before ![](lake.jpg) after.', expected: 'Before  after.' },
  { id: 'unordered-list', category: 'Lists', input: '- One\n- Two', expected: 'One\nTwo' },
  { id: 'ordered-list', category: 'Lists', input: '1. One\n2. Two', expected: 'One\nTwo' },
  { id: 'quote', category: 'Quotes', input: '> Keep it simple.', expected: 'Keep it simple.' },
  { id: 'inline-code', category: 'Code', input: 'Try `hello()`.', expected: 'Try hello().' },
  { id: 'code-literal', category: 'Code', input: 'Keep `*literal*` code.', expected: 'Keep *literal* code.' },
  { id: 'code-fence', category: 'Code', input: '```js\nconst n = 1;\n```', expected: 'const n = 1;' },
  { id: 'code-html', category: 'Code', input: '```html\n<b>literal</b>\n```', expected: '<b>literal</b>' },
  { id: 'html', category: 'HTML', input: '<p>A <strong>small</strong> detail.</p>', expected: 'A small detail.' },
  { id: 'entities', category: 'HTML', input: 'Tea &amp; biscuits.', expected: 'Tea & biscuits.' },
  { id: 'strike', category: 'GFM', input: 'An ~~old~~ idea.', expected: 'An old idea.' },
  { id: 'task-list', category: 'GFM', input: '- [x] One\n- [ ] Two', expected: 'One\nTwo' },
  { id: 'table', category: 'GFM', input: '| Name | Value |\n| --- | --- |\n| A | B |', expected: 'Name Value\nA B' },
  { id: 'unclosed', category: 'Malformed', input: 'An unfinished [thought', expected: 'An unfinished [thought' },
  { id: 'empty', category: 'Text', input: '', expected: '' },
  { id: 'option-bullet', category: 'Options', input: '- One\n- Two', expected: '• One\n• Two', options: { listUnicodeChar: '•' } },
  { id: 'option-list-preserve', category: 'Options', input: '- One\n- Two', expected: '- One\n- Two', options: { stripListLeaders: false } },
  { id: 'option-url', category: 'Options', input: '[Notes](https://example.com)', expected: 'https://example.com', options: { replaceLinksWithURL: true } },
  { id: 'option-both', category: 'Options', input: '[Notes](https://example.com)', expected: 'Notes: https://example.com', options: { replaceLinksWithURL: true, separateLinksAndTexts: ': ' } },
  { id: 'option-image', category: 'Options', input: '![Lake](lake.jpg)', expected: '', options: { useImgAltText: false } },
  { id: 'option-image-separator', category: 'Options', input: '![Lake](lake.jpg)', expected: 'Lake', options: { separateLinksAndTexts: ': ' } },
  { id: 'option-html', category: 'Options', input: '<p>A <b>detail</b>.</p>', expected: 'A <b>detail</b>.', options: { htmlTagsToSkip: ['b'] } },
  { id: 'option-abbr', category: 'Options', input: '*[HTML]: HyperText Markup Language\n\nHTML is useful.', expected: 'HTML is useful.', options: { abbr: true } },
  { id: 'option-mdx', category: 'Options', input: 'import Note from "./note";\n\n# Hello', expected: 'Hello', options: { stripMdxImports: true } },
];

export const timingDocument = {
  input: '# Field notes\n\nKeep the **important words** and _quiet details_. Read [the notes](https://example.com). Try `hello()` before you go.\n\n- Find a quiet place\n- Make something useful\n\n> Leave room to explore.',
  expected: 'Field notes\n\nKeep the important words and quiet details. Read the notes. Try hello() before you go.\n\nFind a quiet place\nMake something useful\n\nLeave room to explore.',
};

export const normalizeContent = (text) => text.replace(/\s+/gu, ' ').trim();
export const exactText = (text) => text.replace(/\r\n/g, '\n');
