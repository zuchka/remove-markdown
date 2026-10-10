import { Worker } from 'node:worker_threads';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { adapters } from './adapters.mjs';
import { cases, corpusVersion, timingDocument } from '../fixtures/corpus.mjs';
import { summarize, shuffled } from './statistics.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const lock = await readFile(new URL('./package-lock.json', import.meta.url), 'utf8');
const deps = JSON.parse(lock).packages;
const metadata = adapters.map((adapter) => ({ ...adapter, versions: adapter.id === 'remove-markdown' ? { 'remove-markdown': pkg.version } : Object.fromEntries(adapter.packages.map((name) => [name, deps[`node_modules/${name}`].version])) }));
const seed = 20261010;
const rounds = 3;
const samples = 15;
const sizes = [1024, 10240, 102400, 1048576];
const workload = sizes.map((targetBytes) => {
  const repeats = Math.ceil(targetBytes / Buffer.byteLength(timingDocument.input + '\n\n'));
  const input = Array(repeats).fill(timingDocument.input).join('\n\n');
  const expected = Array(repeats).fill(timingDocument.expected).join('\n\n');
  return { targetBytes, bytes: Buffer.byteLength(input), repeats, input, expected, sha256: hash(input) };
});

function runWorker(data, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), { workerData: data });
    let finished = false;
    const settle = async (value) => {
      if (finished) return;
      finished = true; clearTimeout(timer); await worker.terminate(); resolve(value);
    };
    const timer = setTimeout(() => settle({ status: 'timeout', timeoutMs }), timeoutMs);
    worker.once('message', settle);
    worker.once('error', (error) => settle({ status: 'error', error: error.message }));
    worker.once('exit', (code) => { if (!finished) settle({ status: 'error', error: `Worker exited with code ${code}` }); });
  });
}

const quality = [];
for (const adapter of adapters) {
  const result = await runWorker({ kind: 'quality', adapter: adapter.id });
  quality.push({ adapter: adapter.id, ...result });
  console.log(`Output audit: ${adapter.label} — ${result.status}`);
}

const jobs = [];
for (let round = 0; round < rounds; round++) for (const adapter of adapters) for (const document of workload) jobs.push({ adapter: adapter.id, targetBytes: document.targetBytes, round });
const timings = [];
for (const job of shuffled(jobs, seed)) {
  const document = workload.find((item) => item.targetBytes === job.targetBytes);
  const result = await runWorker({ kind: 'timing', ...job, input: document.input, expected: document.expected, samples });
  timings.push({ ...job, bytes: document.bytes, ...result });
  console.log(`Timing: ${job.adapter}, ~${job.targetBytes / 1024} KiB, round ${job.round + 1} — ${result.status}`);
}

const performanceResults = adapters.flatMap((adapter) => sizes.map((targetBytes) => {
  const runs = timings.filter((item) => item.adapter === adapter.id && item.targetBytes === targetBytes);
  const valid = runs.every((item) => item.status === 'ok');
  return { adapter: adapter.id, targetBytes, bytes: runs[0].bytes, status: valid ? 'ok' : runs.find((item) => item.status !== 'ok').status, ...(valid ? summarize(runs.flatMap((item) => item.values), runs[0].bytes) : {}), rounds: runs.length };
}));

const stress = [];
for (const adapter of adapters) for (const size of [1024, 4096, 16384]) {
  const result = await runWorker({ kind: 'stress', adapter: adapter.id, input: '['.repeat(size) }, 2000);
  stress.push({ adapter: adapter.id, input: 'Repeated unmatched opening brackets', bytes: size, ...result });
}

const trackedInputs = ['index.js', 'index.mjs', 'fixtures/corpus.mjs', 'bench/adapters.mjs', 'bench/worker.mjs', 'bench/run.mjs', 'bench/statistics.mjs', 'bench/package-lock.json'];
const sourceHashes = Object.fromEntries(await Promise.all(trackedInputs.map(async (name) => [name, hash(await readFile(new URL('../' + name, import.meta.url)))])));
const report = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), status: 'local exploratory snapshot',
  maintainerDisclosure: 'This benchmark is maintained by the remove-markdown project.',
  environment: { node: process.version, v8: process.versions.v8, platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGiB: Math.round(os.totalmem() / 1073741824) },
  source: { baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), dirty: !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), hashes: sourceHashes, lockSha256: hash(lock) },
  methodology: { seed, rounds, samplesPerRound: samples, warmupMs: 100, targetBatchMs: 5, timingTimeoutMs: 60000, stressTimeoutMs: 2000, normalization: 'Collapse whitespace runs to one space and trim for content matching; exact results normalize CRLF only.', scope: 'Synthetic documents repeated to four sizes. Timings require matching normalized content. Full default/configured output audit is separate. No universal ranking or production claim.', percentile: 'p95 is the percentile of per-batch mean latency, not individual request latency.' },
  corpus: { version: corpusVersion, cases, timingDocument, workload: workload.map(({ input, expected, ...item }) => item) },
  adapters: metadata, quality, timings, performance: performanceResults, stress,
};
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
const data = JSON.stringify(report, null, 2) + '\n';
const stamp = report.generatedAt.replace(/[:.]/g, '-');
await writeFile(new URL(`./results/${stamp}.json`, import.meta.url), data);
await writeFile(new URL('./results/latest.json', import.meta.url), data);
console.log(`Saved ${stamp}.json and latest.json. Publication status: exploratory, review required.`);
