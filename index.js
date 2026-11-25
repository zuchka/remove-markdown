// Skip code, HTML and angle-delimited link destinations when looking for a web autolink.
// The final alternative follows the existing comparison and HTML matching boundaries.
const webAutolink = /(?:\\|\][(:][ \t\r\n]*)?<(https?:\/\/[^\s<>/?#\x00-\x1f\x7f][^\s<>\x00-\x1f\x7f]*)>/;
const autolinkTokens = new RegExp([
  /\\\\/,
  webAutolink,
  // A backtick in the info string rules out a backtick fence, but is valid in a tilde fence.
  /(?:^|\n) {0,3}(?<fence>`{3,}(?![^\n]*`)|~{3,})[^\n]*[\s\S]*?(?:\n {0,3}(?=\k<fence>)(?:`+|~+)[ \t]*\r?(?=\n|$)|$)/,
  // Inline code closes on a whole backtick run of the opening length, within the paragraph.
  /(?<ticks>`+)(?!`)(?:[^`\n]|\n(?![ \t]*\r?\n)|`+(?!`))*?\k<ticks>(?!`)|`+/,
  /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<\?[\s\S]*?(?:\?>|$)/,
  /<(?:\/?[a-z][a-z0-9-]*(?=[\s/>])|![a-z])(?:[^"'>]|"[^"]*(?:"|$)|'[^']*(?:'|$))*>?/,
  /[ \t]<=?(?=\s)|<[^>]*(?:>|$)/,
].map(pattern => pattern.source).join('|'), 'gi');

const horizontalRule = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm;

// Double literal marker characters so even caller-provided replacement text round-trips.
function escapeMarker(text) {
  return text.replace(/\uE000/g, '\uE000\uE000');
}

function afterIndent(whitespace, column) {
  for (const char of whitespace) column += char === '\t' ? 4 - column % 4 : 1;
  return column;
}

// Four columns start a code block only where a new paragraph could start.
// Inside a list item, count those columns from the item's content margin.
function maskIndentedCode(text) {
  if (!/^(?: {4}| {0,3}\t)/m.test(text)) return text;

  let paragraph = false;
  const margins = [0];
  return text.replace(/([ \t]*)([^\r\n]*)(\r\n|[\r\n]|$)/g, (line, indent, content, ending) => {
    if (!content) {
      paragraph = false;
      return line;
    }
    const column = afterIndent(indent, 0);
    while (column < margins[margins.length - 1]) margins.pop();
    if (!paragraph && column >= margins[margins.length - 1] + 4) {
      // Keep source offsets while hiding both apparent URLs and delimiters in this code line.
      return '\uE000'.repeat(indent.length + content.length) + ending;
    }
    paragraph = content.search(horizontalRule) < 0 && !/^(?:#{1,6}(?:\s|$)|`{3,}[^`]*$|~{3,}|(?:=+|-+)\s*$)/.test(content);
    const marker = paragraph && /^([-+*]|\d{1,9}[.)])([ \t]+)/.exec(content);
    if (marker) {
      const markerEnd = column + marker[1].length;
      const margin = afterIndent(marker[2], markerEnd);
      margins.push(margin - markerEnd > 4 ? markerEnd + 1 : margin);
    }
    return line;
  });
}

function autolinkContext(beforeRules, output) {
  const masked = maskIndentedCode(beforeRules);
  if (masked === beforeRules) return output;
  if (beforeRules === output) return masked;

  // Remove exactly the source ranges removed from output, even if a mask hid a rule.
  let start = 0;
  let scan = '';
  for (const rule of beforeRules.matchAll(horizontalRule)) {
    scan += masked.slice(start, rule.index);
    start = rule.index + rule[0].length;
  }
  return scan + masked.slice(start);
}

// Check only the list or paragraph around an indented line. A flush-left
// nonblank line resets the list margins, so adjacent blocks are independent.
function codeLineLookup(text) {
  const nextFlushLeft = /\n[^ \t\r\n]/g;
  let blockStart = 0;
  let mask = '';
  let start = -1;
  let end = -1;
  let isCode = false;
  return function (offset) {
    if (offset >= start && offset < end) return isCode ? end : -1;
    start = text.lastIndexOf('\n', offset - 1) + 1;
    end = text.indexOf('\n', offset);
    if (end < 0) end = text.length;
    isCode = false;
    if (/^(?: {4}| {0,3}\t)/.test(text.slice(start, start + 4))) {
      if (start < blockStart || start >= blockStart + mask.length) {
        blockStart = start;
        while (blockStart > 0 && /[ \t\r\n]/.test(text[blockStart])) {
          blockStart = blockStart < 2 ? 0 : text.lastIndexOf('\n', blockStart - 2) + 1;
        }
        nextFlushLeft.lastIndex = start;
        const next = nextFlushLeft.exec(text);
        mask = maskIndentedCode(text.slice(blockStart, next ? next.index : text.length));
      }
      isCode = mask[start - blockStart] === '\uE000';
    }
    return isCode ? end : -1;
  };
}

// Inline code cannot cross a blank line. Fences, HTML and angle-delimited
// Markdown destinations can, so visit their possible openers before each URL.
const contextStart = /<|`{3}|~{3}|\][(:](?=[ \t\r\n]*<https?:\/\/)/gi;

const plainAngles = new RegExp(webAutolink.source + '|' + /<[^>]*(?:>|$)/.source, 'gi');
const needsTokenContext = /[`\\]|~{3}|\][(:]|<(?!https?:\/\/)/i;

function protectAutolinks(text, beforeRules, urls) {
  let copied = 0;
  let result = '';
  const hasMarker = text.includes('\uE000');
  function literal(end) {
    const part = text.slice(copied, end);
    return hasMarker ? escapeMarker(part) : part;
  }
  function keep(at, url) {
    result += literal(at) + '\uE000' + urls.length + '\uE001';
    urls.push(url);
    copied = at + url.length + 2;
  }

  // With no backticks, fences, escapes, HTML or link destinations, recognize
  // angles in bulk. The second alternative consumes malformed angle ranges.
  if (!needsTokenContext.test(text)) {
    const scan = autolinkContext(beforeRules, text);
    plainAngles.lastIndex = 0;
    let token;
    while ((token = plainAngles.exec(scan))) {
      if (token[1]) keep(token.index, token[1]);
    }
    return result + literal();
  }

  const candidates = /<https?:\/\//gi;
  const loneCR = /\r(?!\n)/.test(beforeRules);
  let codeLine = loneCR ? null : codeLineLookup(beforeRules);
  let lastCandidate = -1;
  let candidate;
  while ((candidate = candidates.exec(beforeRules))) {
    if (!codeLine || codeLine(candidate.index) < 0) lastCandidate = candidate.index;
  }
  if (lastCandidate < 0) return literal();

  let scan = text;
  if (text !== beforeRules || loneCR) {
    scan = autolinkContext(beforeRules, text);
    codeLine = null;
  }
  const blank = scan.includes('\r\n') ? '\n\r\n' : '\n\n';
  let cursor = 0;
  while (cursor <= lastCandidate) {
    contextStart.lastIndex = cursor;
    const event = contextStart.exec(scan);
    if (!event || event.index > lastCandidate) break;
    const boundary = scan.slice(cursor, event.index).lastIndexOf(blank);
    if (boundary >= 0) cursor += boundary + blank.length - 1;
    autolinkTokens.lastIndex = cursor;
    do {
      const token = autolinkTokens.exec(scan);
      if (!token) return result + literal();
      const [match, url, fence] = token;
      // Fences close on at most three spaces of indentation. Other multiline
      // tokens can change length if an indented line hides their closing delimiter.
      if (codeLine && !fence) {
        const end = codeLine(token.index);
        if (end >= 0) {
          cursor = end;
          break;
        }
        // For a code span, comment or generic <...> range, masking its interior
        // leaves its closing delimiter intact. HTML attributes can also hide quotes.
        if (/\n(?: {4}| {0,3}\t)/.test(match) &&
            (/^<(?:\/?[a-z]|![a-z])/i.test(match) || codeLine(autolinkTokens.lastIndex - 1) >= 0)) {
          scan = autolinkContext(beforeRules, text);
          codeLine = null;
          break;
        }
      }
      if (url && match[0] === '<') keep(token.index, url);
      cursor = autolinkTokens.lastIndex;
    } while (cursor <= event.index);
  }
  return result + literal();
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
  const beforeRules = output;
  output = output.replace(horizontalRule, '');

  try {
    // Keep URL punctuation out of the list, link, emphasis and code replacements.
    let urls;
    if (/<https?:\/\//i.test(output)) {
      urls = [];
      output = protectAutolinks(output, beforeRules, urls);
    }
    if (options.stripListLeaders) {
      if (options.listUnicodeChar) {
        const replacement = options.listUnicodeChar + ' $1';
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, urls ? escapeMarker(replacement) : replacement);
      } else
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
      const replacement = '$1' + options.separateLinksAndTexts + '$2';
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, urls ? escapeMarker(replacement) : replacement);
    }

    const spacedComparison = /[ \t]<=?(?=\s)/;
    if (spacedComparison.test(output)) {
      // Match the operator from its leading whitespace, before < can start an HTML match.
      const htmlOrComparison = new RegExp(spacedComparison.source + '|' + htmlReplaceRegex.source, 'g');
      output = output.replace(htmlOrComparison, match => match[0] === '<' ? '' : match);
    } else {
      output = output.replace(htmlReplaceRegex, '');
    }

    output = output
      // Remove setext-style headers
      .replace(/^[=\-]{2,}\s*$/g, '')
      // Remove footnotes?
      .replace(/\[\^.+?\](\: .*?$)?/g, '')
      .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
      // Remove images
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
      // Remove inline links
      .replace(/\[([\s\S]*?)\]\s*[\(\[](.*?)[\)\]]/g, options.replaceLinksWithURL ? '$2' : '$1')
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
    if (urls) {
      output = output.replace(/\uE000(?:\uE000|(\d+)\uE001)/g, (_, index) => index === undefined ? '\uE000' : urls[index]);
    }
  } catch(e) {
    if (options.throwError) throw e;

    console.error("remove-markdown encountered error: %s", e);
    return md;
  }
  return output;
};
