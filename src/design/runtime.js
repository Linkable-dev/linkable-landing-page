// Runs a page: keeps the state the design's logic class expects, renders the
// template whenever it changes and patches the live DOM in place.
//
// Patching rather than replacing matters: it keeps the demo <video> playing, the
// open mobile menu open, horizontal rows where the visitor scrolled them, and
// the CSS entry animations from replaying every 1.6 seconds when the tick fires.
//
// Cost matters too: the home page re-renders every 1.6 s for its animations.
// Re-parsing its 165 KB of HTML and walking every node each time took 20-30 ms
// on a fast laptop, enough to drop frames while scrolling on a phone. So only
// the first draw goes through HTML; after that each render is compared with
// the previous one in memory (render.js returns a tree) and only the text and
// attributes that differ are written. Where the live DOM does not line up with
// the tree, that element alone falls back to the HTML path.

import { render, toHtml } from './render.js';

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

// Escaped text or attribute value from the renderer -> the string the DOM holds.
let decoder;
function decode(s) {
  if (!s.includes('&')) return s;
  decoder = decoder || document.createElement('textarea');
  decoder.innerHTML = s;
  return decoder.value;
}

function morphHtml(live, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphChildren(live, tpl.content);
}

function sameTree(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.t !== undefined || y.t !== undefined) { if (x.t !== y.t) return false; continue; }
    if (x.raw !== undefined || y.raw !== undefined) { if (x.raw !== y.raw) return false; continue; }
    if (x.tag !== y.tag || x.attrs.length !== y.attrs.length) return false;
    for (let j = 0; j < x.attrs.length; j++) if (x.attrs[j][0] !== y.attrs[j][0] || x.attrs[j][1] !== y.attrs[j][1]) return false;
    if (!sameTree(x.kids, y.kids)) return false;
  }
  return true;
}

// Does live.childNodes line up one to one with the rendered nodes?
function aligned(live, prev, next) {
  const nodes = live.childNodes;
  if (prev.length !== next.length || nodes.length !== next.length) return false;
  for (let i = 0; i < next.length; i++) {
    const p = prev[i], n = next[i], l = nodes[i];
    if (n.raw !== undefined || p.raw !== undefined) return false;
    if (n.t !== undefined) { if (p.t === undefined || l.nodeType !== 3) return false; continue; }
    if (p.tag !== n.tag || l.nodeType !== 1 || l.localName.toLowerCase() !== n.tag.toLowerCase()) return false;
  }
  return true;
}

function patchChildren(live, prev, next) {
  if (!aligned(live, prev, next)) {
    if (!sameTree(prev, next)) morphHtml(live, toHtml(next));
    return;
  }
  const nodes = live.childNodes;
  for (let i = 0; i < next.length; i++) {
    const p = prev[i], n = next[i];
    if (n.t !== undefined) {
      if (p.t !== n.t) nodes[i].nodeValue = decode(n.t);
    } else {
      patchElement(nodes[i], p, n);
    }
  }
}

function patchElement(el, p, n) {
  if (el.tagName === 'CANVAS' || el.hasAttribute('data-lk-own')) return;
  if (el.tagName === 'VIDEO') {
    const src = n.attrs.find(([a]) => a === 'src');
    if (src && el.getAttribute('src') === decode(src[1])) return;
  }
  const was = new Map(p.attrs);
  const now = new Map(n.attrs);
  const keep = KEEP[el.tagName];
  for (const name of was.keys()) {
    if (!now.has(name) && !(keep && keep.has(name))) el.removeAttribute(name);
  }
  for (const [name, v] of now) {
    if (was.get(name) === v) continue;
    let value = decode(v);
    if (name === 'class') {
      for (const c of KEEP_CLASS) if (el.classList.contains(c) && !value.split(/\s+/).includes(c)) value += ' ' + c;
    }
    el.setAttribute(name, value);
  }
  patchChildren(el, p.kids, n.kids);
}

// Development only (stripped from builds): after every update, the live page
// must equal a fresh parse of the render, apart from what scripts own.
function verify(root, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const attrs = (el) => [...el.attributes]
    .filter((a) => !(a.name === 'open' && el.tagName === 'DETAILS'))
    .map((a) => [a.name, a.name === 'class' ? a.value.split(/\s+/).filter((c) => c && !KEEP_CLASS.includes(c)).join(' ') : a.value])
    .sort().join('|');
  const walk = (a, b, path) => {
    if (a.nodeType !== b.nodeType) return path + ': node type';
    if (a.nodeType === 3) return a.nodeValue === b.nodeValue ? null : `${path}: text "${a.nodeValue.slice(0, 40)}" vs "${b.nodeValue.slice(0, 40)}"`;
    if (a.nodeType !== 1) return null;
    if (a.tagName !== b.tagName) return `${path}: <${a.tagName}> vs <${b.tagName}>`;
    if (a.tagName === 'CANVAS' || a.hasAttribute('data-lk-own')) return null;
    if (attrs(a) !== attrs(b)) return `${path}>${a.tagName}: attrs ${attrs(a).slice(0, 120)} vs ${attrs(b).slice(0, 120)}`;
    if (a.childNodes.length !== b.childNodes.length) return `${path}>${a.tagName}: ${a.childNodes.length} vs ${b.childNodes.length} children`;
    for (let i = 0; i < a.childNodes.length; i++) {
      const d = walk(a.childNodes[i], b.childNodes[i], `${path}>${a.tagName.toLowerCase()}[${i}]`);
      if (d) return d;
    }
    return null;
  };
  const live = root.childNodes, want = tpl.content.childNodes;
  if (live.length !== want.length) return console.error('lk runtime mismatch: root children', live.length, want.length);
  for (let i = 0; i < want.length; i++) {
    const d = walk(live[i], want[i], `[${i}]`);
    if (d) return console.error('lk runtime mismatch:', d);
  }
}

export function mount(root, tree, app) {
  let handlers = [];
  let prev = null;
  const draw = () => {
    const r = render(tree, app.renderVals());
    handlers = r.handlers;
    if (prev) patchChildren(root, prev, r.nodes);
    else morphHtml(root, r.html);
    prev = r.nodes;
    if (import.meta.env?.DEV) verify(root, r.html);
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
