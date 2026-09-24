module.exports = function(md, options) {
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
      output = output.replace(/\*\[.*\]:.*\n/, '');
    }

    let htmlReplaceRegex = /<[^>]*>/g
    if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
      // Create a regex that matches tags not in htmlTagsToSkip
      const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join('|')
      htmlReplaceRegex = new RegExp(
        `<(?!\/?(${joinedHtmlTagsToSkip})(?=>|\s[^>]*>))[^>]*>`,
        'g',
      )
    }

    if (options.separateLinksAndTexts && output.includes('](') && output.includes(')')) {
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1' + options.separateLinksAndTexts + '$2');
    }

    output = stripHtmlTags(output, htmlReplaceRegex, !options.htmlTagsToSkip || options.htmlTagsToSkip.length === 0)
      .replace(/^[=\-]{2,}\s*$/g, '');
    if (output.includes(']')) {
      output = output.replace(/\[\^.+?\](\: .*?$)?/g, '');
    }
    if (output.includes(']: ')) {
      output = output.replace(/\s{0,2}\[.*?\]: .*?$/g, '');
    }
    if (output.includes(']')) {
      output = output.replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '');
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
    output = replaceSingleDelimiterRun(output, '*', 3, /([\*]+)(\S)(.*?\S)??\1/g, '$2$3');
    // Underscore emphasis requires a non-word boundary on each side.
    output = replaceSingleDelimiterRun(output, '_', 3, /(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, '$1$3$4$5');
    output = replaceSingleDelimiterRun(output, '`', 6, /(`{3,})(.*?)\1/gm, '$2');
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

function replaceSingleDelimiterRun(input, delimiter, minLength, pattern, replacement) {
  const open = input.indexOf(delimiter);
  if (open === -1) return input;

  let end = open + 1;
  while (input[end] === delimiter) end++;
  if (input.indexOf(delimiter, end) !== -1) {
    if ((delimiter === '*' || delimiter === '_') && !hasPotentialCloser(input, delimiter)) {
      return input;
    }
    return input.replace(pattern, replacement);
  }

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

function hasPotentialCloser(input, delimiter) {
  let at = input.indexOf(delimiter, 1);
  while (at !== -1) {
    // Both emphasis expressions require a non-whitespace character before
    // the closing marker; underscores also require a non-word character after.
    if (/\S/.test(input[at - 1]) &&
        (delimiter === '*' || at + 1 === input.length || /\W/.test(input[at + 1]))) {
      return true;
    }
    at = input.indexOf(delimiter, at + 1);
  }
  return false;
}
