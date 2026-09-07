# Linkable landing page

Static, dependency-free copy of [linkable.link](https://www.linkable.link/) built with Vite and deployed on Vercel.
The markup, CSS, fonts and images are the originals exported from the Framer site; the Framer runtime has been
replaced by a small native script (`src/main.js`).

## Pages

| Route | File |
| --- | --- |
| `/` | `index.html` |
| `/pricing`, `/creators`, `/contact`, `/blog` | `<route>/index.html` |
| `/legal/privacy-policy`, `/legal/terms-of-service` | `legal/<slug>/index.html` |
| `/blog/<slug>` (5 posts) | `blog/<slug>/index.html` |

All media lives in `public/assets/images` and every font in `public/assets/fonts`.

## Develop / build

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

`vite.config.js` picks up every `*/index.html` automatically (multi-page build) and serves clean URLs in dev.
`vercel.json` enables `cleanUrls` so `/pricing` serves `pricing/index.html` in production. Vercel auto-detects
Vite: build command `vite build`, output directory `dist`.

## What `src/main.js` replaces from Framer

- scroll-in appear animations
- FAQ accordions
- mobile navigation menu (`src/menu-expanded.html` is the expanded markup captured from the live site)
- auto-rotating testimonial slideshows
- "How it works" scroll-linked progress bars
- nested links, dynamic footer year, hover states (`src/site.css`)
- contact and newsletter forms (see below)

## Forms

Framer used to receive form submissions server-side. Set `VITE_FORM_ENDPOINT` (for example a Vercel function or
Formspree URL) and the forms will POST JSON `{ ...fields, form: "contact" | "newsletter", page }` there. Without it
the forms fall back to opening the visitor's mail client, addressed to `FALLBACK_MAILTO` in `src/config.js`.

## Re-importing from Framer

Note: since the Sep 6, 2026 republish Framer serves three older blog posts client-side only (empty server HTML).
Their pages here were rebuilt from the previous full snapshots with the current shared header and footer.

`tools/import-framer.py` converts fresh snapshots of the Framer site into these pages: it strips the Framer runtime,
localises every asset via `tools/assetmap.json`, resolves internal links and injects the SVG icon sprite
(`tools/svg-templates.html`, which Framer only adds at hydration).

```bash
python3 tools/import-framer.py <directory with index.html and page_*.html snapshots>
```
