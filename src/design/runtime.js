// Runs a page: keeps the state the design's logic class expects, renders the
// template whenever it changes and patches the live DOM in place.
//
// Patching rather than replacing matters: it keeps the demo <video> playing, the
// open mobile menu open, horizontal rows where the visitor scrolled them, and
// the CSS entry animations from replaying every 1.6 seconds when the tick fires.

import { render } from './render.js';

// Data the build step gives a page (the blog's posts, a legal document…). In the
// browser it is the JSON the build embedded in #lk-data; during the build it is
// set on globalThis before the page renders.
let cached;
export function pageData() {
  if (globalThis.__LK_DATA__) return globalThis.__LK_DATA__;
  if (cached === undefined) {
    const el = typeof document !== 'undefined' && document.getElementById('lk-data');
    cached = el ? JSON.parse(el.textContent) : {};
  }
  return cached;
}

export class DCLogic {
  constructor() {
    this.state = {};
    this._render = null;
    this._queued = false;
  }
  setState(patch) {
    this.state = Object.assign({}, this.state, patch);
    if (!this._render || this._queued) return;
    this._queued = true;
    Promise.resolve().then(() => {
      this._queued = false;
      this._render();
    });
  }
}

// Attributes the page toggles itself, which the template never mentions.
const KEEP = { DETAILS: new Set(['open']) };
// Classes the runtime adds outside the template (see IntersectionObserver in
// state.js); a re-render must not strip them.
const KEEP_CLASS = ['pc-in'];

function morphElement(live, next) {
  if (live.tagName === 'CANVAS') return; // sized by script for the device pixel ratio
  // Elements a page script drives directly (a progress bar, a counter) opt out.
  if (live.hasAttribute('data-lk-own')) return;
  if (live.tagName === 'VIDEO' && live.getAttribute('src') === next.getAttribute('src')) return;
  const keep = KEEP[live.tagName];
  for (const { name } of Array.from(live.attributes)) {
    if (!next.hasAttribute(name) && !(keep && keep.has(name))) live.removeAttribute(name);
  }
  for (const { name, value } of Array.from(next.attributes)) {
    let v = value;
    if (name === 'class') {
      for (const c of KEEP_CLASS) if (live.classList.contains(c) && !v.split(/\s+/).includes(c)) v += ' ' + c;
    }
    if (live.getAttribute(name) !== v) live.setAttribute(name, v);
  }
  morphChildren(live, next);
}

function morphChildren(live, next) {
  const wanted = Array.from(next.childNodes);
  for (let i = 0; i < wanted.length; i++) {
    const n = wanted[i];
    const l = live.childNodes[i];
    if (!l) { live.appendChild(n); continue; }
    if (l.nodeType === 3 && n.nodeType === 3) {
      if (l.nodeValue !== n.nodeValue) l.nodeValue = n.nodeValue;
    } else if (l.nodeType === 1 && n.nodeType === 1 && l.tagName === n.tagName) {
      morphElement(l, n);
    } else {
      l.replaceWith(n);
    }
  }
  while (live.childNodes.length > wanted.length) live.lastChild.remove();
}

export function mount(root, tree, app) {
  let handlers = [];
  const draw = () => {
    const r = render(tree, app.renderVals());
    handlers = r.handlers;
    const tpl = document.createElement('template');
    tpl.innerHTML = r.html;
    morphChildren(root, tpl.content);
  };
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-on]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[Number(el.dataset.on)];
    if (fn) fn(e);
  });
  app._render = draw;
  draw();
  if (app.componentDidMount) app.componentDidMount();
  return app;
}
