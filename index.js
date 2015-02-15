module.exports = function(md, options) {
  options = options || {};
  options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;

  output = md;
  try {
    if (options.stripListLeaders) {
      output = output.replace(/^([\s\t]*)([\*\-\+]|\d\.)\s+/gm, '$1');
    }
    output = output.replace(/<(.*?)>/g, '$1')
                   .replace(/^[=\-]{2,}\s*$/g, '')
                   .replace(/\[\^.+?\](\: .*?$)?/g, '')
                   .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
                   .replace(/\!\[.*?\][\[\(].*?[\]\)]/g, '')
                   .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1')
                   .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
                   .replace(/^\#{1,6}\s*/g, '')
                   .replace(/([\*_]{1,2})(\S.*?\S)\1/g, '$2')
                   .replace(/(`{3,})(.*?)\1/gm, '$2')
                   .replace(/^-{3,}\s*$/g, '')
                   .replace(/`(.+)`/g, '$1')
                   .replace(/\n{2,}/g, '\n\n');
  } catch(e) {
    console.error(e);
    return md;    
  }
  return output;
}
