// Renders the site's pages from the design templates (src/design/pages/*).
//
//   node tools/design/build.mjs            every page
//   node tools/design/build.mjs static     home, creators, pricing, autopilot, contact, 404
//   node tools/design/build.mjs blog       blog index + every post (content/blog)
//   node tools/design/build.mjs legal      the legal documents (content/legal/documents.json)
//
// Each page is its template rendered by src/design/render.js with the values its
// logic class (src/design/pages/<key>/state.js) produces before any interaction,
// so a crawler or a visitor without JavaScript gets exactly the first frame the
// browser runtime draws. Pages fed by content (blog, posts, legal) also embed
// that content as JSON in #lk-data, which the runtime reads back.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile, render } from '../../src/design/render.js';
import { AUTHOR, CONTENT, SITE, esc, fmtDate, heroInfo, readJson, renderArticle, wordCount } from '../blog/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TRACKING = fs.readFileSync(path.join(ROOT, 'tools/design/tracking.html'), 'utf8');
const OG_DEFAULT = '/assets/images/4pHwprCnjdlRtvgTYMU4ny2tt4.png';

// Titles and descriptions carried over from the Framer pages these replace.
const STATIC = [
  { key: 'home', file: 'index.html', url: '/', title: 'Creator Marketing for Ecommerce Brands | Linkable', description: 'Run gifted, paid and affiliate creator campaigns in one place. Find relevant creators, manage collaborations, get content and track performance with Linkable.' },
  { key: 'creators', file: 'creators/index.html', url: '/creators', title: 'Brand Collaborations for Creators | Linkable', description: 'Discover gifted, paid and affiliate collaborations with ecommerce brands. Create content, promote products you love and earn through Linkable.', image: '/assets/images/9XbOFM8Q37VBjuVNfc5B9HCGn8.png' },
  { key: 'pricing', file: 'pricing/index.html', url: '/pricing', title: 'Creator Marketing Pricing for Ecommerce Brands | Linkable', description: 'Explore Linkable pricing for ecommerce brands. Find creators and run gifted, paid and affiliate campaigns, with everything managed in one place.' },
  { key: 'autopilot', file: 'autopilot/index.html', url: '/autopilot', title: 'Autopilot: Creator Campaigns That Run Themselves | Linkable', description: 'Autopilot sets up your creator campaigns, sources and matches creators and keeps every collaboration moving, so your team doesn’t have to.' },
  { key: 'contact', file: 'contact/index.html', url: '/contact', title: 'Contact Linkable – Speak With the Team', description: 'Get in touch with the Linkable team for support, partnerships, or press inquiries. We usually reply within 24 hours.' },
  { key: 'notfound', file: '404.html', url: '/404', title: 'Linkable – Page Not Found', description: 'The page you’re looking for doesn’t exist. Visit Linkable to discover creator campaigns for ecommerce brands.', robots: 'noindex' },
];

