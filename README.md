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
| `/blog/<slug>` (6 posts) | `blog/<slug>/index.html` |
| not-found page | `404.html` (served by Vercel for unknown routes) |

All media lives in `public/assets/images` and every font in `public/assets/fonts`. `public/sitemap.xml` and
`public/robots.txt` list the public pages; update the sitemap when adding a page.

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

The contact form and the newsletter box POST to `api/form.js`, a Vercel serverless function that emails each
submission to `federico@linkable.link` through Resend. Environment variables on the Vercel project:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | Resend API key (the linkable.link domain is verified in that Resend account) |
| `FORM_TO` | optional, recipient (default `federico@linkable.link`) |
| `FORM_FROM` | optional, sender (default `Linkable website <noreply@linkable.link>`) |

If the function is unavailable the page falls back to opening the visitor's mail client, addressed to
`federico@linkable.link`. To use another backend instead, set `VITE_FORM_ENDPOINT` at build time (the forms
POST JSON `{ ...fields, form: "contact" | "newsletter", page }`).

## Re-importing from Framer

Note: Framer occasionally serves a blog post client-side only (empty server HTML, ~37 KB). If that happens, rebuild
that post from a previous full snapshot with the current shared header and footer, or wait for Framer to
server-render it again.

`tools/import-framer.py` converts fresh snapshots of the Framer site into these pages: it strips the Framer runtime,
localises every asset via `tools/assetmap.json`, resolves internal links and injects the SVG icon sprite
(`tools/svg-templates.html`, which Framer only adds at hydration).

```bash
python3 tools/import-framer.py <directory with index.html and page_*.html snapshots>
```
