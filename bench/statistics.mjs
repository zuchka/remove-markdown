export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  return sorted[low] + (sorted[Math.ceil(position)] - sorted[low]) * (position - low);
}

export function summarize(values, bytes) {
  const median = percentile(values, .5);
  return {
    medianMs: median, p95BatchMeanMs: percentile(values, .95),
    minMs: Math.min(...values), maxMs: Math.max(...values),
    q1Ms: percentile(values, .25), q3Ms: percentile(values, .75),
    throughputMiBPerSecond: bytes / 1048576 / (median / 1000),
    samples: values.length,
  };
}

export function shuffled(values, seed) {
  const result = [...values];
  let state = seed >>> 0;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
