// Generated from index.js by scripts/build-esm.mjs. Do not edit directly.

export default function removeMarkdown(md, options) {
  options = options || {};
  options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
  options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
  options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
  options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;
  options.abbr = options.hasOwnProperty('abbr') ? options.abbr : false;
  options.replaceLinksWithURL = options.hasOwnProperty('replaceLinksWithURL') ? options.replaceLinksWithURL : false;
  options.separateLinksAndTexts = options.hasOwnProperty('separateLinksAndTexts') ? options.separateLinksAndTexts : null;
  options.htmlTagsToSkip = options.hasOwnProperty('htmlTagsToSkip') ? options.htmlTagsToSkip : [];
  options.throwError = options.hasOwnProperty('throwError') ? options.throwError : false;

  var output = md || '';

  // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
  output = output.replace(/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm, '');

  try {
    if (options.stripListLeaders &&
        (output.includes('*') || output.includes('-') || output.includes('+') || output.includes('.'))) {
      if (options.listUnicodeChar)
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
      else
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
    }
    if (options.gfm) {
      output = output
      // Header
        .replace(/\n={2,}/g, '\n');
      output = replaceBeforeFinalNewline(output, /~{3}.*\n/g, '');
      output = output
        // Strikethrough
        .replace(/~~/g, '');
      if (output.includes('\n') && output.indexOf('```', output.indexOf('\n') + 1) !== -1) {
        output = output.replace(/```(?:.*)\n([\s\S]*?)```/g, (_, code) => code.trim());
      }
    }
    if (options.abbr && output.includes(']:') && output.includes('\n')) {
      // Remove abbreviations
      output = removeFirstAbbreviation(output);
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

    if (options.separateLinksAndTexts && hasCandidateSeparatedLink(output)) {
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1' + options.separateLinksAndTexts + '$2');
    }

    output = stripHtmlTags(output, htmlReplaceRegex, !options.htmlTagsToSkip || options.htmlTagsToSkip.length === 0)
      .replace(/^[=\-]{2,}\s*$/g, '');
    if (output.includes('[^') && output.includes(']')) {
      output = replaceOnCandidateLines(output, /\[\^.+?\](\: .*?$)?/g, '', hasCandidateFootnote);
    }
    if (output.includes(']: ')) {
      output = replaceFinalReferenceDefinition(output);
    }
    if (output.includes('![') && output.includes(']')) {
      output = replaceOnCandidateLines(output, /\!\[(.*?)\][\[\(].*?[\]\)]/g,
        options.useImgAltText ? '$1' : '', hasCandidateImage);
    }
    if (hasInlineLinkSeparator(output)) {
      output = output.replace(/\[([\s\S]*?)\]\s*[\(\[](.*?)[\)\]]/g, options.replaceLinksWithURL ? '$2' : '$1');
    }
    output = output
      .replace(/^(\n)?\s{0,3}>\s?/gm, '$1')
      // .replace(/(^|\n)\s{0,3}>\s?/g, '\n\n')
      // Remove reference-style links?
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '');
    if (output.includes('#')) {
      output = output.replace(/^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm, '$1$3$4$6');
    }
    output = replaceBoundedDelimiterRuns(output, '*', 3, /([\*]+)(\S)(.*?\S)??\1/g, '$2$3');
    // Underscore emphasis requires a non-word boundary on each side.
    output = replaceBoundedDelimiterRuns(output, '_', 3, /(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, '$1$3$4$5');
    output = replaceBoundedDelimiterRuns(output, '`', 6, /(`{3,})(.*?)\1/gm, '$2');
    output = output
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

function replaceBeforeFinalNewline(input, pattern, replacement) {
  const lastNewline = input.lastIndexOf('\n');
  if (lastNewline === -1) return input;
  return input.slice(0, lastNewline + 1).replace(pattern, replacement) + input.slice(lastNewline + 1);
}

function nextLineBreak(input, from) {
  for (let at = from; at < input.length; at++) {
    const code = input.charCodeAt(at);
    if (code === 10 || code === 13 || code === 0x2028 || code === 0x2029) return at;
  }
  return -1;
}

function removeFirstAbbreviation(input) {
  let from = 0;
  let end = nextLineBreak(input, from);
  let open = input.indexOf('*[');
  let close = input.indexOf(']:');
  while (end !== -1) {
    while (close !== -1 && open !== -1 && close <= open) {
      close = input.indexOf(']:', close + 2);
    }
    if (open !== -1 && close !== -1 && input[end] === '\n' &&
        open >= from && open < end && close > open && close < end) {
      return input.slice(0, from) +
        input.slice(from, end + 1).replace(/\*\[.*\]:.*\n/, '') +
        input.slice(end + 1);
    }
    from = end + 1;
    if (open !== -1 && open < from) open = input.indexOf('*[', from);
    end = nextLineBreak(input, from);
  }
  return input;
}

function replaceOnCandidateLines(input, pattern, replacement, canMatch) {
  const parts = [];
  let from = 0;
  while (from < input.length) {
    const breakAt = nextLineBreak(input, from);
    const end = breakAt === -1 ? input.length : breakAt + 1;
    const line = input.slice(from, end);
    parts.push(canMatch(line) ? line.replace(pattern, replacement) : line);
    from = end;
  }
  return parts.join('');
}

function hasCandidateFootnote(line) {
  const open = line.indexOf('[^');
  return open !== -1 && line.indexOf(']', open + 3) !== -1;
}

function hasCandidateImage(line) {
  const open = line.indexOf('![');
  if (open === -1) return false;
  const lastEnd = Math.max(line.lastIndexOf(']'), line.lastIndexOf(')'));
  let close = line.indexOf(']', open + 2);
  while (close !== -1) {
    if ((line[close + 1] === '[' || line[close + 1] === '(') && lastEnd > close + 1) {
      return true;
    }
    close = line.indexOf(']', close + 1);
  }
  return false;
}

function hasCandidateSeparatedLink(input) {
  const open = input.indexOf('[');
  if (open === -1) return false;
  const separator = input.indexOf('](', open + 2);
  return separator !== -1 && input.lastIndexOf(')') > separator + 2;
}

function replaceFinalReferenceDefinition(input) {
  let from = input.length;
  while (from > 0) {
    const code = input.charCodeAt(from - 1);
    if (code === 10 || code === 13 || code === 0x2028 || code === 0x2029) break;
    from--;
  }
  const lastLine = input.slice(from);
  if (!lastLine.includes('[') || !lastLine.includes(']: ')) return input;
  const start = Math.max(0, from - 2);
  return input.slice(0, start) + input.slice(start).replace(/\s{0,2}\[.*?\]: .*?$/g, '');
}

function stripHtmlTags(input, pattern, simple) {
  const lastClose = input.lastIndexOf('>');
  if (lastClose === -1) return input;

  if (!simple) {
    return input.slice(0, lastClose + 1).replace(pattern, '') + input.slice(lastClose + 1);
  }

  const parts = [];
  let from = 0;
  let open = input.indexOf('<');
  while (open !== -1 && open < lastClose) {
    const close = input.indexOf('>', open + 1);
    if (close === -1) break;
    parts.push(input.slice(from, open));
    from = close + 1;
    open = input.indexOf('<', from);
  }
  parts.push(input.slice(from));
  return parts.join('');
}

function hasInlineLinkSeparator(input) {
  if (!input.includes('[')) return false;
  const lastClose = Math.max(input.lastIndexOf(')'), input.lastIndexOf(']'));
  let close = input.indexOf(']');
  while (close !== -1 && close < lastClose) {
    let next = close + 1;
    while (next < input.length && /\s/.test(input[next])) next++;
    if (input[next] === '(' || input[next] === '[') return true;
    close = input.indexOf(']', close + 1);
  }
  return false;
}

// These expressions use backreferences and can backtrack heavily on a line
// with hundreds of delimiters. Keep normal lines byte-for-byte compatible,
// and leave unusually delimiter-dense lines untouched by this pass. A single
// run is handled exactly, even when it exceeds the limit.
const MAX_DELIMITERS_PER_LINE = 512;

function replaceBoundedDelimiterRuns(input, delimiter, minLength, pattern, replacement) {
  if (!input.includes(delimiter)) return input;
  if (!hasMultipleDelimiterRuns(input, delimiter)) {
    return replaceSingleDelimiterRun(input, delimiter, minLength, pattern, replacement);
  }
  const parts = [];
  let from = 0;
  let first = true;
  let consumedBreak = false;
  while (from < input.length) {
    const breakAt = nextLineBreak(input, from + (first ? 0 : 1));
    const end = breakAt === -1 ? input.length : breakAt + 1;
    const line = input.slice(from, end);
    let count = 0;
    for (let at = line.indexOf(delimiter); at !== -1; at = line.indexOf(delimiter, at + 1)) count++;
    let result;
    let nextConsumedBreak = false;
    if (count > MAX_DELIMITERS_PER_LINE) {
      result = line;
    } else if (delimiter === '_') {
      // The original global expression may consume a line break as its final
      // boundary. Do not let the next line reuse that same break as a prefix.
      const prefix = !first && consumedBreak ? 'A' : '';
      const subject = prefix ? prefix + line.slice(1) : line;
      result = subject.replace(pattern, (match, before, marks, firstChar, middle, after, offset) => {
        if (breakAt !== -1 && offset + match.length === subject.length) nextConsumedBreak = true;
        return before + firstChar + (middle || '') + after;
      });
      if (prefix) result = line[0] + result.slice(1);
    } else {
      result = line.replace(pattern, replacement);
    }
    parts.push(first ? result : result.slice(1));
    consumedBreak = nextConsumedBreak;
    first = false;
    if (breakAt === -1) break;
    from = breakAt;
  }
  return parts.join('');
}

function hasMultipleDelimiterRuns(input, delimiter) {
  const first = input.indexOf(delimiter);
  let end = first + 1;
  while (input[end] === delimiter) end++;
  return input.indexOf(delimiter, end) !== -1;
}

function replaceSingleDelimiterRun(input, delimiter, minLength, pattern, replacement) {
  const open = input.indexOf(delimiter);
  if (open === -1) return input;

  let end = open + 1;
  while (input[end] === delimiter) end++;
  if (input.indexOf(delimiter, end) !== -1) return input.replace(pattern, replacement);

  const length = end - open;
  if (delimiter === '_' &&
      (open > 0 && /\w/.test(input[open - 1]) || end < input.length && /\w/.test(input[end]))) {
    return input;
  }
  if (length < minLength) return input.replace(pattern, replacement);

  // With only one delimiter run, the original backreference matches pairs
  // inside that run. Keep its exact odd/even remainder without backtracking.
  const remaining = length % 2;
  const kept = delimiter === '`' ? remaining : remaining ? 1 : 2;
  return input.slice(0, open) + delimiter.repeat(kept) + input.slice(end);
}
