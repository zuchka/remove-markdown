// Pairs runs of `*` and `_` (one line) like a delimiter stack and leaves the number of delimiters
// still unpaired in `left`. Closers are visited once, left to right, so the work is linear. A pair
// makes every run between its two delimiters literal (`dead`) so it cannot pair again; this is
// how an `*` inside a `__strong__` span can no longer pair with an `*` outside of it. Only the
// asterisks are removed afterwards: the `_` emphasis itself is still stripped by its own rule.
function pairEmphasisRuns(runs, splitOpeners) {
  const openers = [];
  const loose = [];
  const openersByKey = {};
  const remember = function(run) {
    const key = run.character + run.left;
    (openersByKey[key] = openersByKey[key] || []).push(run);
  };
  // The nearest live entry of a list kept in stack order, dropping stale ones from its end.
  const nearestIn = function(list, isStale) {
    while (list && list.length > 0 && isStale(list[list.length - 1])) list.pop();
    return list && list.length > 0 ? list[list.length - 1] : undefined;
  };

  runs.forEach(function(closer) {
    while (closer.canClose && closer.left > 0) {
      // Prefer the nearest opener with exactly as many delimiters left, so that in **2*3** the
      // closing ** pairs with the opening ** instead of the single * taking one of its asterisks.
      let opener = nearestIn(openersByKey[closer.character + closer.left], function(run) {
        return run.dead || run.left !== closer.left;
      });
      if (!opener) {
        const nearest = nearestIn(openersByKey[closer.character + 'any'], function(run) {
          return run.dead || run.left === 0;
        });
        if (nearest && (splitOpeners || nearest.left <= closer.left)) opener = nearest;
      }
      if (!opener) break;

      while (openers[openers.length - 1] !== opener) openers.pop().dead = true;
      while (loose.length > 0 && loose[loose.length - 1].order > opener.order) loose.pop().dead = true;
      const used = Math.min(opener.left, closer.left);
      opener.left -= used;
      closer.left -= used;
      if (opener.left > 0) remember(opener);
      else openers.pop();
    }

    if (closer.left === 0) return;
    if (closer.canOpen) {
      openers.push(closer);
      remember(closer);
      (openersByKey[closer.character + 'any'] = openersByKey[closer.character + 'any'] || []).push(closer);
    } else {
      loose.push(closer);
    }
  });
}

// Strips `*` emphasis by pairing the delimiter runs once, in the original text, so emphasis nested
// inside other emphasis is removed without re-reading the stripped output (which would turn
// literal asterisks from separate spans into new pairs). Like the previous regex, a `*` opens
// only before a non-space and closes only after a non-space, and pairs stay on one line. The `_`
// runs are paired too, with the rule of the `_` emphasis replacement, but only so that they bound
// the asterisks inside them; they are left in the text.
function stripAsteriskEmphasis(text) {
  return text.replace(/.+/g, function(line) {
    const runs = [];
    const runRegex = /\*+|_+/g;
    let match;
    while ((match = runRegex.exec(line))) {
      const before = line.charAt(match.index - 1);
      const after = line.charAt(match.index + match[0].length);
      const asterisk = match[0].charAt(0) === '*';
      runs.push({
        order: runs.length,
        character: match[0].charAt(0),
        start: match.index,
        length: match[0].length,
        left: match[0].length,
        dead: false,
        canOpen: after !== '' && !/\s/.test(after) && (asterisk || before === '' || !/\w/.test(before)),
        canClose: before !== '' && !/\s/.test(before) && (asterisk || after === '' || !/\w/.test(after)),
      });
    }

    // First pair without splitting an opener run, then pair what is left over (which may).
    pairEmphasisRuns(runs, false);
    pairEmphasisRuns(runs.filter(function(run) { return !run.dead && run.left > 0; }), true);

    let result = '';
    let position = 0;
    runs.forEach(function(run) {
      result += line.slice(position, run.start) + run.character.repeat(run.character === '*' ? run.left : run.length);
      position = run.start + run.length;
    });
    return result + line.slice(position);
  });
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
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
      // Remove inline links
      .replace(/\[([\s\S]*?)\]\s*[\(\[](.*?)[\)\]]/g, options.replaceLinksWithURL ? '$2' : '$1')
      // Remove blockquotes
      .replace(/^(\n)?\s{0,3}>\s?/gm, '$1')
      // .replace(/(^|\n)\s{0,3}>\s?/g, '\n\n')
      // Remove reference-style links?
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
      // Remove atx-style headers
      .replace(/^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm, '$1$3$4$6');

    // Remove * emphasis
    output = stripAsteriskEmphasis(output);

    output = output
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
