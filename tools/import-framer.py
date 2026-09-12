#!/usr/bin/env python3
"""Convert Framer SSR snapshots of linkable.link into static Vite pages.

Usage: python3 tools/import-framer.py <snapshot_dir>
snapshot_dir holds index.html + page_*.html fetched from the live site.
"""
import html, json, os, re, sys, posixpath

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP = sys.argv[1]
ASSETMAP = json.load(open(os.path.join(ROOT, 'tools/assetmap.json')))
# SVG symbol sprite that Framer's runtime used to inject at hydration (<use href="#id">).
SVG_SPRITE = open(os.path.join(ROOT, 'tools/svg-templates.html'), encoding='utf-8').read()

PAGES = {  # snapshot file -> site url path
    'index.html': '/',
    'page_pricing.html': '/pricing',
    'page_creators.html': '/creators',
    'page_contact.html': '/contact',
    'page_blog.html': '/blog',
    'page_legal_privacy-policy.html': '/legal/privacy-policy',
    'page_legal_terms-of-service.html': '/legal/terms-of-service',
    'page_blog_creator-activation-playbook.html': '/blog/creator-activation-playbook',
    'page_blog_launch-campaign-linkable.html': '/blog/launch-campaign-linkable',
    'page_blog_leaked-discount-codes.html': '/blog/leaked-discount-codes',
    'page_blog_onboard-first-creators.html': '/blog/onboard-first-creators',
    'page_blog_tiktok-shop-vs-driving-traffic-to-shopify.html': '/blog/tiktok-shop-vs-driving-traffic-to-shopify',
    'page_blog_creator-partnerships-that-sell.html': '/blog/creator-partnerships-that-sell',
    'page_404.html': '/404',
}
# Pages written somewhere other than <url>/index.html (Vercel serves 404.html for unknown routes).
OUTPUT_OVERRIDE = {'/404': '404.html'}

# longest URLs first so "x.png?scale-down-to=512" wins over "x.png"
URLS = sorted(ASSETMAP, key=len, reverse=True)

def localize_assets(t):
    for u in URLS:
        loc = '/assets/' + ASSETMAP[u]
        t = t.replace(html.escape(u, quote=True), loc).replace(u, loc)
    return t

def resolve_links(t, page_url):
    # Standard URL semantics: relative links resolve against the page's directory
    # (/pricing -> /, /legal/privacy-policy -> /legal/, /blog/post -> /blog/).
    base = page_url.rsplit('/', 1)[0] + '/'
    def fix(m):
        href = m.group(1)
        if href.startswith('./') or href.startswith('../'):
            target = posixpath.normpath(posixpath.join(base, href))
            if target != '/': target = target.rstrip('/')
            return f'href="{target}"'
        return m.group(0)
    return re.sub(r'href="([^"]*)"', fix, t)

LINK_FIXES = {  # visible button text -> (href, target)
    'Log In': ('https://app.linkable.link/auth/login', '_blank'),
    'Sign Up': ('https://apps.shopify.com/linkable-1', '_blank'),
    'Start free trial': ('https://apps.shopify.com/linkable-1', '_blank'),
    'Start for free': ('https://apps.shopify.com/linkable-1', '_blank'),
    'Get started': ('https://apps.shopify.com/linkable-1', '_blank'),
}

def fix_missing_hrefs(t):
    def fix(m):
        tag = m.group(0)
        if 'href=' in tag:
            return tag
        rest = t[m.end():m.end() + 3000]
        rest = rest[:rest.find('</a>')]
        text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', rest)).strip()
        if text in LINK_FIXES:
            href, target = LINK_FIXES[text]
            return tag[:-1] + f' href="{href}" target="{target}" rel="noopener">'
        return tag
    return re.sub(r'<a\b[^>]*>', fix, t)

# Tags Framer hard-codes in the <head>, matched by what they load rather than by
# their surrounding markup, which Framer rewrites freely. Each becomes a parked
# <script type="text/plain" data-consent="..."> that browsers will not execute;
# src/consent.js revives the ones the visitor allows. Categories must match the
# ones consent.js offers.
GATED = [
    ('googletagmanager\\.com/gtm\\.js', 'analytics'),   # Google Tag Manager loader
    ('connect\\.facebook\\.net', 'marketing'),          # Meta pixel + its PageView/Schedule
]

def park_tracking(t, src):
    """Stop the analytics and advertising tags running before there is consent."""
    parked = 0

    def park(m):
        nonlocal parked
        tag = m.group(0)
        if 'data-consent=' in tag:
            return tag
        for pattern, category in GATED:
            if re.search(pattern, tag):
                parked += 1
                open_tag = re.match(r'<script\b[^>]*>', tag).group(0)
                rest = tag[len(open_tag):]
                open_tag = re.sub(r'\s+type="[^"]*"', '', open_tag)
                open_tag = open_tag[:-1] + f' type="text/plain" data-consent="{category}">'
                return open_tag + rest
        return tag

    body_start = t.find('<body')
    head, body = t[:body_start], t[body_start:]
    head = re.sub(r'<script\b[^>]*>.*?</script>', park, head, flags=re.S)
    # The GTM <noscript> iframe cannot be gated: it needs no JavaScript, so it
    # would load Google's frame for a visitor who has consented to nothing and
    # who has no way to consent either. Dropping it is the only correct option;
    # it only ever existed as a fallback for scriptless browsers.
    body, dropped = re.subn(
        r'<noscript><iframe src="https://www\.googletagmanager\.com/ns\.html[^>]*></iframe></noscript>',
        '', body)
    t = head + body

    leftover = re.search(r'<script(?![^>]*text/plain)[^>]*>(?:(?!</script>).)*?'
                         r'(?:googletagmanager\.com/gtm\.js|connect\.facebook\.net)', t, re.S)
    assert not leftover, (
        f'{os.path.basename(src)}: a tracking tag escaped the consent gate near '
        f'{leftover.group(0)[-90:]!r}. Add its pattern to GATED before shipping.')
    return t


