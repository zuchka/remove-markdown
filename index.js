const linkTokens = /\\[\s\S]|`+|[\[\]]/g;
const linkDestination = /[\(\[](.*?)[\)\]]/y;

// Replaces inline links ("[text](url)" and "[text][ref]") with their text, or with the
// destination. Square brackets are matched like a stack in one left-to-right pass: link text may
// contain any depth of balanced brackets, and bracketed text that is not followed directly by
// "(" or "[" (a footnote marker, "[Enter]") never swallows the text before a later link. A
// backslash escapes the next character, and a code span can hold brackets. A code span is found
// before its brackets are counted, but only when it closes in the same block (a blank line or an
// ATX heading ends a block), so a lone backtick cannot reach into a later paragraph.
function removeInlineLinks(text, replaceWithUrl) {
  const parts = [];
  const openBrackets = [];
  let backtickRuns = null;
  let blockEnds = null;
  let blockEndIndex = 0;
  // Index of the closing run of a code span opened by `length` backticks that end at `position`.
  const closingBacktickRun = function(position, length) {
    if (!backtickRuns) {
      backtickRuns = {};
      const runs = /`+/g;
      let run;
      while ((run = runs.exec(text))) {
        const entry = backtickRuns[run[0].length] || (backtickRuns[run[0].length] = { starts: [], next: 0 });
        entry.starts.push(run.index);
      }
      // Block ends: the start of a blank line, and the start and the end of an ATX heading line.
      blockEnds = [];
      let lineStart = 0;
      text.split('\n').forEach(function(line) {
        if (/^[ \t\r]*$/.test(line)) blockEnds.push(lineStart);
        else if (/^ {0,3}#{1,6}(?:[ \t]|\r?$)/.test(line)) blockEnds.push(lineStart, lineStart + line.length);
        lineStart += line.length + 1;
      });
    }
    while (blockEndIndex < blockEnds.length && blockEnds[blockEndIndex] < position) blockEndIndex++;
    const blockEnd = blockEndIndex < blockEnds.length ? blockEnds[blockEndIndex] : text.length;
    const entry = backtickRuns[length];
    if (!entry) return -1;
    // Positions only increase, so each run is passed at most once.
    while (entry.next < entry.starts.length && entry.starts[entry.next] < position) entry.next++;
    const closing = entry.next < entry.starts.length ? entry.starts[entry.next] : -1;
    return closing !== -1 && closing + length <= blockEnd ? closing : -1;
  };

  let copied = 0;
  let token;
  linkTokens.lastIndex = 0;
  while ((token = linkTokens.exec(text))) {
    const start = token.index;
    const end = start + token[0].length;
    const mark = token[0].charAt(0);
    if (mark === '`') {
      // The brackets inside a code span must not count, wherever the span is.
      const closing = closingBacktickRun(end, token[0].length);
      if (closing !== -1) linkTokens.lastIndex = closing + token[0].length;
    } else if (mark === '[') {
      parts.push(text.slice(copied, start), '[');
      openBrackets.push(parts.length - 1);
      copied = end;
    } else if (mark === ']') {
      parts.push(text.slice(copied, start));
      copied = end;
      linkDestination.lastIndex = end;
      const destination = openBrackets.length > 0 ? linkDestination.exec(text) : null;
      const opening = openBrackets.pop();
      if (destination) {
        if (replaceWithUrl) {
          parts.length = opening;
          parts.push(destination[1]);
        } else {
          parts[opening] = '';
        }
        copied = linkDestination.lastIndex;
        linkTokens.lastIndex = copied;
      } else {
        parts.push(']');
      }
    }
  }
  parts.push(text.slice(copied));
  return parts.join('');
}

