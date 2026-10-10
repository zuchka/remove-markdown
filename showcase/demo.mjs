import { examples } from './corpus.mjs';
import { defaults, changedOptions, parseTags, usageSnippet } from './options.mjs';
import { diffText } from './diff.mjs';

export async function copyText(text) {
  const toast = document.querySelector('#toast');
  try { await navigator.clipboard.writeText(text); toast.textContent = 'Copied to clipboard.'; }
  catch { toast.textContent = 'Clipboard unavailable. Select the text and copy it manually.'; }
  toast.hidden = false;
  clearTimeout(copyText.timer);
  copyText.timer = setTimeout(() => { toast.hidden = true; }, 2800);
}

export class RemoveMarkdownDemo extends HTMLElement {
  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.options = structuredClone(defaults);
    this.results = { baseline: '', output: '' };
    this.form = this.querySelector('#options');
    this.input = this.querySelector('#markdown');
    this.status = this.querySelector('#conversion-status');
    this.error = this.querySelector('#conversion-error');
    this.controls = this.form.elements;
    this.exampleBar = this.querySelector('.example-buttons');
    for (const example of examples) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.example = example.id; button.textContent = example.label;
      button.setAttribute('aria-pressed', 'false');
      this.exampleBar.append(button);
    }
    this.addEventListener('click', (event) => {
      const example = event.target.closest('[data-example]');
      if (example) this.loadExample(example.dataset.example);
      const view = event.target.closest('[data-view]');
      if (view?.tagName === 'BUTTON') {
        this.querySelector('.editor-grid').dataset.view = view.dataset.view;
        this.querySelectorAll('.mobile-views button').forEach((button) => button.setAttribute('aria-pressed', String(button === view)));
      }
      const copy = event.target.closest('.copy-output');
      if (copy) copyText(this.results[copy.dataset.output]);
    });
    this.input.addEventListener('input', () => {
      this.exampleBar.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', 'false'));
      this.querySelector('#example-description').textContent = 'Your own text. Change a setting to explore the result.';
      this.queue();
    });
    this.form.addEventListener('submit', (event) => event.preventDefault());
    this.form.addEventListener('input', () => this.readOptions());
    this.querySelector('#reset-options').addEventListener('click', () => {
      this.options = structuredClone(defaults); this.syncControls(); this.queue();
    });
    this.querySelector('#highlight').addEventListener('change', () => this.paint());
    this.querySelector('#copy-code').addEventListener('click', () => copyText(usageSnippet(this.input.value, this.options)));
    this.loadExample('everyday');
  }

  disconnectedCallback() { this.worker?.terminate(); clearTimeout(this.timer); clearTimeout(this.deadline); }

  loadExample(id) {
    const example = examples.find((item) => item.id === id);
    if (!example) return;
    this.input.value = example.input;
    this.options = { ...structuredClone(defaults), ...structuredClone(example.options) };
    this.querySelector('#example-description').textContent = example.description;
    this.exampleBar.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.example === id)));
    this.syncControls(); this.queue();
  }

  syncControls() {
    for (const [key, value] of Object.entries(this.options)) {
      const control = this.controls.namedItem(key);
      if (control.type === 'checkbox') control.checked = value;
      else control.value = Array.isArray(value) ? value.join(', ') : value;
    }
    this.controls.htmlTagsToSkip.setCustomValidity('');
    this.updateDependencies();
  }

  readOptions() {
    const next = {};
    try {
      for (const key of Object.keys(defaults)) {
        const control = this.controls.namedItem(key);
        next[key] = control.type === 'checkbox' ? control.checked : key === 'htmlTagsToSkip' ? parseTags(control.value) : control.value;
      }
      this.controls.htmlTagsToSkip.setCustomValidity('');
      this.options = next; this.updateDependencies(); this.queue();
    } catch (error) {
      this.worker?.terminate(); this.worker = null; clearTimeout(this.timer); clearTimeout(this.deadline);
      this.controls.htmlTagsToSkip.setCustomValidity(error.message);
      this.fail(error.message);
    }
  }

  updateDependencies() {
    this.controls.listUnicodeChar.disabled = !this.options.stripListLeaders;
    this.querySelector('#link-help').textContent = this.options.separateLinksAndTexts ? 'Text + URL is active. It overrides URL-only mode.' : 'A separator takes precedence over URL-only mode.';
  }

  fail(message) {
    this.current = false;
    this.error.textContent = message; this.error.hidden = false;
    this.status.textContent = 'Conversion paused. Update your input or settings.';
    this.querySelectorAll('.copy-output, #copy-code').forEach((button) => { button.disabled = true; });
    this.querySelector('.editor-grid').setAttribute('aria-busy', 'false');
    this.querySelector('#output-summary').textContent = 'Previous output — not current';
  }

  queue() {
    clearTimeout(this.timer); clearTimeout(this.deadline); this.worker?.terminate(); this.worker = null;
    this.current = false;
    if (!this.controls.htmlTagsToSkip.validity.valid) { this.fail(this.controls.htmlTagsToSkip.validationMessage); return; }
    this.error.hidden = true;
    this.querySelectorAll('.copy-output, #copy-code').forEach((button) => { button.disabled = true; });
    this.status.textContent = 'Converting…';
    this.querySelector('.editor-grid').setAttribute('aria-busy', 'true');
    this.querySelector('#input-count').textContent = `${this.input.value.length.toLocaleString()} characters`;
    this.querySelector('#usage-code').textContent = usageSnippet(this.input.value, this.options);
    this.timer = setTimeout(() => this.convert(), 120);
  }

  convert() {
    try { this.worker = new Worker(new URL('./conversion-worker.mjs', import.meta.url), { type: 'module' }); }
    catch (error) { this.fail(`Could not start the converter: ${error.message}`); return; }
    const worker = this.worker;
    this.deadline = setTimeout(() => {
      worker.terminate(); this.fail('This input took too long. Try a shorter document.');
    }, 2500);
    worker.onmessage = ({ data }) => {
      if (worker !== this.worker) return;
      clearTimeout(this.deadline); worker.terminate();
      if (data.error) { this.fail(data.error); return; }
      this.results = data;
      this.current = true;
      this.paint();
      this.querySelector('.editor-grid').setAttribute('aria-busy', 'false');
      this.querySelectorAll('.copy-output, #copy-code').forEach((button) => { button.disabled = false; });
      if (data.logs.length) { this.error.hidden = false; this.error.textContent = 'The library caught an error and returned the original input. ' + data.logs.join(' '); }
    };
    worker.onerror = (event) => { if (worker !== this.worker) return; clearTimeout(this.deadline); worker.terminate(); this.fail(event.message || 'The conversion worker could not load.'); };
    worker.postMessage({ input: this.input.value, options: changedOptions(this.options) });
  }

  paint() {
    const highlight = this.querySelector('#highlight').checked;
    const parts = diffText(this.results.baseline, this.results.output);
    for (const target of ['baseline', 'output']) {
      const pre = this.querySelector(`#${target}`);
      pre.replaceChildren();
      for (const part of parts) {
        if (target === 'baseline' && part.type === 'added' || target === 'output' && part.type === 'removed') continue;
        const node = document.createElement(highlight && part.type !== 'same' ? 'mark' : 'span');
        node.textContent = part.text;
        if (part.type !== 'same') node.className = part.type;
        pre.append(node);
      }
      if (!this.results[target]) {
        const empty = document.createElement('span'); empty.className = 'empty-output'; empty.textContent = 'Empty output'; pre.append(empty);
      }
      this.querySelector(`#${target}-count`).textContent = `${this.results[target].length.toLocaleString()} characters`;
    }
    if (!this.current) return;
    const count = Object.keys(changedOptions(this.options)).length;
    this.querySelector('#output-summary').textContent = count ? `${count} option${count === 1 ? '' : 's'} changed` : 'Default settings';
    this.status.textContent = this.results.baseline === this.results.output ? 'Same output as defaults for this input.' : 'Settings applied. Highlighted text shows what changed.';
  }
}

customElements.define('remove-markdown-demo', RemoveMarkdownDemo);
document.querySelector('#copy-install')?.addEventListener('click', (event) => copyText(event.currentTarget.dataset.copy));
