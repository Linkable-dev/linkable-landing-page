#!/usr/bin/env python3
"""Generate legal/cookie-policy/index.html from the privacy policy page.

The legal pages come from Framer and import-framer.py overwrites them, so a
cookie policy authored by hand in one of them would survive exactly one sync.
This builds a fourth legal page instead, reusing the privacy policy as a shell
so the chrome, fonts and prose styles stay identical, and swapping in the only
part that differs. The importer does not know about this page, so it is never
overwritten; re-run this script if Framer restyles the legal template.

The cookie table describes what was actually observed in the browser for each
consent choice, not what the tags are assumed to set:

    no choice / reject all  ->  no third-party requests, no cookies
    analytics only          ->  googletagmanager.com, no cookies
    marketing only          ->  connect.facebook.net, _fbp
    accept all              ->  both of the above

Usage: python3 tools/build-cookie-policy.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'legal', 'privacy-policy', 'index.html')
OUT = os.path.join(ROOT, 'legal', 'cookie-policy', 'index.html')

P = 'framer-text framer-styles-preset-1dojnqy'
H1 = 'framer-text framer-styles-preset-14gnfek'
H2 = 'framer-text framer-styles-preset-141sbpv'
H3 = 'framer-text framer-styles-preset-1b5aq58'
A = 'framer-text framer-styles-preset-1loxrev'

UPDATED = '12 September 2026'


def p(text):
    return f'<p class="{P}">{text}</p>'


def h2(text):
    return f'<h2 class="{H2}">{text}</h2>'


def h3(text):
    return f'<h3 class="{H3}">{text}</h3>'


def ul(items):
    lis = ''.join(f'<li class="{P}">{i}</li>' for i in items)
    return f'<ul class="framer-text">{lis}</ul>'


BODY = ''.join([
    f'<h1 class="{H1}">Cookie Policy</h1>',
    p(f'<strong class="framer-text">Last updated: {UPDATED}</strong>'),
    p('This policy explains the cookies and similar storage used on '
      '<strong class="framer-text">linkable.link</strong>, this website. It does not cover the '
      'Linkable app inside Shopify, which is described in our '
      f'<a class="{A}" href="/legal/privacy-policy">Privacy Policy</a>.'),
    p('Cookies are small files a site asks your browser to keep. Some are needed for the '
      'site to function; the rest are optional and we only set them if you say yes. We also '
      'use your browser’s local storage, which works the same way and is covered here too.'),

    h2('Your choice'),
    p('When you first arrive we ask what you are willing to allow. Nothing optional is '
      'loaded before you answer, and choosing to refuse is one click, exactly like accepting. '
      'If you refuse, or simply ignore the banner, no analytics or advertising request leaves '
      'your browser at all.'),
    p('You can change your mind whenever you like using the '
      '<a class="framer-text framer-styles-preset-1loxrev" href="#cookie-settings">Cookie '
      'settings</a> link in the footer of every page. Clearing your browser storage also '
      'resets the question. We ask again after six months in any case.'),

    h2('What we use'),

    h3('Strictly necessary — always on'),
    p('One entry, set by us, recording the choice you made so we do not ask on every page. '
      'It is kept in your browser’s local storage rather than sent to us, contains only the '
      'categories you allowed and the date you chose, and is never used to identify or track '
      'you. There is no opt-out because without it we cannot honour your decision.'),
    ul([
        '<strong class="framer-text">lk-consent</strong> — local storage, set by linkable.link, '
        'holds your consent categories and the date. Treated as expired after six months.',
    ]),

    h3('Analytics — off unless you allow it'),
    p('Google Tag Manager, which loads our measurement tags, so we can see which pages are '
      'read, which are ignored, and where people give up. We look at this in aggregate to '
      'decide what to write and what to fix.'),
    ul([
        '<strong class="framer-text">Google Tag Manager</strong> (container GTM-535WR8K4), loaded '
        'from googletagmanager.com. The container itself set no cookies when we last checked, '
        'but it is the mechanism through which measurement tags are added, and those can set '
        'their own. Anything loaded through it inherits the consent you gave here.',
    ]),

    h3('Marketing — off unless you allow it'),
    p('The Meta pixel, which tells us whether our advertising on Facebook and Instagram brings '
      'anyone to the site, and allows Meta to show our ads to people who have visited before.'),
    ul([
        '<strong class="framer-text">_fbp</strong> — cookie set by linkable.link for Meta, '
        'identifying a browser across visits so a visit can be matched to an ad. Expires after '
        'about three months.',
        '<strong class="framer-text">lastExternalReferrer</strong> and '
        '<strong class="framer-text">lastExternalReferrerTime</strong> — local storage written '
        'by the Meta pixel, recording which site you arrived from and when.',
    ]),
    p('Allowing this category means data about your visit is shared with Meta Platforms, which '
      'processes it as described in its own privacy policy. Refusing it means the pixel is '
      'never loaded, so nothing is sent.'),

    h2('Third parties'),
    p('The optional cookies above are set on behalf of Google and Meta, who act as separate '
      'controllers for what they receive. Their handling of it is governed by their own '
      'policies, not ours. Our other suppliers, such as the hosting that serves these pages '
      'and the service that delivers form submissions to us, do not set cookies for '
      'advertising or analytics.'),

    h2('Changes'),
    p('If we add, remove or repurpose a cookie we will update this page and, where the change '
      'needs your permission, ask for it again rather than assume your previous answer still '
      'applies.'),

    h2('Contact'),
    p('Questions about this policy, or about the data behind it, can go to '
      '<strong class="framer-text">support@linkable.link</strong>. If you are in the UK or the '
      'EU you also have the right to complain to a data protection authority; in the UK that is '
      'the Information Commissioner’s Office at ico.org.uk.'),
    p('Linkable Ltd'),
    p('10 Esprit Court'),
    p('21 Brune Street'),
    p('London, England'),
    p('E1 7ND'),
])


def matched_div(t, start):
    """End offset of the <div> opening at start, by counting nesting.

    Regex alone cannot find it: a lookahead for some later closing sequence runs
    past the element and swallows unrelated markup, which is exactly how the
    sidebar clone first went wrong.
    """
    depth = 0
    for m in re.finditer(r'<div\b|</div>', t[start:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0:
            return start + m.end()
    raise AssertionError('unbalanced divs from offset %d' % start)


def content_block(t):
    """Span of the RichTextContainer holding the policy prose."""
    start = t.find('<div class="framer-e8b5br"')
    assert start != -1, 'prose container not found; the Framer legal template changed'
    return start, matched_div(t, start)


t = open(SRC, encoding='utf-8').read()
start, end = content_block(t)
open_tag = t[start:t.index('>', start) + 1]
t = t[:start] + open_tag + BODY + '</div>' + t[end:]

# Head and the page's own labels.
t = re.sub(r'<title>[^<]*</title>', '<title>Cookie Policy - Linkable</title>', t)
t = re.sub(r'(<meta name="description" content=")[^"]*(")',
           r'\1The cookies and browser storage used on linkable.link, what each one does, '
           r'and how to change what you allow.\2', t)
t = t.replace('linkable.link/legal/privacy-policy', 'linkable.link/legal/cookie-policy')
t = re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")',
           r'\1Cookie Policy - Linkable\2', t)

# The hero names the page and carries its own "last updated" line, separate from
# the one in the prose.
t = t.replace('>Privacy Policy</h1>', '>Cookie Policy</h1>')
t = re.sub(r'Last updated: [^<]*', f'Last updated: {UPDATED}', t, count=1)


def add_sidebar_entry(t):
    """Add Cookie Policy to the Policies list, and mark it as the current page.

    Each entry is a framer-bnyjcf block wrapping a link; cloning the privacy one
    keeps the icon, the hover states and the hashed classes without reproducing
    any of them by hand.
    """
    spans = []
    for m in re.finditer(r'<div class="framer-bnyjcf">', t):
        spans.append((m.start(), matched_div(t, m.start())))
    assert spans, 'sidebar entries not found; the Framer legal template changed'
    privacy = next((s for s in spans if 'href="/legal/privacy-policy"' in t[s[0]:s[1]]), None)
    assert privacy, 'no privacy policy entry to clone'
    entry = (t[privacy[0]:privacy[1]]
             .replace('href="/legal/privacy-policy"', 'href="/legal/cookie-policy"')
             .replace('>Privacy Policy</p>', '>Cookie Policy</p>'))
    assert len(entry) < 6000, f'cloned sidebar entry looks too big ({len(entry)} chars)'
    # Only the cookie entry is the current page now.
    t = t.replace(' data-framer-page-link-current="true"', '')
    if 'data-framer-page-link-current' not in entry:
        entry = entry.replace('<a class=', '<a data-framer-page-link-current="true" class=', 1)
    # Stripping the current-page attribute moved every offset, so locate the
    # privacy entry again on the updated string and sit directly after it. That
    # puts the list in the same order consent.js produces on the Framer-owned
    # legal pages, where the clone lands beside the entry it was copied from.
    starts = [m.start() for m in re.finditer(r'<div class="framer-bnyjcf">', t)]
    after = next(s for s in starts if 'href="/legal/privacy-policy"' in t[s:matched_div(t, s)])
    at = matched_div(t, after)
    return t[:at] + entry + t[at:]


t = add_sidebar_entry(t)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(t)
print('wrote', os.path.relpath(OUT, ROOT), f'({len(t) // 1024} KB)')
