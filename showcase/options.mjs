export const defaults = Object.freeze({
  stripListLeaders: true, listUnicodeChar: '', gfm: true, useImgAltText: true,
  abbr: false, replaceLinksWithURL: false, separateLinksAndTexts: '',
  htmlTagsToSkip: Object.freeze([]), stripMdxImports: false, throwError: false,
});

export function changedOptions(options) {
  return Object.fromEntries(Object.entries(defaults)
    .filter(([key, value]) => JSON.stringify(options[key]) !== JSON.stringify(value))
    .map(([key]) => [key, options[key]]));
}

export function parseTags(value) {
  const tags = [...new Set(value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  if (tags.some((tag) => !/^[a-z][a-z0-9-]*$/.test(tag))) {
    throw new Error('Use comma-separated tag names, such as strong, em.');
  }
  return tags;
}

export function usageSnippet(input, options) {
  const changed = changedOptions(options);
  const args = Object.keys(changed).length ? `, ${JSON.stringify(changed, null, 2)}` : '';
  return `import removeMd from 'remove-markdown';\n\nconst markdown = ${JSON.stringify(input)};\n\nconst text = removeMd(markdown${args});`;
}
