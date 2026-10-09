// Shared helpers for the blog: post content to HTML, images, dates and the
// sitemap. The pages themselves are rendered by tools/design/build.mjs from the
// design's Blog and Post templates.
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
export const wordCount = (blocks) => blocks.reduce((n, b) => n + (b.text ? b.text.split(/\s+/).length : 0) + (b.items ? b.items.join(' ').split(/\s+/).length : 0), 0);

// "8 Oct 2026", the design's format. Spelled out rather than left to
// toLocaleDateString, whose en-GB output for September changed to "Sept"
// between ICU versions.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* -------------------------------------------------------------- images */
// A pool image by its Framer asset id, with every downscaled copy as srcset.
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

// The picture for a post: its own photo (downloaded into public/assets/blog by
// sync.mjs, or taken from the Framer page for the original articles) or one of
// the pool images by id. `src` is the largest file under 2000px, which is what
// browsers without srcset and social cards get.
export function heroInfo(post) {
  if (post.heroImage?.files?.length) {
    const files = [...post.heroImage.files].sort((a, b) => a.w - b.w);
    const big = files.filter((f) => f.w <= 2000).pop() || files[0];
    return {
      src: big.path,
      srcset: files.map((f) => `${f.path} ${f.w}w`).join(','),
      width: big.w,
      height: Math.round(big.w * (post.heroImage.height / post.heroImage.width)),
    };
  }
  return imageInfo(post.image);
}

/* ---------------------------------------------------- inline markdown */
const ALLOWED_INTERNAL = /^\/(pricing|creators|contact|autopilot|blog(\/[a-z0-9-]+)?)$/;
const ALLOWED_EXTERNAL = /^https:\/\/(apps\.shopify\.com\/linkable-1|app\.linkable\.link\/)/;
export function inline(text) {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    url = url.replace(/&amp;/g, '&');
    if (ALLOWED_INTERNAL.test(url)) return `<a href="${esc(url)}">${label}</a>`;
    if (ALLOWED_EXTERNAL.test(url)) return `<a href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
    return label; // unknown destination: keep the words, drop the link
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

/* ------------------------------------------------------- body blocks */
// Article HTML for the design's .ps-body, plus the h2 outline for its table of
// contents. The first paragraph is the lead, as in the design.
export function renderArticle(blocks, faqs = []) {
  const toc = [];
  const ids = new Set();
  const anchor = (text) => {
    let id = slugify(text.replace(/\*|\[|\]\([^)]*\)/g, '')) || 'section';
    for (let n = 2; ids.has(id); n++) id = `${slugify(text)}-${n}`;
    ids.add(id);
    return id;
  };
  const h2 = (text) => {
    const id = anchor(text);
    toc.push({ id, label: text.replace(/\*\*|\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') });
    return `<h2 id="${id}">${inline(text)}</h2>`;
  };
  let lead = true;
  const html = blocks.map((b) => {
    switch (b.type) {
      case 'h2': return h2(b.text);
      case 'h3': return `<h3>${inline(b.text)}</h3>`;
      case 'quote': return `<blockquote><p>${inline(b.text)}</p></blockquote>`;
      case 'ul':
      case 'ol': return `<${b.type}>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${b.type}>`;
      default: {
        const cls = lead ? ' class="ps-lead"' : '';
        lead = false;
        return `<p${cls}>${inline(b.text)}</p>`;
      }
    }
  });
  if (faqs.length) {
    html.push(h2('Frequently asked questions'));
    for (const f of faqs) html.push(`<h3>${inline(f.q)}</h3><p>${inline(f.a)}</p>`);
  }
  return { html: html.join(''), toc };
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
