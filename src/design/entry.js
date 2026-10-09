// Entry point of every page. The page key is on <html data-page>; its template
// and logic class are loaded on demand, so each page only downloads its own.

import { initConsent } from '../consent.js';
import { compile } from './render.js';
import { mount } from './runtime.js';

const templates = import.meta.glob('./pages/*/template.html', { query: '?raw', import: 'default' });
const logics = import.meta.glob('./pages/*/state.js');

async function boot() {
  // The templates render the design's own cookie bar; consent.js keeps the gate
  // on the tracking tags and the preferences dialog behind "Cookie settings".
  initConsent({ banner: false });
  const key = document.documentElement.dataset.page;
  const [template, logic] = await Promise.all([
    templates[`./pages/${key}/template.html`](),
    logics[`./pages/${key}/state.js`](),
  ]);
  const app = mount(document.getElementById('lk-root'), compile(template), new logic.PageLogic());
  document.addEventListener('lk:consent', () => app.setState({ cookieDone: true }));
  // The mobile menu is a <details>; following a link from it should close it.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.m-panel a');
    if (link) link.closest('details')?.removeAttribute('open');
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
