// Re-render every generated post from its JSON and refresh the blog index
// cards and sitemap. Run after a Framer re-import (the importer calls it).
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT, readJson, writePost, injectIndexCards, updateSitemap } from './lib.mjs';

const posts = readJson(path.join(CONTENT, 'posts.json'), []);
let n = 0;
for (const meta of posts.filter((p) => p.source === 'generated')) {
  const file = path.join(CONTENT, 'posts', meta.slug + '.json');
  if (!fs.existsSync(file)) continue;
  writePost({ ...meta, ...readJson(file) });
  n++;
}
injectIndexCards(posts);
updateSitemap(posts);
console.log(`rendered ${n} generated post(s), index and sitemap updated`);
