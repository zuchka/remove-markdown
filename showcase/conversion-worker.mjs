import removeMd from './vendor/remove-markdown.mjs';

self.onmessage = ({ data }) => {
  const logs = [];
  const previous = console.error;
  console.error = (...args) => logs.push(args.map(String).join(' '));
  try {
    const baseline = removeMd(data.input);
    const output = removeMd(data.input, structuredClone(data.options));
    self.postMessage({ baseline, output, logs });
  } catch (error) {
    self.postMessage({ error: error.message });
  } finally { console.error = previous; }
};
