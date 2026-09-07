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

export default defineConfig({
  appType: 'mpa',
  plugins: [cleanUrls()],
  build: {
    rollupOptions: { input: findPages(__dirname) },
  },
});
