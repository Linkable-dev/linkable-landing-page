// Renders the site's pages from the design templates (src/design/pages/*).
//
//   node tools/design/build.mjs            every page
//   node tools/design/build.mjs static     home, creators, pricing, autopilot, pitch, contact, 404
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
import { tagLink } from '../../src/design/links.js';
import { AUTHOR, CONTENT, SITE, esc, fmtDate, heroInfo, readJson, renderArticle, wordCount } from '../blog/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Home and pricing pick £, € or $ from the visitor's time zone. Render the
// first frame in UTC (US dollars, the design's fallback) whoever builds it;
// the browser switches to the visitor's currency when the runtime starts.
process.env.TZ = 'UTC';
const TRACKING = fs.readFileSync(path.join(ROOT, 'tools/design/tracking.html'), 'utf8');
// Link-preview cards rendered by tools/design/og.mjs (1200x630).
const OG = (name) => ({ image: `/assets/og/${name}.jpg`, imageW: 1200, imageH: 630 });

// Titles and descriptions carried over from the Framer pages these replace.
const STATIC = [
  { key: 'home', file: 'index.html', url: '/', title: 'Creator Marketing for Ecommerce Brands | Linkable', description: 'Run gifted, paid and affiliate creator campaigns in one place. Find relevant creators, manage collaborations, get content and track performance with Linkable.', ...OG('home') },
  { key: 'creators', file: 'creators/index.html', url: '/creators', title: 'Brand Collaborations for Creators | Linkable', description: 'Discover gifted, paid and affiliate collaborations with ecommerce brands. Create content, promote products you love and earn through Linkable.', ...OG('creators') },
  { key: 'pricing', file: 'pricing/index.html', url: '/pricing', title: 'Creator Marketing Pricing for Ecommerce Brands | Linkable', description: 'Explore Linkable pricing for ecommerce brands. Find creators and run gifted, paid and affiliate campaigns, with everything managed in one place.', ...OG('pricing') },
  { key: 'autopilot', file: 'autopilot/index.html', url: '/autopilot', title: 'Autopilot: Creator Campaigns That Run Themselves | Linkable', description: 'Autopilot sets up your creator campaigns, sources and matches creators and keeps every collaboration moving, so your team doesn’t have to.', ...OG('autopilot') },
  { key: 'pitch', file: 'pitch/index.html', url: '/pitch', title: 'Pitch Brands With AI: Land Brand Deals as a Creator | Linkable', description: 'Find brands worth pitching, get a pitch written for you and sent to the person who runs partnerships, with follow ups handled. Free for 10 pitches a month.', ...OG('pitch') },
  { key: 'contact', file: 'contact/index.html', url: '/contact', title: 'Contact Linkable – Speak With the Team', description: 'Get in touch with the Linkable team for support, partnerships, or press inquiries. We usually reply within 24 hours.', ...OG('contact') },
  { key: 'notfound', file: '404.html', url: '/404', title: 'Linkable – Page Not Found', description: 'The page you’re looking for doesn’t exist. Visit Linkable to discover creator campaigns for ecommerce brands.', robots: 'noindex', ...OG('home') },
];

