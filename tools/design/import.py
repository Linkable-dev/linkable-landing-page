#!/usr/bin/env python3
"""Import the marketing site from a Claude Design export (the "linkable-site" zip).

    python3 tools/design/import.py <extracted zip dir containing source/ and site/>

Reads the design files in source/ (each one a body template, its styles and a
logic class) and the media in site/assets, and writes

    src/design/site.css                 styles shared by every page + self-hosted fonts
    src/design/pages/<page>/template.html
    src/design/pages/<page>/page.css    the page's own styles
    src/design/pages/<page>/state.js    the page's logic class as an ES module
    public/assets/site/*                every image and video the pages reference

`node tools/design/build.mjs` then renders the pages into the site's HTML files.

Every change the site needs on top of the design (real links, the consent module
in place of the design's localStorage flag, real blog posts and legal text in
place of the mock-ups, working forms) is a patch below that asserts how many
times it matched, so a changed design fails loudly instead of quietly shipping a
placeholder.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if len(sys.argv) != 2:
    sys.exit(__doc__)
SRC = sys.argv[1]
ASSETS_IN = os.path.join(SRC, 'site', 'assets')
ASSETS_OUT = os.path.join(ROOT, 'public', 'assets', 'site')
PAGES_OUT = os.path.join(ROOT, 'src', 'design', 'pages')

# design file -> page key. Terms.dc.html is not imported: it is the same layout
# as Privacy.dc.html, which renders all three legal documents (tools/legal).
PAGES = {
    'Main': 'home',
    'Creators': 'creators',
    'Pricing': 'pricing',
    'Autopilot': 'autopilot',
    'Contact': 'contact',
    'Blog': 'blog',
    'Post': 'post',
    'Privacy': 'legal',
    'NotFound': 'notfound',
}

SHOPIFY = 'https://apps.shopify.com/linkable-1'
APP_LOGIN = 'https://app.linkable.link/auth/login'
APP_SIGNUP = 'https://app.linkable.link/auth/signup'

# Routes of this site in place of the design's file names and placeholders.
LINKS = {
    'Main.dc.html#start': SHOPIFY,
    'Main.dc.html': '/',
    'Creators.dc.html': '/creators',
    'Pricing.dc.html#compare': '/pricing#compare',
    'Pricing.dc.html': '/pricing',
    'Blog.dc.html': '/blog',
    'Contact.dc.html': '/contact',
    'Autopilot.dc.html': '/autopilot',
    'Privacy.dc.html#cookies': '/legal/cookie-policy',
    'Privacy.dc.html': '/legal/privacy-policy',
    'Terms.dc.html': '/legal/terms-of-service',
    '#login': APP_LOGIN,
    '#signup': SHOPIFY,
    '#start': SHOPIFY,
    '#facebook': 'https://www.facebook.com/profile.php?id=61571103328154',
    '#instagram': 'https://www.instagram.com/linkable.link/',
    '#linkedin': 'https://www.linkedin.com/company/joinlinkable/',
}
# The creators page signs creators up in the app, not through the Shopify listing.
LINK_OVERRIDES = {'creators': {'#signup': APP_SIGNUP, '#join': APP_SIGNUP}}
# On pages that have a #start section of their own, the hero buttons still mean
# "start the trial"; the design only used the anchor as a placeholder.

COOKIE_READ = "try { const c = window.localStorage.getItem('lk_cookie'); if (c) this.setState({ cookieDone: true }); } catch (e) {}"
COOKIE_ACCEPT = "cookieAccept: () => { try { window.localStorage.setItem('lk_cookie', 'accepted'); } catch (e) {} this.setState({ cookieDone: true }); },"
COOKIE_REJECT = "cookieReject: () => { try { window.localStorage.setItem('lk_cookie', 'rejected'); } catch (e) {} this.setState({ cookieDone: true }); }"
FOOTER_LEGAL = '<a class="foot-a" href="/legal/terms-of-service" style="margin: 0">Terms of Service</a></span>'

ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>'


def patch(text, old, new, count=1, label=''):
    n = text.count(old)
    assert n == count, f'patch {label or old[:50]!r}: expected {count} match(es), found {n}'
    return text.replace(old, new)


def between(text, start, end, new, label):
    """Replace text[start .. end] (both markers included) with `new`."""
    i = text.find(start)
    assert i >= 0 and text.count(start) == 1, f'{label}: start marker found {text.count(start)} times'
    j = text.find(end, i)
    assert j >= 0, f'{label}: end marker not found'
    return text[:i] + new + text[j + len(end):]


def split(name):
    d = open(os.path.join(SRC, 'source', name + '.dc.html'), encoding='utf-8').read()
    helmet = d[d.find('<helmet>'):d.find('</helmet>')]
    styles = re.findall(r'<style[^>]*>(.*?)</style>', helmet, re.S)
    body = d[d.find('</helmet>') + len('</helmet>'):d.find('<script type="text/x-dc"')]
    body = body[:body.rfind('</x-dc>')].strip('\n')
    logic = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', d, re.S).group(1).strip('\n')
    assert logic.startswith('class Component extends DCLogic'), f'{name}: logic class not where expected'
    return styles, body, logic


# ------------------------------------------------------------- page patches
def home(body, logic):
    # The design references a Meta wordmark the export does not ship; the
    # official one lives in public/assets/brand (outside the folder this
    # importer rewrites).
    body = patch(body, '<img src="/_blob/bb0f4a7197b93d52a0ffa7861af0aedc" alt="Meta"',
                 '<img src="/assets/brand/meta.svg" alt="Meta"', label='meta logo')
    return body, logic


def creators(body, logic):
    # countUp() writes the figure straight into the DOM.
    body = patch(body, '<span class="frn">', '<span class="frn" data-lk-own>', label='count-up')
    return body, logic


def contact(body, logic):
    logic = patch(logic, 'send: () => this.setState({ sent: true }),', 'send: (e) => sendContact(this, e),', label='contact send')
    # A visible line for a failed send; the design only drew the success state.
    body = patch(body, '<p style="margin: 12px 0 0; font-size: 13px; line-height: 1.5; color: #666563">We reply the same day.',
                 '<sc-if value="{{error}}"><p role="alert" style="margin: 12px 0 0; font-size: 14px; line-height: 1.5; color: #B42318">{{error}}</p></sc-if>\n'
                 '<p style="margin: 12px 0 0; font-size: 13px; line-height: 1.5; color: #666563">We reply the same day.', label='contact error')
    body = patch(body, 'onClick="{{send}}" style="margin-top: 20px;', 'onClick="{{send}}" aria-busy="{{busy}}" style="margin-top: 20px;', label='contact busy')
    logic = patch(logic, 'sent: sent, notSent: !sent,',
                  'sent: sent, notSent: !sent, error: (this.state && this.state.error) || null, busy: !!(this.state && this.state.busy),', label='contact state')
    logic = patch(logic, 'asBrand: () => this.setState({ creator: false }),', 'asBrand: () => this.setState({ creator: false, error: null }),')
    logic = patch(logic, 'asCreator: () => this.setState({ creator: true }),', 'asCreator: () => this.setState({ creator: true, error: null }),')
    return body, logic


def blog(body, logic):
    # Featured card: the newest post.
    feat_start = '<a class="bl-feat" href="Post.dc.html">'
    i = body.find(feat_start)
    j = body.find('</a>', i) + 4
    f = body[i:j]
    f = patch(f, feat_start, '<a class="bl-feat" href="{{feat.href}}">')
    f = patch(f, '<img src="/_blob/805a37b5a4a7d21d3c5ca41108d60d5e" alt=""',
              '<img src="{{feat.src}}" srcset="{{feat.srcset}}" sizes="(max-width: 1000px) 100vw, 640px" alt="{{feat.alt}}"')
    f = patch(f, 'Featured</span><span>For brands</span><span>·</span><span>5 min read</span>',
              'Featured</span><span>{{feat.cat}}</span><span>·</span><span>{{feat.mins}}</span>')
    f = patch(f, '>How to run your first gifted creator campaign</h2>', '>{{feat.title}}</h2>')
    f = patch(f, '>From choosing the product to picking creators and reviewing content, a step by step guide to getting your first campaign live.</p>', '>{{feat.ex}}</p>')
    f = patch(f, 'font-weight: 600">Linkable team</span><span style="font-size: 14px; color: #666563">8 Oct 2026</span>',
              'font-weight: 600">{{feat.author}}</span><span style="font-size: 14px; color: #666563">{{feat.date}}</span>')
    body = body[:i] + f + body[j:]
    # Post cards.
    body = patch(body, '<a class="bl-card" href="Post.dc.html">', '<a class="bl-card" href="{{p.href}}">')
    body = patch(body, '<img src="{{p.src}}" alt=""',
                 '<img src="{{p.src}}" srcset="{{p.srcset}}" sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 400px" alt="{{p.alt}}" loading="lazy"')
    # The design shows six mock posts; the real blog grows daily, so it shows a
    # page at a time with a button in the design's ghost style.
    body = patch(body, '</a>\n</sc-for>\n</div>\n</div>\n</section>',
                 '</a>\n</sc-for>\n</div>\n'
                 '<sc-if value="{{moreShow}}"><div style="margin-top: 48px; text-align: center">'
                 '<button type="button" class="btn btn-ghost" onClick="{{showMore}}" style="cursor: pointer; font-family: inherit">Show more posts</button>'
                 '</div></sc-if>\n</div>\n</section>', label='show more')
    # Newsletter.
    body = patch(body, '<input type="email" placeholder="you@example.com" aria-label="Email address" autocomplete="off">',
                 '<input type="email" name="email" id="lk-news-email" placeholder="you@example.com" aria-label="Email address" autocomplete="email" required>')
    body = patch(body, '</div>\n</sc-if>\n<sc-if value="{{subbed}}"',
                 '</div>\n<sc-if value="{{newsError}}"><p role="alert" style="margin: 10px 0 0 16px; font-size: 14px; color: #B42318">{{newsError}}</p></sc-if>\n'
                 '</sc-if>\n<sc-if value="{{subbed}}"', label='newsletter error')
    # Logic: real posts in place of the mock list.
    logic = re.sub(r'const all = \[.*?\n\];', 'const all = pageData().posts;', logic, count=1, flags=re.S)
    assert 'const all = pageData().posts;' in logic, 'blog: mock post list not found'
    logic = patch(logic, "const cat = (this.state && this.state.cat) || 'All posts';",
                  "const cat = (this.state && this.state.cat) || 'All posts';\n"
                  "    const PAGE = 12;\n"
                  "    const limit = (this.state && this.state.limit) || PAGE;\n"
                  "    const inCat = all.filter((p) => cat === 'All posts' || p.cat === cat);")
    logic = patch(logic, "cats: ['All posts', 'For brands', 'For creators'].map((c) => ({ label: c, pick: () => this.setState({ cat: c }),",
                  "feat: pageData().feat,\n      cats: ['All posts', ...pageData().cats].map((c) => ({ label: c, pick: () => this.setState({ cat: c, limit: PAGE }),")
    logic = patch(logic, "posts: all.filter((p) => cat === 'All posts' || p.cat === cat),",
                  "posts: inCat.slice(0, limit),\n"
                  "      moreShow: inCat.length > limit,\n"
                  "      showMore: () => this.setState({ limit: limit + PAGE }),\n"
                  "      newsError: (this.state && this.state.newsError) || null,")
    logic = patch(logic, 'subscribe: () => this.setState({ subbed: true }),', 'subscribe: (e) => subscribe(this, e),')
    return body, logic


def post(body, logic):
    body = patch(body, '<div class="ps-progress" aria-hidden="true"><span></span></div>',
                 '<div class="ps-progress" aria-hidden="true"><span data-lk-own></span></div>')
    body = patch(body, '<span class="bl-tag">For brands</span><span>Guide</span><span>·</span><span>5 min read</span>',
                 '<span class="bl-tag">{{post.cat}}</span><span>Guide</span><span>·</span><span>{{post.mins}}</span>')
    body = patch(body, '>How to run your first gifted creator campaign</h1>', '>{{post.title}}</h1>')
    body = patch(body, '>From choosing the product to reviewing content, a step by step guide to getting your first campaign live.</p>', '>{{post.excerpt}}</p>')
    body = patch(body, 'font-weight: 600">L</span><span style="color: #232323; font-weight: 600">Linkable team</span><span>·</span><span>8 Oct 2026</span>',
                 'font-weight: 600">{{post.initial}}</span><span style="color: #232323; font-weight: 600">{{post.author}}</span><span>·</span><span>{{post.date}}</span>')
    body = patch(body, '<div class="ps-hero"><img src="/_blob/805a37b5a4a7d21d3c5ca41108d60d5e" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block"></div>',
                 '<div class="ps-hero"><img src="{{post.src}}" srcset="{{post.srcset}}" sizes="(max-width: 1240px) 100vw, 1192px" alt="{{post.alt}}" style="width: 100%; height: 100%; object-fit: cover; display: block"></div>\n'
                 # The stock photo licence asks for a credit line.
                 '<sc-if value="{{post.credit}}"><div class="ps-credit">Photo: <a href="{{post.credit.url}}" target="_blank" rel="noopener nofollow">{{post.credit.name}}</a>{{post.credit.on}}</div></sc-if>',
                 label='post hero')
    body = between(body, '<nav class="ps-toc">', '</nav>',
                   '<nav class="ps-toc"><sc-for list="{{toc}}" as="t"><a class="{{t.cls}}" href="#{{t.id}}">{{t.label}}</a></sc-for></nav>', 'post toc')
    body = patch(body, 'href="#share-linkedin"', 'href="{{post.shareLinkedin}}" target="_blank" rel="noopener"')
    body = patch(body, 'href="#share-x"', 'href="{{post.shareX}}" target="_blank" rel="noopener"')
    body = patch(body, 'href="#copy-link" aria-label="Copy link"', 'href="{{post.url}}" onClick="{{copyLink}}" aria-label="{{copyLabel}}"')
    body = between(body, '<article class="ps-body">', '<div class="ps-cta">',
                   '<article class="ps-body">\n<sc-html value="{{post.body}}"></sc-html>\n<div class="ps-cta">', 'post body')
    card = ('<sc-for list="{{related}}" as="r"><a class="bl-card" href="{{r.href}}"><div class="bl-img"><img src="{{r.src}}" srcset="{{r.srcset}}" '
            'sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 400px" alt="{{r.alt}}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block"></div>'
            '<div style="padding: 18px 4px 4px"><div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #666563"><span class="bl-tag">{{r.cat}}</span><span>{{r.mins}}</span></div>'
            '<h3 style="margin: 12px 0 0; font-size: 20px; line-height: 1.3; letter-spacing: -0.02em; font-weight: 500; color: #232323">{{r.title}}</h3></div></a></sc-for>')
    # The design's three related cards share this exact markup; check before swapping them for the loop.
    assert body.count('<a class="bl-card" href="#top"><div class="bl-img">') == 3, 'post: related cards changed'
    body = between(body, '<div class="bl-grid"><a class="bl-card" href="#top">', '</div></a></div>\n',
                   '<div class="bl-grid">' + card + '</div>\n', 'post related')
    logic = patch(logic, "    const toc = {};\n    for (let i = 0; i < 7; i++) toc['toc' + i] = i === t ? 'on' : '';\n    return {\n      ...toc,",
                  "    const { post, related } = pageData();\n"
                  "    const copied = !!(this.state && this.state.copied);\n"
                  "    return {\n"
                  "      post, related,\n"
                  "      toc: post.toc.map((x, i) => ({ ...x, cls: i === t ? 'on' : '' })),\n"
                  "      copyLabel: copied ? 'Link copied' : 'Copy link',\n"
                  "      copyLink: (e) => copyLink(this, e, post.url),", label='post logic')
    return body, logic


def legal(body, logic):
    body = patch(body, '>Privacy Policy</h1>', '>{{doc.title}}</h1>')
    body = patch(body, '>How we collect, use and protect personal data when you use Linkable.</p>', '>{{doc.lede}}</p>')
    body = patch(body, '>Last updated 8 October 2026</div>', '>Last updated {{doc.updated}}</div>')
    body = between(body, '<nav class="lg-toc">', '</nav>',
                   '<nav class="lg-toc"><sc-for list="{{doc.toc}}" as="t"><a href="#{{t.id}}">{{t.label}}</a></sc-for></nav>', 'legal toc')
    # One link per other legal document (the design had one, to the terms).
    body = between(body, '<div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ECEAE5; font-size: 14.5px"><a href="Terms.dc.html"', '</a></div>',
                   '<div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ECEAE5; font-size: 14.5px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px">'
                   '<sc-for list="{{doc.others}}" as="o"><a href="{{o.href}}" style="display: inline-flex; align-items: center; gap: 6px; color: #232323; font-weight: 600; text-decoration: none">{{o.label}}' + ARROW + '</a></sc-for></div>',
                   'legal side links')
    body = between(body, '<article class="lg-body">', '</article>',
                   '<article class="lg-body"><sc-html value="{{doc.body}}"></sc-html></article>', 'legal body')
    logic = patch(logic, 'return {\n      cookieShow:', 'return {\n      doc: pageData().doc,\n      cookieShow:', label='legal logic')
    return body, logic


PAGE_PATCHES = {'home': home, 'creators': creators, 'contact': contact,
                'blog': blog, 'post': post, 'legal': legal}

# Styles added on top of a page's own block, for content the mock-ups did not have.
PAGE_CSS = {
    'post': """
