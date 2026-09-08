// Pulls every published article from the blog database (Supabase) and renders
// it into the site: blog/<slug>/index.html, a card on the blog index, and the
// sitemap. Removes pages for articles that are no longer published.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  required
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CONTENT, readJson, writeJson, writePost, injectIndexCards, updateSitemap } from './lib.mjs';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'); process.exit(1); }

const res = await fetch(`${url}/rest/v1/blog_posts?status=eq.published&source=neq.framer&select=*&order=published_at.desc`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) { console.error('supabase error', res.status, await res.text()); process.exit(1); }
const rows = await res.json();

const pool = readJson(path.join(CONTENT, 'images.json'), []);
const poolIds = new Set(pool.map((p) => p.id));
const registry = readJson(path.join(CONTENT, 'posts.json'), []);
const framer = registry.filter((p) => p.source !== 'generated');
const before = new Set(registry.filter((p) => p.source === 'generated').map((p) => p.slug));

const generated = rows.map((r) => ({
  slug: r.slug, title: r.title, description: r.description, excerpt: r.excerpt,
  date: r.published_at || r.created_at.slice(0, 10), updated: (r.updated_at || '').slice(0, 10) || undefined,
  image: poolIds.has(r.hero_image_id) ? r.hero_image_id : pool[0]?.id, imageAlt: r.hero_image_alt || r.title,
  words: r.word_count, source: 'generated', keyword: r.keyword, category: r.category,
  readMinutes: r.read_minutes, author: r.author_name,
  blocks: r.blocks || [], faqs: r.faqs || [],
}));

fs.mkdirSync(path.join(CONTENT, 'posts'), { recursive: true });
for (const post of generated) {
  writeJson(path.join(CONTENT, 'posts', post.slug + '.json'), { blocks: post.blocks, faqs: post.faqs });
  writePost(post);
}
// Unpublished or deleted since last run: remove their pages.
const now = new Set(generated.map((p) => p.slug));
for (const slug of before) {
  if (now.has(slug)) continue;
  fs.rmSync(path.join(ROOT, 'blog', slug), { recursive: true, force: true });
  fs.rmSync(path.join(CONTENT, 'posts', slug + '.json'), { force: true });
  console.log('removed /blog/' + slug);
}
const posts = [...framer, ...generated.map(({ blocks, faqs, ...meta }) => meta)];
writeJson(path.join(CONTENT, 'posts.json'), posts);
injectIndexCards(posts);
updateSitemap(posts);
// Sitemap entries for removed posts
const sm = path.join(ROOT, 'public', 'sitemap.xml');
let xml = fs.readFileSync(sm, 'utf8');
for (const slug of before) if (!now.has(slug)) xml = xml.replace(new RegExp(`  <url><loc>https://www.linkable.link/blog/${slug}</loc>[^\\n]*\\n`), '');
fs.writeFileSync(sm, xml);
console.log(`synced ${generated.length} published article(s): ${generated.map((p) => p.slug).join(', ') || 'none'}`);
