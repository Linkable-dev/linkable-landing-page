import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, statSync, existsSync } from 'node:fs';

// Every */index.html in the project (except node_modules/dist/public) is a page.
function findPages(dir, base = '') {
  const pages = {};
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'public', 'src', 'tools', '.git'].includes(name)) continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) Object.assign(pages, findPages(full, base ? `${base}/${name}` : name));
  }
  if (existsSync(resolve(dir, 'index.html'))) pages[base || 'index'] = resolve(dir, 'index.html');
  if (!base && existsSync(resolve(dir, '404.html'))) pages['404'] = resolve(dir, '404.html'); // Vercel's custom not-found page
  return pages;
}

// Dev-only: serve /pricing as /pricing/index.html (Vercel's cleanUrls does this in production).
function cleanUrls() {
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url.split('?')[0];
        if (!path.includes('.') && path !== '/' && existsSync(resolve(__dirname, '.' + path, 'index.html'))) {
          req.url = path.replace(/\/$/, '') + '/index.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
        }
        next();
      });
    },
  };
}

// Link previews need absolute image URLs, and they must load from a domain
// that serves this build. The pages are written for https://www.linkable.link,
// which still serves the Framer site, so its /assets/... paths 404 there and
// previews show an empty box. Asset URLs and og:url are therefore rewritten at
// build time to ORIGIN: SITE_ORIGIN if set, else the project's vercel.app
// domain, which keeps serving this site before and after the domain switch.
// (Vercel's VERCEL_PROJECT_PRODUCTION_URL was tried first; on this project it
// did not produce a working origin.) Once www.linkable.link points here, set
// SITE_ORIGIN=https://www.linkable.link on the Vercel project to switch the
// rewrite off. Canonical links stay on www.linkable.link throughout: that is
// the address search engines should keep.
const ORIGIN = (process.env.SITE_ORIGIN || 'https://linkable-landing-page.vercel.app').replace(/\/$/, '');

function assetOrigin() {
  return {
    name: 'asset-origin',
    transformIndexHtml(html) {
      if (ORIGIN === 'https://www.linkable.link') return html;
      return html
        .replaceAll('https://www.linkable.link/assets/', ORIGIN + '/assets/')
        .replace(/(<meta property="og:url" content=")https:\/\/www\.linkable\.link/, '$1' + ORIGIN);
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [cleanUrls(), assetOrigin()],
  build: {
    rollupOptions: { input: findPages(__dirname) },
  },
});