/* --- added for real articles: the mock-up only used h2, p and ul ------------ */
.ps-body h3{margin:36px 0 0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;font-weight:500;color:#232323}
.ps-body ol{margin:16px 0 0;padding:0 0 0 24px;display:flex;flex-direction:column;gap:10px}
.ps-body ol li{padding-left:4px}
.ps-body ol li::before{content:none}
.ps-body ol li::marker{font-weight:600;color:#232323}
.ps-body blockquote{margin:24px 0 0;padding:20px 24px;border-radius:18px;background:#F6F4EF;border:1px solid #ECEAE5;font-size:17px;line-height:1.6;color:#232323}
.ps-body blockquote p{margin:0}
.ps-body strong{font-weight:600;color:#232323}
.ps-body a{color:#232323;text-decoration:underline;text-underline-offset:3px}
.ps-body .ps-cta a{text-decoration:none}
.ps-credit{margin-top:10px;text-align:right;font-size:13px;color:#666563}
.ps-credit a{color:inherit;text-decoration:underline;text-underline-offset:2px}
""",
    'legal': """
/* --- added for the real legal text (h3 subsections, numbered lists, an intro before the first h2) --- */
.lg-body > :first-child{margin-top:0}
.lg-body > p + h2:first-of-type{margin-top:48px}
.lg-body h3{margin:32px 0 0;font-size:19px;line-height:1.35;letter-spacing:-0.01em;font-weight:600;color:#232323}
.lg-body ol{margin:12px 0 0;padding:0 0 0 22px;display:flex;flex-direction:column;gap:8px}
.lg-body strong{font-weight:600;color:#232323}
""",
}

FONTS = """/* Self-hosted copies of the Google Fonts the design links (latin + latin-ext
   subsets). Manrope is a variable font, so one file covers every weight. */
@font-face{font-family:'Manrope';font-style:normal;font-weight:200 800;font-display:swap;src:url(/assets/fonts/manrope-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Manrope';font-style:normal;font-weight:200 800;font-display:swap;src:url(/assets/fonts/manrope-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;src:url(/assets/fonts/fraunces-600-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;src:url(/assets/fonts/fraunces-600-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
"""
FIXES = """
/* --- fixes on top of the design --------------------------------------------- */
/* The featured review rides a scroll-driven entry animation; the design's
   reduced-motion override forgot it, which left the card invisible. */
@media (prefers-reduced-motion: reduce){.rv2-feat{animation:none!important}}
/* Busy state for the contact and newsletter buttons. */
.btn[aria-busy="true"]{opacity:.6;pointer-events:none}
"""

HEADER = (
    '// Generated by tools/design/import.py from the design export; do not edit by hand.\n'
    "import { DCLogic, pageData } from '../../runtime.js';\n"
    "import { copyLink, sendContact, subscribe } from '../../actions.js';\n"
    "import { acceptAll, consentChoice, rejectAll } from '../../../consent.js';\n\n"
)

# --------------------------------------------------------------------- run
assets = {f.split('.')[0]: f for f in os.listdir(ASSETS_IN)}
assets['1db4202f667f59ea880dc6527a69d732'] = 'demo-video.mp4'  # the export renames the video
shared = None
used, missing = set(), set()
os.makedirs(PAGES_OUT, exist_ok=True)

for name, key in PAGES.items():
    styles, body, logic = split(name)
    assert len(styles) in (2, 3), f'{name}: expected 2 or 3 style blocks, got {len(styles)}'
    if shared is None:
        shared = styles[:2]
    assert styles[:2] == shared, f'{name}: shared style blocks differ from the home page'

    if key in PAGE_PATCHES:
        body, logic = PAGE_PATCHES[key](body, logic)

    links = dict(LINKS, **LINK_OVERRIDES.get(key, {}))
    for old, new in links.items():
        body = body.replace(f'href="{old}"', f'href="{new}"')
    # Anchors left must point at an id on the same page.
    for target in set(re.findall(r'href="#([\w-]+)"', body)):
        assert f'id="{target}"' in body, f'{name}: link to #{target} has no target on the page'
    left = re.findall(r'href="([^"]*\.dc\.html[^"]*)"', body)
    assert not left, f'{name}: unmapped links {left}'

    # A way back to the cookie preferences, in the footer's own style.
    body = patch(body, FOOTER_LEGAL,
                 FOOTER_LEGAL.replace('</span>', '') + '<a class="foot-a" href="#cookie-settings" style="margin: 0">Cookie settings</a></span>',
                 label=f'{name} cookie settings link')

    # Consent lives in src/consent.js (it also gates the tracking tags).
    logic = patch(logic, COOKIE_READ, 'if (consentChoice()) this.setState({ cookieDone: true });', label=f'{name} cookie read')
    logic = patch(logic, COOKIE_ACCEPT, 'cookieAccept: () => { acceptAll(); this.setState({ cookieDone: true }); },', label=f'{name} cookie accept')
    logic = patch(logic, COOKIE_REJECT, 'cookieReject: () => { rejectAll(); this.setState({ cookieDone: true }); }', label=f'{name} cookie reject')
    logic = patch(logic, 'class Component extends DCLogic', 'export class PageLogic extends DCLogic')

    for i in re.findall(r'/_blob/([a-f0-9]{32})', body + logic):
        (used if i in assets else missing).add(i)
    blob = lambda m: '/assets/site/' + assets.get(m.group(1), m.group(1))  # noqa: E731
    body = re.sub(r'/_blob/([a-f0-9]{32})', blob, body)
    logic = re.sub(r'/_blob/([a-f0-9]{32})', blob, logic)

    out = os.path.join(PAGES_OUT, key)
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'template.html'), 'w', encoding='utf-8').write(body + '\n')
    open(os.path.join(out, 'state.js'), 'w', encoding='utf-8').write(HEADER + logic + '\n')
    css = (styles[2] if len(styles) == 3 else '') + PAGE_CSS.get(key, '')
    open(os.path.join(out, 'page.css'), 'w', encoding='utf-8').write(
        f'/* {name}.dc.html: styles of this page only (shared ones are in ../../site.css). */' + css)
    print(f'wrote src/design/pages/{key}/ from {name}.dc.html')

open(os.path.join(ROOT, 'src', 'design', 'site.css'), 'w', encoding='utf-8').write(
    FONTS + '\n/* --- design styles shared by every page (block 1) --- */' + shared[0]
    + '\n/* --- design styles shared by every page (block 2) --- */' + shared[1] + FIXES)

shutil.rmtree(ASSETS_OUT, ignore_errors=True)
os.makedirs(ASSETS_OUT)
for i in sorted(used):
    shutil.copyfile(os.path.join(ASSETS_IN, assets[i]), os.path.join(ASSETS_OUT, assets[i]))
print(f'assets: {len(used)} copied to public/assets/site')
if missing:
    print(f'referenced by the design but not in the export ({len(missing)}): {sorted(missing)}')
