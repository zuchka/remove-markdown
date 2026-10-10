// Each adapter loads only its own pipeline. No competitor is imported into
// another competitor's measured worker.
export const adapters = [
  { id: 'remove-markdown', label: 'remove-markdown', packages: [], profile: 'Library defaults' },
  { id: 'strip-markdown', label: 'remark + strip-markdown', packages: ['remark', 'remark-gfm', 'strip-markdown'], profile: 'remark + GFM + strip defaults; Markdown serializer included' },
  { id: 'markdown-to-txt', label: 'markdown-to-txt', packages: ['markdown-to-txt', 'lodash'], profile: 'Library defaults; nested Marked retained. Explicit lodash supplies an undeclared runtime dependency.' },
  { id: 'markdown-to-text', label: 'markdown-to-text', packages: ['markdown-to-text'], profile: 'Library defaults' },
  { id: 'marked-html', label: 'marked + html-to-text', packages: ['marked', 'html-to-text'], profile: 'GFM; HTML-to-text configured for labels, alt text, and unmarked lists' },
  { id: 'markdown-it-html', label: 'markdown-it + html-to-text', packages: ['markdown-it', 'html-to-text'], profile: 'HTML enabled; HTML-to-text configured for labels, alt text, and unmarked lists' },
];

export const htmlOptions = {
  wordwrap: false,
  limits: { maxInputLength: 16 * 1024 * 1024 },
  selectors: [
    ...[1, 2, 3, 4, 5, 6].map((level) => ({ selector: `h${level}`, options: { uppercase: false } })),
    { selector: 'a', options: { ignoreHref: true } },
    { selector: 'img', format: 'imageAlt' },
    ...['ul', 'ol', 'li', 'blockquote'].map((selector) => ({ selector, format: 'block' })),
  ],
};

export function imageAlt(element, _walk, builder) {
  builder.addInline(element.attribs.alt || '');
}

export async function createAdapter(id) {
  switch (id) {
    case 'remove-markdown': {
      const { default: removeMd } = await import('../index.node.mjs');
      return (input, options) => removeMd(input, options ? structuredClone(options) : undefined);
    }
    case 'strip-markdown': {
      const [{ remark }, { default: strip }, { default: gfm }] = await Promise.all([import('remark'), import('strip-markdown'), import('remark-gfm')]);
      const processor = remark().use(gfm).use(strip).freeze();
      return (input) => String(processor.processSync(input));
    }
    case 'markdown-to-txt': {
      const module = await import('markdown-to-txt');
      const fn = module.markdownToTxt || module.default?.markdownToTxt || module.default;
      return (input) => fn(input);
    }
    case 'markdown-to-text': {
      const module = await import('markdown-to-text');
      const fn = module.default?.default || module.default;
      return (input) => fn(input);
    }
    case 'marked-html': {
      const [{ Marked }, { compile }] = await Promise.all([import('marked'), import('html-to-text')]);
      const parser = new Marked({ gfm: true, async: false });
      const toText = compile({ ...htmlOptions, formatters: { imageAlt } });
      return (input) => toText(parser.parse(input));
    }
    case 'markdown-it-html': {
      const [{ default: MarkdownIt }, { compile }] = await Promise.all([import('markdown-it'), import('html-to-text')]);
      const parser = new MarkdownIt({ html: true });
      const toText = compile({ ...htmlOptions, formatters: { imageAlt } });
      return (input) => toText(parser.render(input));
    }
    default: throw new Error(`Unknown adapter: ${id}`);
  }
}