// Absolute URLs use SITE (www.linkable.link). Until that domain serves this site,
// vite.config.js rewrites asset and og:url origins to the deploying domain at
// build time, or link previews would fetch images from Framer and get a 404.
function head({ key, url, title, description, image, imageW, imageH, imageAlt = title, type = 'website', robots = 'max-image-preview:large', extra = '' }) {
  const canonical = SITE + url;
  const img = SITE + image;
  // One stylesheet per page: page.css either carries every style (standalone:
  // home, pitch) or imports site.css ahead of its own rules (import.py).
  const css = [`/src/design/pages/${key}/page.css`, '/src/consent.css'];
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
<meta property="og:site_name" content="Linkable">
<meta property="og:locale" content="en_GB">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${img}">
${imageW ? `<meta property="og:image:width" content="${imageW}">\n<meta property="og:image:height" content="${imageH}">\n` : ''}<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">
${extra}<link rel="preload" href="/assets/fonts/satoshi-variable.woff2" as="font" type="font/woff2" crossorigin>
${TRACKING}${css.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<script type="module" src="/src/design/entry.js"></script>
</head>
`;
}

const compiled = new Map();
// What a page's logic class draws on its first frame: the body's values, and
// the source of the structured data and of llms.txt, so the three cannot
// disagree about a price or an answer.
async function pageVals(key, data) {
  await renderBody(key, data);
  return compiled.get(key).vals;
}
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
    const vals = app.renderVals();
    compiled.get(key).vals = vals;
    // Sign-up links carry the page they are on (src/design/links.js); the
    // browser runtime renders with the same function.
    return render(tree, vals, { link: (href) => tagLink(href, key) }).html;
  } finally {
    delete globalThis.__LK_DATA__;
  }
}

async function writePage(meta, data) {
  const body = await renderBody(meta.key, data);
  if (STRUCTURED[meta.key]) meta = { ...meta, extra: (meta.extra || '') + ldScript(STRUCTURED[meta.key](compiled.get(meta.key).vals, meta)) };
  const json = data ? `<script type="application/json" id="lk-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n` : '';
  const out = head(meta) + `<body>\n<div id="lk-root">\n${body}\n</div>\n${json}</body>\n</html>\n`;
  const file = path.join(ROOT, meta.file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
}

/* ------------------------------------------------------- structured data */
// JSON-LD for search engines and AI assistants. Everything in it is read from
// what the page itself shows (the values above), never written here: a price or
// an answer that changes in the design changes here on the next build. Blog
// posts add their own (BlogPosting, FAQPage) in buildBlog.
const ldScript = (ld) => (ld.length ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n` : '');
const ORG = {
  '@type': 'Organization',
  '@id': SITE + '/#organization',
  name: 'Linkable',
  legalName: 'Linkable Ltd',
  url: SITE + '/',
  logo: SITE + AUTHOR.avatar,
  // The profiles the footer links to (tools/design/import.py, LINKS).
  sameAs: ['https://www.instagram.com/linkable.link/', 'https://www.linkedin.com/company/joinlinkable/', 'https://www.facebook.com/profile.php?id=61571103328154'],
};
// The page's FAQ section. Every answer is on the page (one open, the rest a
// click away), in the page's own words.
const faqLd = (vals) => (vals.faqs?.length
  ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: vals.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]
  : []);
// "$1,990" -> "1990". Static pages are rendered in US dollars (TZ above).
const amount = (shown) => String(shown).replace(/[^0-9.]/g, '');
const STRUCTURED = {
  home: (vals, meta) => [
    { '@context': 'https://schema.org', ...ORG, description: meta.description },
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', name: 'Linkable', url: SITE + '/', publisher: { '@id': ORG['@id'] }, inLanguage: 'en-GB' },
    ...faqLd(vals),
  ],
  creators: (vals) => faqLd(vals),
  pricing: (vals, meta) => [
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Linkable', url: SITE + meta.url, description: meta.description,
      applicationCategory: 'BusinessApplication', operatingSystem: 'Web', publisher: { '@id': ORG['@id'] },
      offers: vals.plans.map((p) => ({ '@type': 'Offer', name: p.name, description: [p.blurb, ...p.features].join(' '), price: amount(p.shown), priceCurrency: vals.curName, url: SITE + meta.url })),
    },
    ...faqLd(vals),
  ],
  pitch: (vals, meta) => [
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Linkable Pitch', url: SITE + meta.url, description: meta.description,
      applicationCategory: 'BusinessApplication', operatingSystem: 'Web', publisher: { '@id': ORG['@id'] },
      offers: [
        // US dollars, as on every static page (TZ above); this page's values name the currency only in words.
        { '@type': 'Offer', name: 'Free', price: amount(vals.freePrice), priceCurrency: 'USD', url: SITE + meta.url },
        { '@type': 'Offer', name: 'Pitch Pro', price: amount(vals.proPrice), priceCurrency: 'USD', url: SITE + meta.url },
      ],
    },
    ...faqLd(vals),
  ],
};

export async function buildStatic() {
  for (const meta of STATIC) await writePage(meta);
  await buildLlms();
  return STATIC.length;
}

/* -------------------------------------------------------------- llms.txt */
// A plain-text map of the site for AI assistants (llmstxt.org): what Linkable
// is, what it costs, the pages worth reading and every article. Written on
// every build, the blog sync's included, so a new post or a new price is in it
// without anyone remembering to add it. Facts come from the pages' own values.
const md = (s) => String(s).replace(/\s+/g, ' ').trim();
export async function buildLlms() {
  const page = Object.fromEntries(STATIC.map((m) => [m.key, m]));
  const pricing = await pageVals('pricing');
  const pitch = await pageVals('pitch');
  const home = await pageVals('home');
  const creators = await pageVals('creators');
  const posts = [...readJson(path.join(CONTENT, 'posts.json'), [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const link = (m) => `- [${m.title.replace(/ \| Linkable$/, '')}](${SITE}${m.url === '/' ? '/' : m.url}): ${md(m.description)}`;
  const post = (p) => `- [${md(p.title)}](${SITE}/blog/${p.slug}): ${md(p.description || p.excerpt)}`;
  const qa = (faqs) => faqs.map((f) => `- **${md(f.q)}** ${md(f.a)}`);
  const forCreators = posts.filter((p) => p.category === CREATOR_CATEGORY);
  const forBrands = posts.filter((p) => p.category !== CREATOR_CATEGORY);
  const out = [
    '# Linkable',
    '',
    `> ${md(home.faqs[0].a)}`,
    '',
    'Linkable has two sides. Brands run creator campaigns: the pages under "For brands". Creators apply to those campaigns and pitch brands directly with Pitch: the pages under "For creators". Prices below are in US dollars; UK brands pay in British pounds and brands in Europe in euros.',
    '',
    '## For brands',
    '',
    link(page.home), link(page.autopilot), link(page.pricing),
    '',
    '### Plans for brands',
    '',
    ...pricing.plans.map((p) => `- ${p.name}: ${p.shown} ${p.per === '/month' ? 'a month' : p.per}${p.paid ? ` (${p.note})` : ''}. ${md(p.blurb)} ${p.features.join('. ')}.`),
    '',
    '### Questions brands ask',
    '',
    ...qa([...home.faqs, ...pricing.faqs.filter((f) => !home.faqs.some((h) => h.q === f.q))]),
    '',
    '## For creators',
    '',
    link(page.creators), link(page.pitch),
    '',
    '### Plans for creators',
    '',
    `- Free: ${pitch.freePrice}. ${md(pitch.faqs.find((f) => f.q === 'Is Pitch free?')?.a || '').replace(/^Yes\. /, '')}`,
    `- Pitch Pro: ${pitch.proPrice} a month (${pitch.proNote}).`,
    '',
    '### Questions creators ask',
    '',
    ...qa([...creators.faqs, ...pitch.faqs.filter((f) => !creators.faqs.some((c) => c.q === f.q))]),
    '',
    '## Articles for brands',
    '',
    ...forBrands.map(post),
    '',
    ...(forCreators.length ? ['## Articles for creators', '', ...forCreators.map(post), ''] : []),
    '## More',
    '',
    `- [Blog](${SITE}/blog): every article, newest first`,
    link(page.contact),
    `- [Sign up as a brand](https://app.linkable.link/auth/brand/sign-up)`,
    `- [Sign up as a creator](https://app.linkable.link/auth/signup)`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'public', 'llms.txt'), out);
  return posts.length;
}

/* ------------------------------------------------------------------ blog */
// The box under an article. The ops app files posts written for creators under
// this one category (linkable-ops server/lib/blog-core.js, CREATOR_CATEGORY);
// they end with the Pitch sign-up, every other post with the brand trial. The
// links carry UTM tags because the app records them on a new account
// (signup_attributions) and a plain link from this site says nothing more than
// "came from linkable.link".
const CREATOR_CATEGORY = 'For creators';
const APP = 'https://app.linkable.link';
export function postCta(p) {
  const tags = `?utm_source=blog&utm_medium=post_cta&utm_campaign=${encodeURIComponent(p.slug)}`;
  return p.category === CREATOR_CATEGORY
    ? { title: 'Pitch the brands you want to work with', text: 'Pick a brand, Linkable writes the pitch and sends it to the person who runs partnerships. 10 pitches a month are free.', label: 'Start pitching for free', href: `${APP}/auth/signup${tags}` }
    : { title: 'Launch your first gifted campaign', text: 'Creators apply, you choose who to work with and Linkable handles the rest.', label: 'Start your free trial', href: `${APP}/auth/brand/sign-up${tags}` };
}

const minutes = (p) => p.readMinutes || Math.max(3, Math.round((p.words || 0) / 220));

function card(p) {
  const img = heroInfo(p);
  return {
    slug: p.slug,
    href: `/blog/${p.slug}`,
    src: img.src,
    srcset: img.srcset || null,
    imgW: img.width,
    imgH: img.height,
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
    { key: 'blog', file: 'blog/index.html', url: '/blog', title: 'Linkable Blog – Creator Marketing Insights & Ecommerce Growth', description: 'Read the latest insights on creator marketing, affiliate campaigns, ecommerce strategy and product-led partnerships.', ...OG('blog') },
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
        cta: postCta(p),
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
    await writePage({ key: 'post', file: `blog/${p.slug}/index.html`, url: `/blog/${p.slug}`, title: p.title, description: p.description || p.excerpt, image: c.src, imageW: c.imgW, imageH: c.imgH, imageAlt: c.alt, type: 'article', extra }, data);
    n++;
  }
  await buildLlms(); // the article list in llms.txt follows every blog sync
  return n;
}

/* ----------------------------------------------------------------- legal */
export async function buildLegal() {
  const docs = readJson(path.join(ROOT, 'content/legal/documents.json'), []);
  for (const doc of docs) {
    await writePage({ key: 'legal', file: `legal/${doc.slug}/index.html`, url: `/legal/${doc.slug}`, title: `${doc.title} - Linkable`, description: doc.meta, ...OG(doc.slug) }, { doc });
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
