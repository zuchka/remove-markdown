// Regex-Konstrukte in den äußeren Scope verschoben
const HR_REGEX = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm;
const LIST_LEADER_REGEX = /^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm;
const HEADER_UNDERLINE_REGEX = /\n={2,}/g;
const FENCED_CODEBLOCK_TILDE_REGEX = /~{3}.*\n/g;
const STRIKETHROUGH_REGEX = /~~/g;
const FENCED_CODEBLOCK_BACKTICK_REGEX = /```(?:.*)\n([\s\S]*?)```/g;
const ABBR_REGEX = /\*\[.*\]:.*\n/;
const HTML_TAGS_REGEX = /<[^>]*>/g;
const SETEXT_HEADER_REGEX = /^[=\-]{2,}\s*$/g;
const FOOTNOTE_REGEX = /\[\^.+?\](\: .*?$)?/g;
const FOOTNOTE_LINK_REGEX = /\s{0,2}\[.*?\]: .*?$/g;
const IMAGE_REGEX = /!\[(.*?)\][\[\(].*?[\]\)]/g;
const INLINE_LINK_REGEX = /\[([\s\S]*?)\]\s*[\(\[].*?[\)\]]/g;
const BLOCKQUOTE_REGEX = /^(\n)?\s{0,3}>\s?/gm;
const REF_LINK_REGEX = /^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g;
const ATX_HEADER_REGEX = /^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm;
const EMPHASIS_ASTERISK_REGEX = /([\*]+)(\S)(.*?\S)??\1/g;
const EMPHASIS_UNDERSCORE_REGEX = /(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g;
const MULTILINE_CODEBLOCK_REGEX = /(`{3,})(.*?)\1/gm;
const INLINE_CODE_REGEX = /`(.+?)`/g;
const STRIKE_REGEX = /~(.*?)~/g;

module.exports = function(md, options) {
  options = options || {};
  options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
  options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
  options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
  options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;
  options.abbr = options.hasOwnProperty('abbr') ? options.abbr : false;
  options.replaceLinksWithURL = options.hasOwnProperty('replaceLinksWithURL') ? options.replaceLinksWithURL : false;
  options.htmlTagsToSkip = options.hasOwnProperty('htmlTagsToSkip') ? options.htmlTagsToSkip : [];
  options.throwError = options.hasOwnProperty('throwError') ? options.throwError : false;

  var output = md || '';

  // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
  output = output.replace(HR_REGEX, '');

  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar)
        output = output.replace(LIST_LEADER_REGEX, options.listUnicodeChar + ' $1');
      else
        output = output.replace(LIST_LEADER_REGEX, '$1');
    }
    if (options.gfm) {
      output = output
      // Header
        .replace(HEADER_UNDERLINE_REGEX, '\n')
        // Fenced codeblocks
        .replace(FENCED_CODEBLOCK_TILDE_REGEX, '')
        // Strikethrough
        .replace(STRIKETHROUGH_REGEX, '')
        // Fenced codeblocks with backticks
        .replace(FENCED_CODEBLOCK_BACKTICK_REGEX, (_, code) => code.trim());
    }
    if (options.abbr) {
      // Remove abbreviations
      output = output.replace(ABBR_REGEX, '');
    }
    
    let htmlReplaceRegex = HTML_TAGS_REGEX;
    if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
      // Create a regex that matches tags not in htmlTagsToSkip
      const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join('|')
      htmlReplaceRegex = new RegExp(
        `<(?!/?(${joinedHtmlTagsToSkip})(?=>|\s[^>]*>))[^>]*>`,
        'g',
      )
    }

    output = output
      // Remove HTML tags
      .replace(htmlReplaceRegex, '')
      // Remove setext-style headers
      .replace(SETEXT_HEADER_REGEX, '')
      // Remove footnotes?
      .replace(FOOTNOTE_REGEX, '')
      .replace(FOOTNOTE_LINK_REGEX, '')
      // Remove images
      .replace(IMAGE_REGEX, options.useImgAltText ? '$1' : '')
      // Remove inline links
      .replace(INLINE_LINK_REGEX, options.replaceLinksWithURL ? '$2' : '$1')
      // Remove blockquotes
      .replace(BLOCKQUOTE_REGEX, '$1')
      // .replace(/(^|\n)\s{0,3}>\s?/g, '\n\n')
      // Remove reference-style links?
      .replace(REF_LINK_REGEX, '')
      // Remove atx-style headers
      .replace(ATX_HEADER_REGEX, '$1$3$4$6')
      // Remove * emphasis
      .replace(EMPHASIS_ASTERISK_REGEX, '$2$3')
      // Remove _ emphasis. Unlike *, _ emphasis gets rendered only if 
      //   1. Either there is a whitespace character before opening _ and after closing _.
      //   2. Or _ is at the start/end of the string.
      .replace(EMPHASIS_UNDERSCORE_REGEX, '$1$3$4$5')
      // Remove single-line code blocks (already handled multiline above in gfm section)
      .replace(MULTILINE_CODEBLOCK_REGEX, '$2')
      // Remove inline code
      .replace(INLINE_CODE_REGEX, '$1')
      // // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
      // .replace(/\n{2,}/g, '\n\n')
      // // Remove newlines in a paragraph
      // .replace(/(\S+)\n\s*(\S+)/g, '$1 $2')
      // Replace strike through
      .replace(STRIKE_REGEX, '$1');
  } catch(e) {
    if (options.throwError) throw e;

    console.error("remove-markdown encountered error: %s", e);
    return md;
  }
  return output;
};