function head({ key, url, title, description, image = OG_DEFAULT, type = 'website', robots = 'max-image-preview:large', extra = '' }) {
  const canonical = SITE + url;
  // A page whose design has no styles of its own (the home page) gets no page.css link.
  const own = fs.readFileSync(path.join(ROOT, `src/design/pages/${key}/page.css`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const css = ['/src/design/site.css', ...(own ? [`/src/design/pages/${key}/page.css`] : []), '/src/consent.css'];
  return `<!doctype html>
<html lang="en" data-page="${key}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="canonical" href="${canonical}">
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link href="/assets/images/ReeNovPL1vL307q6rSUWiwC9Qno.png" rel="icon" media="(prefers-color-scheme: light)">
<link href="/assets/images/UPomnZoVcDYorrnvJxuqQ9Vkv2E.png" rel="icon" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/assets/images/6BpXFGzNfTrLv3wAkMxbUP93Ezc.png">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image.startsWith('http') ? image : SITE + image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image.startsWith('http') ? image : SITE + image}">
${extra}<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
${TRACKING}${css.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<script type="module" src="/src/design/entry.js"></script>
</head>
`;
}

const compiled = new Map();
async function renderBody(key, data) {
  if (!compiled.has(key)) {
    const tpl = fs.readFileSync(path.join(ROOT, `src/design/pages/${key}/template.html`), 'utf8');
    const { PageLogic } = await import(pathToFileURL(path.join(ROOT, `src/design/pages/${key}/state.js`)).href);
    compiled.set(key, { tree: compile(tpl), PageLogic });
  }
  const { tree, PageLogic } = compiled.get(key);
  globalThis.__LK_DATA__ = data || {};
  try {
    const app = new PageLogic();
    // The cookie bar depends on the visitor's stored choice, so it is the
    // runtime's call; the static page ships without it.
    app.state = { cookieDone: true };
    return render(tree, app.renderVals()).html;
  } finally {
    delete globalThis.__LK_DATA__;
  }
}

async function writePage(meta, data) {
  const body = await renderBody(meta.key, data);
  const json = data ? `<script type="application/json" id="lk-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n` : '';
  const out = head(meta) + `<body>\n<div id="lk-root">\n${body}\n</div>\n${json}</body>\n</html>\n`;
  const file = path.join(ROOT, meta.file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
}

export async function buildStatic() {
  for (const meta of STATIC) await writePage(meta);
  return STATIC.length;
}

/* ------------------------------------------------------------------ blog */
const minutes = (p) => p.readMinutes || Math.max(3, Math.round((p.words || 0) / 220));

function card(p) {
  const img = heroInfo(p);
  return {
    slug: p.slug,
    href: `/blog/${p.slug}`,
    src: img.src,
    srcset: img.srcset || null,
    alt: p.imageAlt || p.heroImage?.alt || p.title,
    cat: p.category || 'Playbook',
    date: fmtDate(p.date),
    mins: `${minutes(p)} min read`,
    title: p.title,
    ex: p.excerpt,
  };
}

function credit(p) {
  const c = p.heroImage?.credit;
  if (!c?.name) return null;
  // Some contributors are listed as a bare URL; show the hostname instead.
  const name = /^https?:\/\//i.test(c.name) ? c.name.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '') : c.name;
  const provider = p.heroImage.provider === 'pexels' ? 'Pexels' : p.heroImage.provider;
  return { name, url: c.url || p.heroImage.page || null, on: provider ? ` on ${provider}` : '' };
}

export async function buildBlog() {
  const registry = readJson(path.join(CONTENT, 'posts.json'), []);
  const posts = [...registry].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const cards = posts.map(card);

  // Category chips: the categories in use, most common first.
  const counts = new Map();
  for (const c of cards) counts.set(c.cat, (counts.get(c.cat) || 0) + 1);
  const cats = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));

  await writePage(
    { key: 'blog', file: 'blog/index.html', url: '/blog', title: 'Linkable Blog – Creator Marketing Insights & Ecommerce Growth', description: 'Read the latest insights on creator marketing, affiliate campaigns, ecommerce strategy and product-led partnerships.' },
    { feat: { ...cards[0], author: posts[0].author || AUTHOR.name }, posts: cards.slice(1), cats },
  );

  let n = 0;
  for (const [i, p] of posts.entries()) {
    const file = path.join(CONTENT, 'posts', p.slug + '.json');
    if (!fs.existsSync(file)) {
      console.warn(`no content for /blog/${p.slug}, page not rendered`);
      continue;
    }
    const { blocks = [], faqs = [] } = readJson(file, {});
    const { html, toc } = renderArticle(blocks, faqs);
    const url = `${SITE}/blog/${p.slug}`;
    const c = cards[i];
    const author = p.author || AUTHOR.name;
    // Keep reading: same category first, then the newest of the rest.
    const others = cards.filter((x) => x.slug !== p.slug);
    const related = [...others.filter((x) => x.cat === c.cat), ...others.filter((x) => x.cat !== c.cat)].slice(0, 3);
    const data = {
      post: {
        ...c,
        excerpt: p.excerpt,
        author,
        initial: author.trim()[0].toUpperCase(),
        url,
        shareLinkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        shareX: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.title)}`,
        credit: credit(p),
        toc,
        body: html,
      },
      related,
    };
    const ld = [
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description || p.excerpt, image: SITE + c.src, datePublished: p.date, dateModified: p.updated || p.date, author: { '@type': 'Organization', name: 'Linkable', url: SITE }, publisher: { '@type': 'Organization', name: 'Linkable', url: SITE, logo: { '@type': 'ImageObject', url: SITE + AUTHOR.avatar } }, mainEntityOfPage: url, wordCount: wordCount(blocks), inLanguage: 'en-GB', keywords: p.keyword },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog' }, { '@type': 'ListItem', position: 3, name: p.title, item: url }] },
    ];
    if (faqs.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    const extra = `<meta property="article:published_time" content="${p.date}T08:00:00Z">\n<meta property="article:modified_time" content="${p.updated || p.date}T08:00:00Z">\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
    await writePage({ key: 'post', file: `blog/${p.slug}/index.html`, url: `/blog/${p.slug}`, title: p.title, description: p.description || p.excerpt, image: c.src, type: 'article', extra }, data);
    n++;
  }
  return n;
}

/* ----------------------------------------------------------------- legal */
export async function buildLegal() {
  const docs = readJson(path.join(ROOT, 'content/legal/documents.json'), []);
  for (const doc of docs) {
    await writePage({ key: 'legal', file: `legal/${doc.slug}/index.html`, url: `/legal/${doc.slug}`, title: `${doc.title} - Linkable`, description: doc.meta }, { doc });
  }
  return docs.length;
}

/* ------------------------------------------------------------------- cli */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const what = process.argv[2] || 'all';
  if (what === 'all' || what === 'static') console.log(`static pages: ${await buildStatic()}`);
  if (what === 'all' || what === 'blog') console.log(`blog posts: ${await buildBlog()} (+ index)`);
  if (what === 'all' || what === 'legal') console.log(`legal pages: ${await buildLegal()}`);
}
