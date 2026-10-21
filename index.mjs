// Generated from index.js by scripts/build-esm.mjs. Do not edit directly.

const linkTokens = /\\[\s\S]|`+|[\[\]]/g;
const linkDestination = /[\(\[](.*?)[\)\]]/y;

// Replaces inline links ("[text](url)" and "[text][ref]") with their text, or with the
// destination. Square brackets are matched like a stack in one left-to-right pass: link text may
// contain any depth of balanced brackets, and bracketed text that is not followed directly by
// "(" or "[" (a footnote marker, "[Enter]") never swallows the text before a later link. A
// backslash escapes the next character, and a code span can hold brackets. A code span is found
// before its brackets are counted, but only when it closes in the same block, so a lone backtick
// cannot reach into a later paragraph, quote, list item or heading. 'blockEnds' holds the offsets
// where blocks end, as returned by blockBoundaries() and moved along by replaceTracked().
// Where blocks end, as offsets into the original text, so that a code span cannot reach across
// them: at a blank line, around an ATX heading or a thematic break, at the start of a blockquote
// and at the start of every list item. Lines end with LF, CRLF or CR. The offsets are found before
// the list markers, rules and fences are removed (see replaceTracked), because those are gone by
// the time links are. Known limits: a line that continues a quote or list item without its marker
// (a lazy continuation) stays in that block, the paragraphs inside a list item are not told apart,
// and nested structures such as a list inside a quote are only recognised by their first marker.
function blockBoundaries(text) {
  const ends = [];
  const terminator = /\r\n|\r|\n/g;
  let start = 0;
  let afterQuote = false;
  for (;;) {
    const found = terminator.exec(text);
    const lineEnd = found ? found.index : text.length;
    const line = text.slice(start, lineEnd);
    const quote = /^ {0,3}>/.test(line);
    if (/^[ \t]*$/.test(line)) {
      ends.push(start);
    } else if (/^ {0,3}#{1,6}(?:[ \t]|$)/.test(line) || /^ {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/.test(line)) {
      ends.push(start, lineEnd);
    } else if (quote ? !afterQuote : /^[ \t]*(?:[*+-]|\d+\.)[ \t]+\S/.test(line)) {
      ends.push(start);
    }
    afterQuote = quote;
    if (!found) return ends;
    start = found.index + found[0].length;
  }
}

// Like text.replace(regex, replacement), but also moves the offsets in 'offsets' to where they fall
// in the new text. An offset strictly inside a replaced span is dropped: what stood there is gone,
// or is code inside a fence, and is no longer markdown structure.
// 'replacement' is a string with $1..$9 or a function, as for String.prototype.replace.
function replaceTracked(text, regex, replacement, offsets) {
  const spans = [];
  const output = text.replace(regex, function() {
    const groups = arguments;
    const match = groups[0];
    const offset = groups[groups.length - 2];
    const replaced = typeof replacement === 'function'
      ? replacement.apply(null, groups)
      : replacement.replace(/\$([1-9])/g, function(_, number) { return groups[number] || ''; });
    spans.push([offset, offset + match.length, replaced.length]);
    return replaced;
  });
  const moved = [];
  let shift = 0;
  let span = 0;
  offsets.forEach(function(offset) {
    while (span < spans.length && spans[span][1] <= offset) {
      shift += spans[span][2] - (spans[span][1] - spans[span][0]);
      span++;
    }
    if (span === spans.length || spans[span][0] >= offset) moved.push(offset + shift);
  });
  offsets.length = 0;
  Array.prototype.push.apply(offsets, moved);
  return output;
}

function removeInlineLinks(text, replaceWithUrl, blockEnds) {
  const parts = [];
  const openBrackets = [];
  let backtickRuns = null;
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

export default function removeMarkdown(md, options) {
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

  // The block boundaries are read from the text as it is now, and every replacement up to the link
  // step goes through replace(), which keeps them in place.
  const blockEnds = blockBoundaries(output);
  const replace = function(regex, replacement) {
    output = replaceTracked(output, regex, replacement, blockEnds);
  };

  // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
  replace(/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm, '');

  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar)
        replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
      else
        replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
    }
    if (options.gfm) {
      // Header
      replace(/\n={2,}/g, '\n');
      // Fenced codeblocks
      replace(/~{3}.*\n/g, '');
      // Strikethrough
      replace(/~~/g, '');
      // Fenced codeblocks with backticks
      replace(/```(?:.*)\n([\s\S]*?)```/g, (_, code) => code.trim());
    }
    if (options.abbr) {
      // Remove abbreviations
      replace(/\*\[.*\]:.*\n/, '');
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
      replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1' + options.separateLinksAndTexts + '$2');
    }

    // Remove HTML tags
    replace(htmlReplaceRegex, '');
    // Remove setext-style headers
    replace(/^[=\-]{2,}\s*$/g, '');
    // Remove footnotes?
    replace(/\[\^.+?\](\: .*?$)?/g, '');
    replace(/\s{0,2}\[.*?\]: .*?$/g, '');
    // Remove images
    replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '');

    // Remove inline links
    output = removeInlineLinks(output, options.replaceLinksWithURL, blockEnds);

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
