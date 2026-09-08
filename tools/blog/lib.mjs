// Shared helpers for the blog generator: renders a post into the Framer
// post template, updates the blog index cards and the sitemap.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT = path.join(ROOT, 'content', 'blog');
export const SITE = 'https://www.linkable.link';
export const AUTHOR = { name: 'Linkable Team', avatar: '/assets/images/6BpXFGzNfTrLv3wAkMxbUP93Ezc.png' };
const IMAGES_DIR = path.join(ROOT, 'public', 'assets', 'images');

export const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);
export const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slugify = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
export const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const wordCount = (blocks) => blocks.reduce((n, b) => n + (b.text ? b.text.split(/\s+/).length : 0) + (b.items ? b.items.join(' ').split(/\s+/).length : 0), 0);

/* -------------------------------------------------------------- images */
export function imageInfo(id) {
  const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.startsWith(id + '-'));
  const full = files.find((f) => !f.includes('scale-down')) || files[files.length - 1];
  const m = full.match(/width-(\d+)-height-(\d+)/);
  const srcset = files
    .map((f) => {
      const w = f.includes('scale-down') ? +f.match(/scale-down-to-(\d+)/)[1] : +m[1];
      return [w, `/assets/images/${f} ${w}w`];
    })
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1])
    .join(',');
  return { src: `/assets/images/${full}`, srcset, width: +m[1], height: +m[2] };
}

