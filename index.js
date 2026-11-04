const uriAutolink = /<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*>/y;
const emailAutolink = /<[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*>/y;
const htmlTagName = /<\/?[A-Za-z][A-Za-z0-9-]*/y;

// Runs `output.replace(regex, replacement)` for one of the patterns that start at a "[" and scan
// ahead for a closing "]...". Such a pattern rescans the rest of its line (or text) from every "["
// that has nothing to close it, which is quadratic when there are many of them (for example after
// text like "<![CDATA[x>" is kept as it is). `tail` matches what every match of `regex` must
// contain after its "["; a "[" at or after the end of the last such tail can neither start a match
// nor lie inside one, so it is hidden from the pattern and put back afterwards. The result is the
// same as without hiding. `lines` applies this per line (true), or to the last line only ('last'),
// for patterns that cannot cross a line break; otherwise it applies to the whole text.
// A hidden bracket is written as U+E000. To keep that safe for any input, U+E000 and the escape
// character U+E001 that already occur in the text are first written as U+E001 followed by "1" or
// "2", and are decoded again at the end, so no text can be mistaken for a hidden bracket.
function replaceLiveBrackets(text, regex, replacement, tail, lines) {
  if (text.indexOf('[') === -1) return text;
  const hidden = String.fromCharCode(0xE000);
  const escape = String.fromCharCode(0xE001);
  const escaped = text.split(escape).join(escape + '2').split(hidden).join(escape + '1');

  const hideDeadBrackets = function(part, offset) {
    // Only the last line can match a pattern that has to reach the end of the text.
    let end = lines === 'last' && offset + part.length !== escaped.length ? 0 : -1;
    if (end === -1) {
      let match;
      tail.lastIndex = 0;
      while ((match = tail.exec(part))) {
        end = match.index + match[0].length;
        tail.lastIndex = match.index + 1;
      }
    }
    return end === -1 ? part.split('[').join(hidden) : part.slice(0, end) + part.slice(end).split('[').join(hidden);
  };
  const visible = lines ? escaped.replace(/.+/g, hideDeadBrackets) : hideDeadBrackets(escaped, 0);
  return visible
    .replace(regex, replacement)
    .split(hidden).join('[')
    .split(escape + '1').join(hidden)
    .split(escape + '2').join(escape);
}

// Removes HTML, treating "<" as HTML only when it can start an HTML construct (as in CommonMark),
// so plain text such as "2 < 3 and 3 > 1" is left alone. The text is scanned once from left to
// right, and the position of a missing terminator is remembered, so many unterminated comments,
// CDATA sections or declarations cannot make it rescan the rest of the text for each one.
// A tag still ends at the first ">", but a quoted attribute value may contain "<".
function removeHtml(text, tagsToSkip) {
  const skipRegex = tagsToSkip.length > 0 ? new RegExp(`</?(?:${tagsToSkip.join('|')})(?=[>\\s])`, 'y') : null;
  const found = {};
  // Index of the first `needle` at or after `from`; `from` never decreases for a given needle.
  const find = function(needle, from) {
    if (found[needle] === -1) return -1;
    if (found[needle] === undefined || found[needle] < from) found[needle] = text.indexOf(needle, from);
    return found[needle];
  };
  // Index just after a construct that must be closed by `terminator`, or -1.
  const endOf = function(terminator, from) {
    const index = find(terminator, from);
    return index === -1 ? -1 : index + terminator.length;
  };
  const matchEnd = function(regex, start) {
    regex.lastIndex = start;
    return regex.test(text) ? regex.lastIndex : -1;
  };

  const htmlEnd = function(start) {
    let construct = -1;
    if (text.startsWith('<!--', start)) construct = endOf('-->', start + 4);
    else if (text.startsWith('<![CDATA[', start)) construct = endOf(']]>', start + 9);
    else if (text.startsWith('<?', start)) construct = endOf('?>', start + 2);
    else if (text.startsWith('<!', start) && /[A-Za-z]/.test(text.charAt(start + 2))) construct = endOf('>', start);
    if (construct !== -1) return construct;

    const autolinkEnd = Math.max(matchEnd(uriAutolink, start), matchEnd(emailAutolink, start));
    if (autolinkEnd !== -1) return autolinkEnd;

    const nameEnd = matchEnd(htmlTagName, start);
    if (nameEnd === -1) return -1;
    if (text.charAt(nameEnd) === '>') return nameEnd + 1;
    if (text.charAt(nameEnd) !== '/' && !/\s/.test(text.charAt(nameEnd))) return -1;
    const end = endOf('>', start);
    if (end === -1) return -1;
    let quote = '';
    for (let index = nameEnd + 1; index < end - 1; index++) {
      const character = text.charAt(index);
      if (quote) {
        if (character === quote) quote = '';
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '<') {
        return -1;
      }
    }
    return end;
  };

  const isSkipped = function(start) {
    if (!skipRegex) return false;
    skipRegex.lastIndex = start;
    if (!skipRegex.test(text)) return false;
    const next = text.charAt(skipRegex.lastIndex);
    return next === '>' || find('>', start) !== -1;
  };

  let result = '';
  let copied = 0;
  let start = text.indexOf('<');
  while (start !== -1) {
    const end = isSkipped(start) ? -1 : htmlEnd(start);
    if (end === -1) {
      start = text.indexOf('<', start + 1);
    } else {
      result += text.slice(copied, start);
      copied = end;
      start = text.indexOf('<', end);
    }
  }
  return result + text.slice(copied);
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

    if (options.separateLinksAndTexts) {
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1' + options.separateLinksAndTexts + '$2');
    }

    // Remove HTML tags
    output = removeHtml(output, options.htmlTagsToSkip || []);

    output = output
      // Remove setext-style headers
      .replace(/^[=\-]{2,}\s*$/g, '');
    // Remove footnotes?
    output = replaceLiveBrackets(output, /\[\^.+?\](\: .*?$)?/g, '', /\]/g, true);
    output = replaceLiveBrackets(output, /\s{0,2}\[.*?\]: .*?$/g, '', /\]: /g, 'last');
    // Remove images
    output = replaceLiveBrackets(output, /\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '', /\][\[\(].*?[\]\)]/g, true);
    // Remove inline links
    output = replaceLiveBrackets(output, /\[([\s\S]*?)\]\s*[\(\[](.*?)[\)\]]/g, options.replaceLinksWithURL ? '$2' : '$1', /\]\s*[\(\[].*?[\)\]]/g, false);

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
