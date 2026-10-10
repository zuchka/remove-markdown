const $ = (selector) => document.querySelector(selector);
const formatMs = (value) => value < 1 ? `${(value * 1000).toFixed(1)} µs` : `${value.toFixed(2)} ms`;
const formatBytes = (value) => value < 1024 ? `${value} B` : `${(value / 1024).toFixed(2)} KiB`;
function cell(row, text, metric = false) {
  const element = document.createElement('td'); element.textContent = text;
  if (metric) element.className = 'metric';
  row.append(element); return element;
}
function option(select, value, label) {
  const element = document.createElement('option'); element.value = value; element.textContent = label; select.append(element);
}
try {
  const response = await fetch('../results/latest.json');
  if (!response.ok) throw new Error('No recorded snapshot is available yet. Run npm run bench, then npm run build:site.');
  const report = await response.json();
  const sizes = await fetch('../results/sizes.json').then((result) => result.ok ? result.json() : null).catch(() => null);
  const sizeReport = sizes?.lockSha256 === report.source.lockSha256 ? sizes : null;
  $('#load-status').textContent = `Recorded ${new Date(report.generatedAt).toLocaleString()} · Node ${report.environment.node} · ${report.corpus.cases.filter((item) => !item.options).length} shared cases + ${report.corpus.cases.filter((item) => item.options).length} option cases`;
  $('#environment').textContent = `${report.environment.cpu} · ${report.environment.platform} ${report.environment.arch} · ${report.environment.memoryGiB} GiB RAM · V8 ${report.environment.v8}`;
  for (const work of report.corpus.workload) option($('#size'), work.targetBytes, `~${work.targetBytes / 1024} KiB (${work.bytes.toLocaleString()} bytes)`);
  for (const adapter of report.adapters) option($('#library'), adapter.id, adapter.label);
  $('#size').value = '10240';

  function paintPerformance() {
    const bytes = Number($('#size').value);
    const selected = report.performance.filter((item) => item.targetBytes === bytes);
    const maximum = Math.max(...selected.filter((item) => item.status === 'ok').map((item) => item.medianMs));
    $('#performance-rows').replaceChildren();
    for (const adapter of report.adapters) {
      const result = selected.find((item) => item.adapter === adapter.id);
      const row = document.createElement('tr');
      const title = cell(row, adapter.label);
      const versions = document.createElement('small'); versions.textContent = Object.entries(adapter.versions).map(([name, version]) => `${name}@${version}`).join(' · '); title.append(versions);
      if (result?.status === 'ok') {
        const median = cell(row, formatMs(result.medianMs), true);
        const bar = document.createElement('span'); bar.className = 'metric-bar'; bar.setAttribute('aria-hidden', 'true');
        const fill = document.createElement('span'); fill.style.width = `${Math.max(1, result.medianMs / maximum * 100)}%`; bar.append(fill); median.append(bar);
        cell(row, `${formatMs(result.q1Ms)}–${formatMs(result.q3Ms)}`, true);
        cell(row, result.throughputMiBPerSecond.toFixed(1), true);
      } else { cell(row, result?.status === 'timeout' ? `${report.methodology.timingTimeoutMs / 1000} s job deadline` : result?.status || 'Unavailable', true); cell(row, '—', true); cell(row, '—', true); }
      const caseIds = new Set(report.corpus.cases.filter((item) => !item.options).map((item) => item.id));
      const audit = report.quality.find((item) => item.adapter === adapter.id);
      const matches = audit?.cases?.filter((item) => caseIds.has(item.id) && item.content && !item.logs?.length).length;
      cell(row, audit?.status === 'ok' ? `${matches} / ${caseIds.size}` : audit?.status || 'Unavailable', true);
      const bundle = sizeReport?.results.find((item) => item.adapter === adapter.id);
      cell(row, bundle?.status === 'ok' ? formatBytes(bundle.gzipBytes) : 'Unavailable', true);
      $('#performance-rows').append(row);
    }
  }

  function populateCases() {
    const prior = $('#case').value;
    $('#case').replaceChildren();
    for (const item of report.corpus.cases.filter((item) => !item.options || $('#library').value === 'remove-markdown')) option($('#case'), item.id, `${item.category} / ${item.id}`);
    if ([...$('#case').options].some((item) => item.value === prior)) $('#case').value = prior;
    else $('#case').value = 'code-literal';
    paintCase();
  }

  function paintCase() {
    const adapter = report.adapters.find((item) => item.id === $('#library').value);
    const testCase = report.corpus.cases.find((item) => item.id === $('#case').value);
    const audit = report.quality.find((item) => item.adapter === adapter.id);
    const result = audit?.cases?.find((item) => item.id === testCase.id);
    $('#profile').textContent = `${adapter.profile}${testCase.options ? ' · Options: ' + JSON.stringify(testCase.options) : ''}`;
    $('#case-input').textContent = testCase.input || '(empty input)';
    $('#case-expected').textContent = testCase.expected || '(empty output)';
    $('#case-actual').textContent = result?.error || audit?.error || result?.output || '(empty output)';
    $('#case-verdict').textContent = !result || result.error ? 'Conversion failed; inspect the raw report.' : result.logs?.length ? 'Conversion logged a warning; inspect the raw report.' : result.exact ? 'Exact match under this policy.' : result.content ? 'Same content after whitespace normalization. Exact formatting differs.' : 'Different output under this policy. Inspect what was kept, removed, or changed.';
    $('#case-verdict').style.color = result?.content ? 'var(--brand)' : 'var(--attention)';
  }

  for (const adapter of report.adapters) {
    const row = document.createElement('tr'); cell(row, adapter.label);
    for (const bytes of [1024, 4096, 16384]) {
      const item = report.stress.find((entry) => entry.adapter === adapter.id && entry.bytes === bytes);
      cell(row, item?.status === 'ok' ? formatMs(item.elapsedMs) : item?.status === 'timeout' ? '2 s deadline exceeded' : item?.status || 'Unavailable', true);
    }
    $('#stress-rows').append(row);
  }
  $('#size').addEventListener('change', paintPerformance);
  $('#library').addEventListener('change', populateCases);
  $('#case').addEventListener('change', paintCase);
  paintPerformance(); populateCases();
  $('#results').hidden = false;
} catch (error) { $('#load-status').textContent = error.message; }
