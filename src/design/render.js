// Renders a page template: plain HTML plus a few constructs from the design tool
// the site was exported from.
//
//   {{path}}                    a value from renderVals(), looked up through the
//                               enclosing loop scopes; escaped on the way out
//   <sc-for list="{{xs}}" as="x">…</sc-for>
//   <sc-if value="{{flag}}">…</sc-if>
//   <sc-html value="{{html}}"></sc-html>   trusted HTML built by our own tools
//                               (article and legal bodies), inserted unescaped
//   onClick="{{fn}}"            becomes data-on="<n>"; the function is returned
//                               in `handlers[n]` for the runtime to dispatch
//
// It is a string renderer so the same code produces the static index.html at
// build time (Node, no DOM) and every re-render in the browser.

const VOID = new Set(['img', 'br', 'input', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'track']);
const SINGLE = /^\{\{\s*([\w.]+)\s*\}\}$/;
const INLINE = /\{\{\s*([\w.]+)\s*\}\}/g;

function unwrap(binding) {
  const m = (binding || '').match(SINGLE);
  if (!m) throw new Error(`expected a single {{binding}}, got ${binding}`);
  return m[1];
}

export function compile(src) {
  const root = { children: [] };
  const stack = [root];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g;
  let last = 0;
  let m;
  while ((m = tagRe.exec(src))) {
    const parent = stack[stack.length - 1];
    if (m.index > last) parent.children.push({ text: src.slice(last, m.index) });
    last = tagRe.lastIndex;
    const [, close, tag, rawAttrs] = m;
    if (close) {
      const open = stack.pop();
      if (open.tag !== tag) throw new Error(`</${tag}> closes <${open.tag}>`);
      continue;
    }
    const attrs = [];
    const attrRe = /([\w:.-]+)(?:="([^"]*)")?/g;
    let a;
    while ((a = attrRe.exec(rawAttrs))) attrs.push([a[1], a[2] === undefined ? '' : a[2]]);
    const get = (name) => (attrs.find(([n]) => n === name) || [])[1];
    let node;
    if (tag === 'sc-for') node = { tag, list: unwrap(get('list')), as: get('as'), children: [] };
    else if (tag === 'sc-if') node = { tag, test: unwrap(get('value')), children: [] };
    else if (tag === 'sc-html') node = { tag, value: unwrap(get('value')), children: [] };
    else node = { tag, attrs: attrs.filter(([n]) => !n.startsWith('hint-')), children: [] };
    parent.children.push(node);
    if (!VOID.has(tag) && !rawAttrs.trim().endsWith('/')) stack.push(node);
  }
  if (last < src.length) root.children.push({ text: src.slice(last) });
  if (stack.length !== 1) throw new Error(`unclosed <${stack[stack.length - 1].tag}>`);
  return root;
}

const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');

export function render(tree, vals) {
  const handlers = [];
  const scopes = [vals];
  const out = [];

  const lookup = (path) => {
    if (path === 'true') return true;
    if (path === 'false') return false;
    const parts = path.split('.');
    let v;
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (parts[0] in scopes[i]) { v = scopes[i]; break; }
    }
    for (const p of parts) {
      if (v === null || v === undefined) return undefined;
      v = v[p];
    }
    return v;
  };
  const str = (v) => (v === null || v === undefined ? '' : String(v));

  const attr = (name, raw) => {
    const single = raw.match(SINGLE);
    if (single) {
      const v = lookup(single[1]);
      if (typeof v === 'function') {
        if (!/^on/i.test(name)) throw new Error(`function bound to ${name}`);
        return ` data-on="${handlers.push(v) - 1}"`;
      }
      if (v === null || v === undefined) return '';
      if (typeof v === 'boolean') return ` ${name}="${v}"`;
      return ` ${name}="${escAttr(String(v))}"`;
    }
    if (!raw.includes('{{')) return ` ${name}="${raw}"`;
    return ` ${name}="${raw.replace(INLINE, (_, p) => escAttr(str(lookup(p))))}"`;
  };

  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.text !== undefined) {
        out.push(n.text.includes('{{') ? n.text.replace(INLINE, (_, p) => escText(str(lookup(p)))) : n.text);
      } else if (n.tag === 'sc-for') {
        const list = lookup(n.list) || [];
        for (const item of list) {
          scopes.push({ [n.as]: item });
          walk(n.children);
          scopes.pop();
        }
      } else if (n.tag === 'sc-if') {
        if (lookup(n.test)) walk(n.children);
      } else if (n.tag === 'sc-html') {
        out.push(str(lookup(n.value)));
      } else {
        out.push('<' + n.tag);
        for (const [name, raw] of n.attrs) out.push(attr(name, raw));
        out.push('>');
        if (!VOID.has(n.tag)) {
          walk(n.children);
          out.push('</' + n.tag + '>');
        }
      }
    }
  };
  walk(tree.children);
  return { html: out.join(''), handlers };
}
