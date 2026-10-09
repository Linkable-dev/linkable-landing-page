// Re-render the blog (index and every post) from the committed content cache
// and refresh the sitemap. No database access; sync.mjs is the online version.
import path from 'node:path';
import { CONTENT, readJson, updateSitemap } from './lib.mjs';
import { buildBlog } from '../design/build.mjs';

const posts = readJson(path.join(CONTENT, 'posts.json'), []);
const n = await buildBlog();
updateSitemap(posts);
console.log(`rendered the blog index and ${n} post(s), sitemap updated`);