/* ---------------------------------------------------- inline markdown */
const ALLOWED_INTERNAL = /^\/(pricing|creators|contact|blog(\/[a-z0-9-]+)?)$/;
const ALLOWED_EXTERNAL = /^https:\/\/apps\.shopify\.com\/linkable-1/;
export function inline(text) {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    url = url.replace(/&amp;/g, '&');
    if (ALLOWED_INTERNAL.test(url)) return `<a class="framer-text framer-styles-preset-1loxrev" href="${esc(url)}">${label}</a>`;
    if (ALLOWED_EXTERNAL.test(url)) return `<a class="framer-text framer-styles-preset-1loxrev" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
    return label; // unknown destination: keep the words, drop the link
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="framer-text">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em class="framer-text">$2</em>');
  return s;
}

/* ------------------------------------------------------- body blocks */
const P = 'framer-text framer-styles-preset-1go4zlw';
export function renderBlocks(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'h2': return `<h2 class="framer-text framer-styles-preset-141sbpv">${inline(b.text)}</h2>`;
        case 'h3': return `<h3 class="framer-text framer-styles-preset-1b5aq58">${inline(b.text)}</h3>`;
        case 'quote': return `<blockquote class="framer-text framer-styles-preset-w9iydi"><p class="${P}">${inline(b.text)}</p></blockquote>`;
        case 'ul':
        case 'ol': return `<${b.type} class="framer-text">${b.items.map((i) => `<li data-preset-tag="p" class="${P}"><p class="${P}">${inline(i)}</p></li>`).join('')}</${b.type}>`;
        default: return `<p class="${P}">${inline(b.text)}</p>`;
      }
    })
    .join('');
}

/* ------------------------------------------------------- template ops */
function sections(html) {
  const s1 = html.indexOf('<section class="framer-10c8w4"');
  const s2 = html.indexOf('<section class="framer-3if7bs"');
  const s3 = html.indexOf('<section class="framer-7h0g1z"');
  if (s1 < 0 || s2 < 0 || s3 < 0) throw new Error('post template: sections not found');
  return { s1, s2, s3 };
}
// Replace the inner HTML of the first RichTextContainer div found after `from`.
function replaceRichText(html, from, to, inner) {
  const open = html.indexOf('data-framer-component-type="RichTextContainer"', from);
  if (open < 0 || open > to) throw new Error('rich text container not found');
  const start = html.indexOf('>', open) + 1;
  let depth = 1, i = start;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) { i = m.index; break; }
  }
  return html.slice(0, start) + inner + html.slice(i);
}
function setImg(imgTag, info, alt) {
  return imgTag
    .replace(/\swidth="\d+"/, ` width="${info.width}"`)
    .replace(/\sheight="\d+"/, ` height="${info.height}"`)
    .replace(/\ssrcset="[^"]*"/, ` srcset="${info.srcset}"`)
    .replace(/\ssrc="[^"]*"/, ` src="${info.src}"`)
    .replace(/\salt(="[^"]*")?/, ` alt="${esc(alt)}"`)
    .replace(/object-position:[^;"]*/, 'object-position:50% 50%');
}
function replaceImgAfter(html, marker, from, info, alt) {
  const at = html.indexOf(marker, from);
  if (at < 0) throw new Error('marker not found: ' + marker);
  const i = html.indexOf('<img', at), j = html.indexOf('>', i) + 1;
  return html.slice(0, i) + setImg(html.slice(i, j), info, alt) + html.slice(j);
}

// Resolve the picture for a post: a per-article photo (downloaded into
// public/assets/blog by sync.mjs) or one of the pool images by id.
export function heroInfo(post) {
  if (post.heroImage?.files?.length) {
    const files = [...post.heroImage.files].sort((a, b) => a.w - b.w);
    const big = files[files.length - 1];
    return { src: big.path, srcset: files.map((f) => `${f.path} ${f.w}w`).join(','), width: big.w, height: Math.round(big.w * (post.heroImage.height / post.heroImage.width)) };
  }
  return imageInfo(post.image);
}

export function renderPost(post) {
  let html = fs.readFileSync(path.join(ROOT, 'tools', 'blog', 'post-template.html'), 'utf8');
  const url = `${SITE}/blog/${post.slug}`;
  const img = heroInfo(post);
  const title = esc(post.title), desc = esc(post.description);

  // ---- head
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`);
  for (const k of ['og:title', 'twitter:title']) html = html.replace(new RegExp(`(<meta (?:property|name)="${k}" content=")[^"]*(")`), `$1${title}$2`);
  for (const k of ['og:description', 'twitter:description']) html = html.replace(new RegExp(`(<meta (?:property|name)="${k}" content=")[^"]*(")`), `$1${desc}$2`);
  for (const k of ['og:image', 'twitter:image']) html = html.replace(new RegExp(`(<meta (?:property|name)="${k}" content=")[^"]*(")`), `$1${SITE}${img.src}$2`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/<meta property="og:type" content="website">/, '<meta property="og:type" content="article">');
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.description, image: SITE + img.src, datePublished: post.date, dateModified: post.updated || post.date, author: { '@type': 'Organization', name: 'Linkable', url: SITE }, publisher: { '@type': 'Organization', name: 'Linkable', url: SITE, logo: { '@type': 'ImageObject', url: SITE + AUTHOR.avatar } }, mainEntityOfPage: url, wordCount: wordCount(post.blocks), inLanguage: 'en-GB', keywords: post.keyword },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog' }, { '@type': 'ListItem', position: 3, name: post.title, item: url }] },
  ];
  if (post.faqs?.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: post.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  const meta = `<meta property="article:published_time" content="${post.date}T08:00:00Z">\n<meta property="article:modified_time" content="${post.updated || post.date}T08:00:00Z">\n<meta property="article:author" content="${SITE}">\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
  html = html.replace('</head>', meta + '</head>');

  // ---- header section (title appears in breadcrumb + h1, some fields in breakpoint variants)
  let { s1, s2, s3 } = sections(html);
  // Header + body sections carry the title, author, date and excerpt (the
  // author/date repeat in a share block after the article), the related-posts
  // section after them must keep its own dates.
  let head = html.slice(s1, s3);
  const oldTitle = head.match(/<h1[^>]*>([^<]*)<\/h1>/)[1];
  head = head.split(oldTitle).join(title);
  head = head.replace(/(preset-ub08wg" data-styles-preset="D9HaS7Cji"[^>]*>)Sofia Bennett(<\/p>)/g, `$1${esc(AUTHOR.name)}$2`);
  head = head.replace(/<time datetime="[^"]*">[^<]*<\/time>/g, `<time datetime="${post.date}T00:00:00.000Z">${fmtDate(post.date)}</time>`);
  head = head.replace(/(preset-1dojnqy" data-styles-preset="BqMhGD2Fv"[^>]*>)[^<]*(<\/p>)/g, `$1${esc(post.excerpt)}$2`);
  let from = 0;
  while ((from = head.indexOf('data-framer-name="Avatar"', from)) >= 0) {
    head = replaceImgAfter(head, 'data-framer-name="Avatar"', from, { src: AUTHOR.avatar, srcset: `${AUTHOR.avatar} 180w`, width: 180, height: 180 }, AUTHOR.name);
    from += 10;
  }
  head = replaceImgAfter(head, 'data-framer-name="16:9"', 0, img, post.imageAlt || post.title);
  if (post.heroImage?.credit?.name) {
    // Photo credit under the hero (stock-photo licence asks for it).
    const wrap = head.indexOf('<div class="framer-83owg2">');
    if (wrap >= 0) {
      let depth = 0, i = wrap; const re = /<div\b|<\/div>/g; re.lastIndex = wrap; let m;
      while ((m = re.exec(head))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) { i = m.index + 6; break; } }
      const c = post.heroImage.credit;
      const credit = `<div style="width:100%;padding:10px 0 0;text-align:right"><p class="framer-text framer-styles-preset-ry8ix7" data-styles-preset="YAPoH_BCZ" style="--framer-text-color:rgb(131, 139, 158)">Photo: <a class="framer-text" href="${esc(c.url || post.heroImage.page || '#')}" target="_blank" rel="noopener nofollow" style="color:inherit;text-decoration:underline">${esc(c.name)}</a>${post.heroImage.provider ? ` on ${esc(post.heroImage.provider === 'pexels' ? 'Pexels' : post.heroImage.provider)}` : ''}</p></div>`;
      head = head.slice(0, i) + credit + head.slice(i);
    }
  }
  html = html.slice(0, s1) + head + html.slice(s3);

  // ---- body
  ({ s2, s3 } = sections(html));
  let body = renderBlocks(post.blocks);
  if (post.faqs?.length) {
    body += `<h2 class="framer-text framer-styles-preset-141sbpv">Frequently asked questions</h2>`;
    body += post.faqs.map((f) => `<h3 class="framer-text framer-styles-preset-1b5aq58">${inline(f.q)}</h3><p class="${P}">${inline(f.a)}</p>`).join('');
  }
  html = replaceRichText(html, s2, s3, body);
  return html;
}

export function writePost(post) {
  const dir = path.join(ROOT, 'blog', post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderPost(post));
}

/* ------------------------------------------------------- blog index */
// Rebuilds the card grid on blog/index.html: Framer's own cards (cached the
// first time we see a fresh import) plus the generated ones, newest first,
// the first card in the wide slot. Only PAGE_SIZE cards ship in the HTML; the
// rest are written as /blog-cards/<n>.json fragments that the "Load More"
// button appends client-side, so the live site never queries the database.
export const PAGE_SIZE = Number(process.env.BLOG_PAGE_SIZE) || 9;
const CARD_RE = /<div class="ssr-variant"><div class="framer-1sivl9o-container"[^>]*>[\s\S]*?<\/a><!--\/\$--><\/div><\/div>/g;
const SPAN1 = '--1q1styz:span 1;--1xlim7f:span 1;--7ad6xv:span 1';

function gridBounds(html) {
  const start = html.indexOf('<div class="framer-2ewk8">');
  if (start < 0) throw new Error('blog index grid not found');
  let depth = 0, end = -1;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) { end = m.index; break; } }
  return { start: start + '<div class="framer-2ewk8">'.length, end };
}
function parseCardDate(wrapper) {
  const m = wrapper.match(/data-framer-name="Date"[^>]*>[\s\S]*?<p[^>]*>([^<]*)<\/p>/);
  const d = m ? new Date(m[1].trim() + ' UTC') : null;
  return d && !isNaN(d) ? d.toISOString().slice(0, 10) : '1970-01-01';
}
function withSpan(wrapper, style) {
  return wrapper.replace(/<div class="framer-1sivl9o-container"(?: style="[^"]*")?>/, `<div class="framer-1sivl9o-container" style="${style}">`);
}

export function injectIndexCards(posts) {
  const p = path.join(ROOT, 'blog', 'index.html');
  const cachePath = path.join(CONTENT, 'framer-cards.json');
  let html = fs.readFileSync(p, 'utf8');
  let { start, end } = gridBounds(html);
  const inner = html.slice(start, end);

  // Framer's cards + the "Load More" block: read them from a fresh import, else from the cache.
  let cache = readJson(cachePath, null);
  if (!inner.includes('<!--gen:grid-->') || !cache) {
    const clean = inner.replace(/<!--gen:start-->[\s\S]*?<!--gen:end-->/, '');
    const wrappers = (clean.match(CARD_RE) || []).filter((w) => !w.includes('data-generated="1"'));
    const lastEnd = clean.lastIndexOf(wrappers[wrappers.length - 1]) + wrappers[wrappers.length - 1].length;
    const wideStyle = wrappers[0].match(/<div class="framer-1sivl9o-container" style="([^"]*)"/)?.[1] || '--1q1styz:span 2;--1xlim7f:span 2;--7ad6xv:span 1';
    cache = {
      wideStyle,
      loadMore: clean.slice(lastEnd),
      cards: wrappers.map((w) => ({ date: parseCardDate(w), html: withSpan(w, SPAN1) })),
    };
    writeJson(cachePath, cache);
  }

  // Generated cards, rendered from a regular Framer card as template.
  const tpl = cache.cards.find((c) => c.html.includes('data-framer-name="Label"'))?.html || cache.cards[0].html;
  const generated = posts.filter((x) => x.source === 'generated').map((post) => {
    const img = heroInfo(post);
    let c = tpl.replace(/href="[^"]*"/, `href="/blog/${post.slug}" data-generated="1"`);
    const i = c.indexOf('<img'), j = c.indexOf('>', i) + 1;
    c = c.slice(0, i) + setImg(c.slice(i, j), img, post.imageAlt || post.title) + c.slice(j);
    let metaSeen = 0;
    const src = c;
    c = c.replace(/(<p class="framer-text framer-styles-preset-(ry8ix7|i7193b|1wdsr2i)"[^>]*>)[^<]*(<\/p>)/g, (m, a, cls, b, offset) => {
      if (cls === 'i7193b') return `${a}${esc(post.title)}${b}`;
      if (cls === '1wdsr2i') return `${a}${esc(post.excerpt)}${b}`;
      const ctx = src.slice(Math.max(0, offset - 2500), offset);
      const name = [...ctx.matchAll(/data-framer-name="(Label|Metadata|Date)"/g)].pop()?.[1];
      if (name === 'Label') return `${a}${esc(post.category || 'Guide')}${b}`;
      if (name === 'Date') return `${a}${fmtDate(post.date)}${b}`;
      if (name === 'Metadata') return `${a}${metaSeen++ === 0 ? esc(post.author || AUTHOR.name) : `${post.readMinutes || 5} Min Read `}${b}`;
      return m;
    });
    return { date: post.date, html: c };
  });

  const all = [...generated, ...cache.cards].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  // Latest article: full-width hero card using the component's horizontal
  // variant (image left, text right). Framer's own layout left a gap next to
  // its two-column card; spanning the whole row avoids that. site.css stacks
  // it vertically on phones.
  if (all.length) {
    let hero = withSpan(all[0].html, '--1q1styz:span 3;--1xlim7f:span 2;--7ad6xv:span 1');
    hero = hero.replace('<div class="framer-1sivl9o-container"', '<div class="framer-1sivl9o-container lk-featured"');
    hero = hero.replace(/(<a class="[^"]*?)framer-v-qyvjkd/, '$1framer-v-nzwxgq');
    all[0] = { ...all[0], html: hero };
  }
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const first = all.slice(0, PAGE_SIZE).map((c) => c.html).join('');

  // Fragments for pages 2..n
  const fragDir = path.join(ROOT, 'public', 'blog-cards');
  fs.rmSync(fragDir, { recursive: true, force: true });
  if (pages > 1) {
    fs.mkdirSync(fragDir, { recursive: true });
    for (let n = 2; n <= pages; n++) writeJson(path.join(fragDir, `${n}.json`), { page: n, pages, html: all.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE).map((c) => c.html).join('') });
  }

  // "Load More" block: hook for main.js, hidden when everything is already shown.
  let loadMore = cache.loadMore.replace(/<div class="(framer-[a-z0-9]+-container)"([^>]*)>/, (m, cls, attrs) => {
    const style = attrs.match(/style="([^"]*)"/)?.[1];
    const rest = attrs.replace(/\s*style="[^"]*"/, '');
    const hidden = pages > 1 ? '' : 'display:none;';
    return `<div class="${cls}"${rest} id="lk-load-more" data-pages="${pages}" style="${hidden}${style || ''}">`;
  });

  html = html.slice(0, start) + '<!--gen:grid-->' + first + loadMore + html.slice(end);
  fs.writeFileSync(p, html);
}

/* --------------------------------------------------------- sitemap */
export function updateSitemap(posts) {
  const p = path.join(ROOT, 'public', 'sitemap.xml');
  let xml = fs.readFileSync(p, 'utf8');
  for (const post of posts.filter((x) => x.source === 'generated')) {
    const loc = `${SITE}/blog/${post.slug}`;
    const entry = `  <url><loc>${loc}</loc><lastmod>${post.updated || post.date}</lastmod></url>\n`;
    xml = xml.includes(`<loc>${loc}</loc>`) ? xml.replace(new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</loc>[^\\n]*\\n`), entry) : xml.replace('</urlset>', entry + '</urlset>');
  }
  fs.writeFileSync(p, xml);
}
