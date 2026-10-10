const key = 'remove-markdown-theme';
const media = matchMedia('(prefers-color-scheme: dark)');
let preference = 'system';
try { preference = localStorage.getItem(key) || 'system'; } catch {}
if (!['system', 'light', 'dark'].includes(preference)) preference = 'system';
function apply() {
  document.documentElement.dataset.theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
}
apply();
media.addEventListener('change', apply);
const control = document.querySelector('#theme');
control.value = preference;
control.addEventListener('change', () => {
  preference = control.value;
  try { localStorage.setItem(key, preference); } catch {}
  apply();
});
