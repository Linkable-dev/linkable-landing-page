# Linkable landing page

Static marketing site for [linkable.link](https://www.linkable.link/), built with Vite and deployed on Vercel.
Every page is rendered from the Claude Design export of the site (`linkable-site.zip`) into plain HTML, with a
small vanilla JavaScript runtime for the interactions. There is no framework and nothing from Framer is left.

## Pages

| Route | File | Template (`src/design/pages/`) |
| --- | --- | --- |
| `/` | `index.html` | `home` |
| `/creators`, `/pricing`, `/autopilot`, `/contact` | `<route>/index.html` | `creators`, `pricing`, `autopilot`, `contact` |
| `/blog` | `blog/index.html` | `blog` |
| `/blog/<slug>` | `blog/<slug>/index.html` | `post` |
| `/legal/privacy-policy`, `/legal/terms-of-service`, `/legal/cookie-policy` | `legal/<slug>/index.html` | `legal` |
| not-found page | `404.html` (served by Vercel for unknown routes) | `notfound` |

These HTML files are generated; do not edit them by hand. Design media is in `public/assets/site`, blog photos in
`public/assets/blog` and `public/assets/images`, fonts in `public/assets/fonts`. `public/sitemap.xml` and
`public/robots.txt` list the public pages; update the sitemap when adding a page.

## Develop / build

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # no clean URLs here: open /pricing/index.html, not /pricing
```

`vite.config.js` picks up every `*/index.html` automatically (multi-page build) and serves clean URLs in dev.
`vercel.json` enables `cleanUrls` so `/pricing` serves `pricing/index.html` in production. Vercel auto-detects
Vite: build command `vite build`, output directory `dist`.

## How the pages are built

```bash
python3 tools/design/import.py <extracted linkable-site zip>   # design export -> src/design/, public/assets/site
node tools/design/build.mjs                                    # templates + content -> the HTML files above
```

- **Import.** Each design file in the zip's `source/` is a body template (`{{...}}` bindings, `<sc-for>`,
  `<sc-if>`), its styles and a logic class whose `renderVals()` drives every animation and interaction. The
  importer writes them to `src/design/pages/<page>/{template.html,page.css,state.js}`, the styles every page
  shares to `src/design/site.css`, and the media to `public/assets/site`. On the way it patches in the real
  links, the consent module, working forms and data bindings for the blog and legal mock-ups. Every patch
  asserts how often it matched, so a reworked design fails the import rather than shipping a placeholder.
- **Build.** `tools/design/build.mjs` renders each template with `src/design/render.js` at its initial state,
  adds the `<head>` (SEO tags carried over from the old pages, the consent-gated tracking tags in
  `tools/design/tracking.html`, font preloads) and writes the page. Pages fed by content also embed it as JSON.
  `node tools/design/build.mjs static|blog|legal` rebuilds one group.
- **Runtime.** `src/design/entry.js` loads the page's template and logic class, and `src/design/runtime.js`
  re-renders on every state change, patching the live DOM in place so the demo video keeps playing and entry
  animations do not replay. `src/design/actions.js` holds the contact form, the newsletter box and "copy link".
- **Link previews.** Each page has Open Graph and Twitter tags with a 1200x630 card from `public/assets/og/`,
  rendered from the built pages by `node tools/design/og.mjs` (needs Playwright and Chrome, run it by hand when a
  hero changes). Articles use their own hero photo. Absolute URLs are written for `https://www.linkable.link`;
  while that domain still serves Framer, `vite.config.js` rewrites image URLs and `og:url` at build time to
  `https://linkable-landing-page.vercel.app` (or `SITE_ORIGIN` if set), so previews never fetch images from the
  wrong site. When www.linkable.link points at Vercel, set `SITE_ORIGIN=https://www.linkable.link` on the Vercel
  project. Canonical links keep pointing at www.linkable.link.
- **Fonts** are self-hosted (`manrope-*.woff2`, `fraunces-*.woff2`), so no request goes to Google before consent.
- **Cookies.** Pages draw the design's cookie bar; `src/consent.js` keeps the tracking tags parked until the
  visitor accepts, and the footer's "Cookie settings" link (added by the importer) reopens the preferences dialog.

To change copy or layout, edit the template under `src/design/pages/`, or re-run the importer on a new export,
then rebuild.

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

## Blog articles

Articles are stored in the blog Supabase project (tables `blog_posts` / `blog_topics`) and managed from the
Linkable Ops app (Blog section), which also writes one AI-drafted article per day. This repo only renders them:

- `.github/workflows/blog-sync.yml` runs every two hours, on a `blog-publish` repository dispatch from the ops
  app, or manually. It executes `tools/blog/sync.mjs`, which pulls the published rows into the content cache,
  renders the blog index and every post from the design templates, updates `public/sitemap.xml`, removes pages
  for unpublished articles and commits. Vercel deploys the push.
- Repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the blog project).
- `content/blog/posts.json` lists every post and `content/blog/posts/*.json` holds their bodies, so
  `npm run blog:render` rebuilds the blog offline. Six posts predate the database; they were written in Framer and
  `tools/blog/extract-framer-posts.py` converted them once into the same format.
- Hero images: a per-article stock photo chosen in the ops app (downloaded into `public/assets/blog` by the sync,
  with a credit line under the hero), falling back to `content/blog/images.json` (on-brand photos by asset id).
- The sync workflow polls the database every 10 minutes with a two-request fingerprint check
  (`content/blog/sync-state.json`) and only renders when something changed, so edits go live within about 10
  minutes even without a GitHub token.
- The blog index features the newest post and lists the rest twelve at a time ("Show more posts"). The category
  chips are the categories in use, most common first.

## Legal pages

The privacy policy, terms and cookie policy are written in `tools/legal/content.py`, which records the verified
company details. `python3 tools/build-legal.py` turns them into `content/legal/documents.json` and renders them in
the design's legal layout. The design export's own legal copy is not used: it was a draft with the company number
and address left as placeholders.
