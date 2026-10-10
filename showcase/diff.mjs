// Bounded token diff. Large documents use a prefix/suffix comparison instead
// of allocating a matrix proportional to the whole document's token count.
export function diffText(before, after) {
  if (before === after) return [{ type: 'same', text: before }];
  const a = before.match(/\s+|[^\s]+/gu) || [];
  const b = after.match(/\s+|[^\s]+/gu) || [];
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let endA = a.length, endB = b.length;
  while (endA > prefix && endB > prefix && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const left = a.slice(prefix, endA), right = b.slice(prefix, endB);
  const pieces = [{ type: 'same', text: a.slice(0, prefix).join('') }];
  if (left.length * right.length > 40000) {
    pieces.push({ type: 'removed', text: left.join('') }, { type: 'added', text: right.join('') });
  } else {
    const grid = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
    for (let i = left.length - 1; i >= 0; i--) {
      for (let j = right.length - 1; j >= 0; j--) {
        grid[i][j] = left[i] === right[j] ? 1 + grid[i + 1][j + 1] : Math.max(grid[i + 1][j], grid[i][j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        pieces.push({ type: 'same', text: left[i++] }); j++;
      } else if (i < left.length && (j === right.length || grid[i + 1][j] >= grid[i][j + 1])) {
        pieces.push({ type: 'removed', text: left[i++] });
      } else pieces.push({ type: 'added', text: right[j++] });
    }
  }
  pieces.push({ type: 'same', text: a.slice(endA).join('') });
  return pieces.filter((part) => part.text);
}
