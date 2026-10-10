import { parentPort, workerData } from 'node:worker_threads';
import { createAdapter } from './adapters.mjs';
import { cases, normalizeContent, exactText } from '../fixtures/corpus.mjs';

const logs = [];
console.error = (...args) => logs.push(args.map(String).join(' '));
try {
  const start = performance.now();
  const convert = await createAdapter(workerData.adapter);
  const initializationMs = performance.now() - start;
  if (workerData.kind === 'quality') {
    const results = cases.filter((item) => !item.options || workerData.adapter === 'remove-markdown').map((item) => {
      try {
        const logStart = logs.length;
        const output = convert(item.input, item.options);
        if (typeof output !== 'string') throw new Error('Adapter did not return a string');
        return { id: item.id, output, exact: exactText(output) === exactText(item.expected), content: normalizeContent(output) === normalizeContent(item.expected), logs: logs.slice(logStart) };
      } catch (error) { return { id: item.id, error: error.message, exact: false, content: false }; }
    });
    parentPort.postMessage({ status: 'ok', initializationMs, cases: results });
  } else if (workerData.kind === 'stress') {
    const begin = performance.now();
    const output = convert(workerData.input);
    parentPort.postMessage({ status: 'ok', initializationMs, elapsedMs: performance.now() - begin, outputLength: output.length, unchanged: output === workerData.input, logs });
  } else {
    const { input, expected, samples = 15 } = workerData;
    const firstStart = performance.now();
    const output = convert(input);
    const firstConversionMs = performance.now() - firstStart;
    if (normalizeContent(output) !== normalizeContent(expected) || logs.length) {
      parentPort.postMessage({ status: 'output-mismatch', initializationMs, firstConversionMs, output, logs });
    } else {
      // Reuse initialized processors. Imports, output checking, and normalization
      // are outside timed batches; all conversion stages are inside them.
      let consumed = 0;
      const warmupStart = performance.now();
      let warmupCalls = 0;
      do { consumed = (consumed + convert(input).length) >>> 0; warmupCalls++; } while (performance.now() - warmupStart < 100);
      const estimate = (performance.now() - warmupStart) / warmupCalls;
      const batchSize = Math.max(1, Math.min(10000, Math.ceil(5 / estimate)));
      const values = [];
      for (let sample = 0; sample < samples; sample++) {
        const begin = performance.now();
        for (let call = 0; call < batchSize; call++) consumed = (consumed + convert(input).length) >>> 0;
        values.push((performance.now() - begin) / batchSize);
      }
      parentPort.postMessage({ status: logs.length ? 'conversion-warning' : 'ok', initializationMs, firstConversionMs, values, batchSize, warmupCalls, consumed, outputLength: output.length, logs });
    }
  }
} catch (error) { parentPort.postMessage({ status: 'error', error: error.stack }); }
