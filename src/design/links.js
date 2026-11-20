// Source tags on the links that leave this site for the app's sign up.
//
// The app records where a new account first came from (signup_attributions):
// the utm_* parameters and the ad click id on the first page it serves. A plain
// link from this site says only "came from linkable.link", so every sign-up
// link carries which page it was on:
//
//   utm_source=website  utm_medium=cta  utm_campaign=<page key: home, pricing…>
//
// A visitor who arrived here from a campaign of ours (an ad, an email, a post
// with its own utm_* or click id) keeps that instead: the campaign is the
// answer to "where did they come from", not the page they clicked on. Those
// parameters ride along in the address as the visitor moves between pages, on
// the site's own links. Nothing is written to the visitor's device for this
// (no cookie, no storage); it is only what the address already says.
//
// One function serves both renders. render.js calls it for every href, so the
// static pages (tools/design/build.mjs) carry the website tags, and the
// browser runtime, which re-renders the template on every state change,
// writes the same links, or the visitor's campaign once it knows it. A string
// replace over the built HTML would be undone by the first re-render; a patch
// to the templates would be lost at the next design import.
//
// The box under a blog article sets its own tags (postCta in build.mjs:
// utm_source=blog and the article's slug). A link that already names a source
// is left exactly as it is.

// The names the app reads (linkable client, lib/server/signup_attribution.ts).
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
export const CLICK_IDS = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid', 'twclid', 'li_fat_id', 'sccid', 'epik'];

const SIGNUP = /^https:\/\/app\.linkable\.link\/auth\/(?:brand\/sign-up|signup)(?=$|[?#])/;
// A page of this site: "/", "/pricing", "/blog/some-post", with or without a
// #section. Not a file under /assets, not a protocol-relative address.
const OWN_PAGE = /^\/(?!\/|assets\/)[\w\-/]*(?:#[\w-]*)?$/;
const MAX = 150; // as long as the app keeps

/**
 * The campaign a visitor arrived with, from the page's query string
 * ("?utm_source=…&fbclid=…"): only the names above, empty when there is none.
 */
export function incomingSource(search) {
  const out = {};
  let q;
  try { q = new URLSearchParams(search || ''); } catch { return out; }
  for (const k of [...UTM_KEYS, ...CLICK_IDS]) {
    const v = (q.get(k) || '').trim().slice(0, MAX);
    if (v) out[k] = v;
  }
  return out;
}

const withParams = (href, params) => {
  const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
  const base = hash ? href.slice(0, href.indexOf('#')) : href;
  const q = new URLSearchParams(params).toString();
  return base + (base.includes('?') ? '&' : '?') + q + hash;
};

/**
 * href as it should be written on `page` for a visitor who arrived with
 * `incoming` (see incomingSource; leave it out at build time).
 */
export function tagLink(href, page, incoming = {}) {
  if (typeof href !== 'string') return href;
  const arrived = Object.keys(incoming).length > 0;
  if (SIGNUP.test(href)) {
    if (/[?&]utm_source=/.test(href)) return href; // the post box: its own tags stand
    const hasUtm = UTM_KEYS.some((k) => incoming[k]);
    // A click id alone (an ad with no utm_* on it) still lands on this page.
    const tags = hasUtm ? {} : { utm_source: 'website', utm_medium: 'cta', utm_campaign: page };
    return withParams(href, { ...tags, ...incoming });
  }
  if (arrived && OWN_PAGE.test(href)) return withParams(href, incoming);
  return href;
}