def convert(src, page_url):
    t = open(src, encoding='utf-8').read()
    # --- head cleanup -------------------------------------------------------
    # malformed comments in the Framer source
    t = t.replace('<!-- End Google Tag Manager →', '<!-- End Google Tag Manager -->')
    t = t.replace('<!-- Google Tag Manager (<!-- Google Tag Manager (noscript) -->', '<!-- Google Tag Manager (noscript) -->')
    t = re.sub(r'<!-- Made in Framer[^>]*-->\s*', '', t)
    t = re.sub(r'<!-- Published [^>]*-->\s*', '', t)
    t = t.replace(' data-redirect-timezone="1"', '')
    t = re.sub(r'<script>try\{if\(localStorage\.getItem\("__framer_force_showing_editorbar_since"\)\).*?</script>\s*', '', t, flags=re.S)
    t = re.sub(r'<meta name="generator" content="Framer[^"]*">\s*', '', t)
    t = re.sub(r'<meta name="framer-search-index[^"]*" content="[^"]*">\s*', '', t)
    t = re.sub(r'<link rel="modulepreload"[^>]*>\s*', '', t)
    t = re.sub(r'<link href="https://fonts\.gstatic\.com" rel="preconnect" crossorigin>\s*', '', t)
    t = re.sub(r'<script async src="https://events\.framer\.com/[^"]*"[^>]*></script>\s*', '', t)
    t = re.sub(r'<script type="module" async data-framer-bundle[^>]*></script>\s*', '', t)
    # --- body cleanup -------------------------------------------------------
    t = re.sub(r'<script type="framer/[^"]*"[^>]*>.*?</script>', '', t, flags=re.S)
    t = re.sub(r'<script[^>]*data-framer-hydrate[^>]*>.*?</script>', '', t, flags=re.S)
    t = re.sub(r' data-framer-hydrate-v2="[^"]*"', '', t)
    t = re.sub(r' data-framer-ssr-released-at="[^"]*"', '', t)
    t = re.sub(r' data-framer-page-optimized-at="[^"]*"', '', t)
    # inline framer helper scripts (nested links, framer_variant, process.env, hydrate json)
    body_start = t.find('<body')
    head, body = t[:body_start], t[body_start:]
    body = re.sub(r'<script(?![^>]*googletagmanager)[^>]*>.*?</script>', '', body, flags=re.S)
    t = head + body
    # --- consent gate -------------------------------------------------------
    t = park_tracking(t, src)
    # --- assets & links -----------------------------------------------------
    t = localize_assets(t)
    t = resolve_links(t, page_url)
    # --- link fixes ---------------------------------------------------------
    # Some CTA buttons were exported by Framer without an href (the live site
    # has the same bug). Give them the target their siblings use.
    t = fix_missing_hrefs(t)
    # --- our runtime --------------------------------------------------------
    t = t.replace('</head>', '    <link rel="stylesheet" href="/src/site.css">\n    <script type="module" src="/src/main.js"></script>\n</head>')
    t = t.replace('</body>', SVG_SPRITE + '\n</body>')
    assert 'framerusercontent.com' not in t, f'leftover framer url in {src}: ' + re.search(r'https://framerusercontent\.com[^"\')\s]*', t).group(0)
    return t

for f, url in PAGES.items():
    src = os.path.join(SNAP, f)
    if not os.path.exists(src):
        print('missing', src); continue
    out = os.path.join(ROOT, OUTPUT_OVERRIDE.get(url, 'index.html' if url == '/' else url.strip('/') + '/index.html'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    result = convert(src, url)
    open(out, 'w', encoding='utf-8').write(result)
    print('wrote', os.path.relpath(out, ROOT))

# The cookie policy is a fourth legal page that Framer does not have, built from
# the privacy policy shell so it inherits the chrome. Rebuild it here so it tracks
# any restyle of the Framer legal template instead of drifting away from it.
import subprocess
cookie_policy = os.path.join(ROOT, 'tools/build-cookie-policy.py')
if os.path.exists(cookie_policy):
    subprocess.run(['python3', cookie_policy], check=True)

# Generated blog posts live outside Framer: re-render them and restore their
# cards in the blog index (the import just overwrote blog/index.html).
if os.path.exists(os.path.join(ROOT, 'tools/blog/render.mjs')):
    subprocess.run(['node', os.path.join(ROOT, 'tools/blog/render.mjs')], check=True)

# Framer's CDN transcodes images per request; a static copy cannot, so this
# writes WebP beside each photograph and wraps the <img> in a <picture>. Skipped
# without cwebp, which only costs page weight, never correctness.
if subprocess.run(['which', 'cwebp'], capture_output=True).returncode == 0:
    subprocess.run(['python3', os.path.join(ROOT, 'tools/optimise-images.py')], check=True)
else:
    print('cwebp not installed; skipping image optimisation (brew install webp)')
