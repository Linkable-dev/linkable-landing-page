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

// Link previews need absolute image URLs, and they must load from the domain
// that actually serves this build. The pages are written for
// https://www.linkable.link, which still serves the Framer site, so its
// /assets/... paths 404 there. On Vercel, rewrite asset URLs and og:url to the
// project's production domain (VERCEL_PROJECT_PRODUCTION_URL, the shortest
// production domain, which becomes www.linkable.link by itself once that domain
// points here). SITE_ORIGIN overrides it. Canonical links stay on
// www.linkable.link on purpose: that is the address search engines should keep.
function assetOrigin() {
  const env = process.env.SITE_ORIGIN || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  const origin = env && env.replace(/\/$/, '');
  return {
    name: 'asset-origin',
    transformIndexHtml(html) {
      if (!origin || origin === 'https://www.linkable.link') return html;
      return html
        .replaceAll('https://www.linkable.link/assets/', origin + '/assets/')
        .replace(/(<meta property="og:url" content=")https:\/\/www\.linkable\.link/, '$1' + origin);
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