module.exports = function(md, options) {
  options = options || {};
  options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
  options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
  options.stripMdxImports = options.hasOwnProperty('stripMdxImports') ? options.stripMdxImports : false;
  options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
  options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;
  options.abbr = options.hasOwnProperty('abbr') ? options.abbr : false;
  options.replaceLinksWithURL = options.hasOwnProperty('replaceLinksWithURL') ? options.replaceLinksWithURL : false;
  options.separateLinksAndTexts = options.hasOwnProperty('separateLinksAndTexts') ? options.separateLinksAndTexts : null;
  options.htmlTagsToSkip = options.hasOwnProperty('htmlTagsToSkip') ? options.htmlTagsToSkip : [];
  options.throwError = options.hasOwnProperty('throwError') ? options.throwError : false;

  var output = md || '';

  if (options.stripMdxImports) {
    // Inspect the original structure before list markers, rules or fences are removed.
    // This intentionally supports only a leading block of imports, not all MDX ESM.
    const identifier = '[A-Za-z_$][\\w$]*';
    const specifier = `${identifier}(?:\\s+as\\s+${identifier})?\\s*`;
    const namedImports = `\\{\\s*(?:${specifier}(?:,\\s*${specifier})*(?:,\\s*)?)?\\}`;
    const namespaceImport = `\\*\\s+as\\s+${identifier}`;
    const bindings = `(?:${identifier}(?:\\s*,\\s*(?:${namedImports}|${namespaceImport}))?|${namedImports}|${namespaceImport})`;
    const modulePath = String.raw`(?:"(?:\\[^\r\n]|[^"\\\r\n])*"|'(?:\\[^\r\n]|[^'\\\r\n])*')`;
    const blankLines = '(?:[\\t ]*\\r?\\n)*';
    const importRegex = new RegExp(
      `^${blankLines}import[\\t ]+(?:${bindings}\\s+from\\s+)?${modulePath}` +
      `[\\t ]*(?:;[\\t ]*)?(?:\\r?\\n|$)${blankLines}`
    );

    let match;
    while ((match = output.match(importRegex))) {
      output = output.substring(match[0].length);
    }
  }

  // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
  output = output.replace(/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm, '');

  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar)
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
      else
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
    }
    if (options.gfm) {
      output = output
      // Header
        .replace(/\n={2,}/g, '\n')
        // Fenced codeblocks
        .replace(/~{3}.*\n/g, '')
        // Strikethrough
        .replace(/~~/g, '')
        // Fenced codeblocks with backticks
        .replace(/```(?:.*)\n([\s\S]*?)```/g, (_, code) => code.trim());
    }
    if (options.abbr) {
      // Remove abbreviations
      output = output.replace(/\*\[.*\]:.*\n/, '');
    }

    let htmlReplaceRegex = /<[^>]*>/g
    if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
      // Create a regex that matches tags not in htmlTagsToSkip
      const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join('|')
      htmlReplaceRegex = new RegExp(
        `<(?!\/?(${joinedHtmlTagsToSkip})(?=>|\\s[^>]*>))[^>]*>`,
        'g',
      )
    }

    if (options.separateLinksAndTexts) {
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1' + options.separateLinksAndTexts + '$2');
    }

    output = output
      // Remove HTML tags
      .replace(htmlReplaceRegex, '')
      // Remove setext-style headers
      .replace(/^[=\-]{2,}\s*$/g, '')
      // Remove footnotes?
      .replace(/\[\^.+?\](\: .*?$)?/g, '')
      .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
      // Remove images
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '');

    // Remove inline links
    output = removeInlineLinks(output, options.replaceLinksWithURL);

    output = output
      // Remove blockquotes
      .replace(/^(\n)?\s{0,3}>\s?/gm, '$1')
      // .replace(/(^|\n)\s{0,3}>\s?/g, '\n\n')
      // Remove reference-style links?
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
      // Remove atx-style headers
      .replace(/^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm, '$1$3$4$6')
      // Remove * emphasis
      .replace(/([\*]+)(\S)(.*?\S)??\1/g, '$2$3')
      // Remove _ emphasis. Unlike *, _ emphasis gets rendered only if
      //   1. Either there is a whitespace character before opening _ and after closing _.
      //   2. Or _ is at the start/end of the string.
      .replace(/(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, '$1$3$4$5')
      // Remove single-line code blocks (already handled multiline above in gfm section)
      .replace(/(`{3,})(.*?)\1/gm, '$2')
      // Remove inline code
      .replace(/`(.+?)`/g, '$1')
      // // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
      // .replace(/\n{2,}/g, '\n\n')
      // // Remove newlines in a paragraph
      // .replace(/(\S+)\n\s*(\S+)/g, '$1 $2')
      // Replace strike through
      .replace(/~(.*?)~/g, '$1');
  } catch(e) {
    if (options.throwError) throw e;

    console.error("remove-markdown encountered error: %s", e);
    return md;
  }
  return output;
};
