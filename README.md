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

The contact form and the newsletter box POST to `api/form.js`, a Vercel serverless function that emails each
submission to `federico@linkable.link` (override with the `FORM_TO` environment variable). The function sends
through SMTP and needs these variables in the Vercel project (Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `SMTP_USER` | the sending mailbox, e.g. `federico@linkable.link` |
| `SMTP_PASS` | its password; for Google Workspace create an App Password (Google Account → Security → 2-Step Verification → App passwords) |
| `SMTP_HOST` / `SMTP_PORT` | optional, default `smtp.gmail.com` / `465` |

Until those are set the function answers 503 and the page falls back to opening the visitor's mail client,
addressed to `federico@linkable.link`. To use another backend instead, set `VITE_FORM_ENDPOINT` at build time
(the forms POST JSON `{ ...fields, form: "contact" | "newsletter", page }`).

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
