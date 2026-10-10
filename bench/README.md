# Markdown-to-text benchmark notebook

This suite is maintained by the remove-markdown project. Reports are **exploratory local snapshots**, not universal rankings. No results are automatically published. The site displays the committed/generated snapshot instead of timing visitors' browsers.

## Reproduce

Use Node.js 24 or newer, with the recorded version preferred for comparisons.

```sh
npm ci
npm ci --prefix bench
npm run test:showcase
npm --prefix bench test
npm run bench:sizes
npm run bench
npm run build:site
npm run dev:site
```

Run timing measurements without simultaneous builds, tests, or other CPU-heavy work. Jobs run sequentially. Default preview port: 4173; override with `PORT=4187 npm run dev:site` when needed.

`bench/results/<timestamp>.json` is a dated snapshot; `latest.json` is the site input. `sizes.json` records bundle measurements. The entire dependency graph is pinned in `bench/package-lock.json`. Reports contain hashes of the runner, adapters, corpus, library sources, and lockfile, plus the Git base commit and dirty-worktree flag. A dirty snapshot identifies the actual inputs by hashes; the base commit alone is insufficient to reproduce it.

## Selected pipelines

- **remove-markdown:** local versioned package implementation, defaults. Option-specific cases receive a fresh options object.
- **remark + remark-gfm + strip-markdown:** parse, transform, and serialize with a reusable frozen processor. GFM is enabled explicitly. The serializer may escape literal characters. strip-markdown deliberately drops some nodes, including code blocks, HTML, and tables; differing output is shown rather than silently rewritten.
- **markdown-to-txt:** published defaults and its nested Marked version. Its published JavaScript imports `lodash`, but the manifest declares `lodash.escape` and `lodash.unescape` instead. The harness explicitly installs pinned `lodash` so the package works; the full dependency is counted in bundle measurements. No competitor code is patched.
- **markdown-to-text:** published defaults.
- **marked + html-to-text:** GFM enabled, full parse/render/extract pipeline.
- **markdown-it + html-to-text:** HTML parsing enabled, full parse/render/extract pipeline. Task-list plugins are not added.

HTML-to-text is compiled once. Both HTML pipelines use the same configuration: disable wrapping and uppercase headings, retain link text without URLs and image alt text without sources, and format lists/items/quotes as plain blocks. Input limit is explicitly 16 MiB to prevent default truncation of the 1 MiB workload. See `adapters.mjs` for exact configuration. These are explicitly named pipeline profiles, not a claim that all competitors share the same defaults.

Image alt text uses the public HTML-to-text custom formatter API (`imageAlt`); both timing and bundle entries include that same formatter. The adapters have separate contract tests so configuration errors are caught before measuring competitors.

## Output policy

The 31 shared cases in `fixtures/corpus.mjs` are original MIT-licensed examples. Expected strings are authored independently of any library's output. Policy: keep readable text, code contents and literal code characters, image alt text, link labels, heading case, and table cell text; remove syntax, list markers, task boxes, and HTML tags; decode entities and Markdown escapes.

Nine extra cases audit remove-markdown options and interactions. They are not counted in competitors' denominators. MDX import stripping is in this separate set. Examples used by the showcase live in the same module.

The report records two comparisons:

1. **Exact:** only CRLF is normalized to LF.
2. **Content:** all whitespace runs collapse to one space and leading/trailing whitespace is trimmed. This deliberately ignores paragraph/layout differences and is not sufficient to establish code formatting correctness. Literal outputs remain available for inspection.

Different output can reflect a library's intentional policy, an unsupported feature, or a bug. It is not automatically a defect. Logged errors and thrown errors remain visible. Library output never defines expected output.

## Timing

An original mixed document (heading, emphasis, links, inline code, lists, quote) is repeated to approximately 1, 10, 100, and 1,024 KiB. Exact byte counts, repetition counts, inputs, expected text, and hashes are recorded. This is **one synthetic workload**, not a representative real-world corpus.

For each pipeline and size:

- Three independent Node worker instances; the whole job list is shuffled with recorded seed `20261010`.
- Import and processor construction happen before timing and are recorded separately. First conversion is also recorded separately; it is not an application cold-start measurement.
- The first output must match expected normalized content and emit no warnings; otherwise performance is excluded with an explicit status.
- At least 100 ms of warm-up; batch size chosen for approximately 5 ms, between 1 and 10,000 conversions.
- Fifteen timed batches per worker; each sample is elapsed batch time divided by calls. Output lengths are consumed. Input creation, validation, and normalization are outside the timed loop.
- Median, IQR, minimum, maximum, and p95 of the 45 batch means, plus input-byte throughput. **p95 of batch means is not p95 request latency.** Raw samples remain available. No claims of statistical significance or confidence intervals are made.
- A 60-second worker deadline includes imports and all work for that job. An incomplete round prevents a summary score for that pipeline/size. The deadline allows slow large-document pipelines to complete all 15 samples; it is not a per-conversion budget.

The stress probe repeats unmatched opening brackets at 1,024, 4,096, and 16,384 bytes. Each probe uses a fresh worker with a two-second deadline including startup. Successful durations measure conversion only. Timeouts therefore represent a whole-job bound, not a precise conversion time. This single pattern is not a security audit.

## Bundle size

`sizes.mjs` bundles each complete conversion pipeline for browsers using pinned esbuild, ESM format, ES2022 target, minification, no externals/polyfills, and gzip level 9. Includes setup and adapter code plus runtime dependencies. Results describe standalone bundles, not incremental cost in an app that already includes a parser. Browser execution of competitor bundles is not verified by size measurement. Build failures are reported as unsupported.

## Publication review

The first snapshot intentionally stays local. Before public publication:

- Add pinned, openly licensed real documents across multiple domains and sizes, preserving attribution and input hashes. Review outputs against the policy before timing them.
- Expand adversarial families and test multiple runtime environments. Repeat on a quiet machine and independently reproduce the results.
- Review adapter choices and output differences; allow maintainers to suggest fair configurations. Treat any new configuration as a separate named profile.
- Include all failures, limitations, dependency workarounds, exact versions, raw data, and the maintainer disclosure. Avoid a single aggregate winner.
- Keep dated snapshots; rerun deliberately on releases. Do not overwrite old published claims with new numbers.

Library fixes discovered during benchmarking should be separate changes and comparisons; do not silently alter this baseline to improve its score.
