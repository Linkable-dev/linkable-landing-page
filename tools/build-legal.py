#!/usr/bin/env python3
"""Build the legal pages from text held in this repo.

The privacy policy and terms used to come from Framer, so import-framer.py
overwrote them on every sync and no correction lasted longer than one import.
They are authored in tools/legal/content.py now, alongside the cookie policy, and
the importer no longer fetches them.

What still comes from Framer is the chrome: the header, footer, sidebar, fonts
and prose styles. tools/legal/shell.html is a copy of the legal page with its
prose replaced by <!--LEGAL-BODY--> and its sidebar list by <!--LEGAL-NAV-->, and
tools/legal/nav-entry.html is a single sidebar row to clone per page. Both were
captured from an imported page, so if Framer restyles the legal template they
need recapturing; nothing here detects that on its own, which is the price of
owning the text.

Usage: python3 tools/build-legal.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'legal'))
import content  # noqa: E402  (path set above)

SHELL = os.path.join(ROOT, 'tools', 'legal', 'shell.html')
NAV_ENTRY = os.path.join(ROOT, 'tools', 'legal', 'nav-entry.html')
SITEMAP = os.path.join(ROOT, 'public', 'sitemap.xml')
BASE = 'https://www.linkable.link'

# Framer's prose presets, so the text inherits the type scale of the other pages.
PRESET = {
    'h1': 'framer-text framer-styles-preset-14gnfek',
    'h2': 'framer-text framer-styles-preset-141sbpv',
    'h3': 'framer-text framer-styles-preset-1b5aq58',
    'p': 'framer-text framer-styles-preset-1dojnqy',
    'a': 'framer-text framer-styles-preset-1loxrev',
}


def style_inline(html):
    """Give bare <strong> and <a> the classes Framer's rich text expects."""
    html = html.replace('<strong>', '<strong class="framer-text">')
    return re.sub(r'<a href="', f'<a class="{PRESET["a"]}" href="', html)


def render_blocks(blocks):
    out = []
    for kind, value in blocks:
        if kind == 'address':
            out += [f'<p class="{PRESET["p"]}">{line}</p>'
                    for line in [content.COMPANY, *content.ADDRESS]]
        elif kind == 'ul':
            items = ''.join(f'<li class="{PRESET["p"]}">{style_inline(i)}</li>' for i in value)
            out.append(f'<ul class="framer-text">{items}</ul>')
        else:
            out.append(f'<{kind} class="{PRESET[kind]}">{style_inline(value)}</{kind}>')
    return ''.join(out)


def render_nav(entry_tpl, current_slug):
    """The Policies sidebar: one row per legal page, current one marked."""
    rows = []
    for page in content.PAGES:
        row = entry_tpl.replace('href="/legal/privacy-policy"',
                                f'href="/legal/{page["slug"]}"')
        row = re.sub(r'(<p class="framer-text framer-styles-preset-ub08wg"[^>]*>)[^<]*</p>',
                     lambda m: m.group(1) + page['nav'] + '</p>', row)
        if page['slug'] == current_slug:
            if 'data-framer-page-link-current' not in row:
                row = row.replace('<a ', '<a data-framer-page-link-current="true" ', 1)
        else:
            row = row.replace(' data-framer-page-link-current="true"', '')
        rows.append(row)
    return ''.join(rows)


def build(shell, entry_tpl, page):
    t = shell
    t = t.replace('<!--LEGAL-BODY-->', render_blocks(page['blocks']))
    t = t.replace('<!--LEGAL-NAV-->', render_nav(entry_tpl, page['slug']))

    url = f'{BASE}/legal/{page["slug"]}'
    t = re.sub(r'<title>[^<]*</title>', f'<title>{page["title"]} - Linkable</title>', t)
    t = re.sub(r'(<meta name="description" content=")[^"]*(")',
               lambda m: m.group(1) + page['meta'] + m.group(2), t)
    t = re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")',
               lambda m: m.group(1) + f'{page["title"]} - Linkable' + m.group(2), t)
    t = re.sub(r'(<meta (?:property="og:description"|name="twitter:description") content=")[^"]*(")',
               lambda m: m.group(1) + page['meta'] + m.group(2), t)
    t = re.sub(r'https://www\.linkable\.link/legal/[a-z-]+', url, t)
    # The hero repeats the page name and its own "last updated" line.
    t = t.replace('>Privacy Policy</h1>', f'>{page["title"]}</h1>', 1)
    t = re.sub(r'Last updated: [^<]*', f'Last updated: {content.UPDATED}', t, count=1)

    out = os.path.join(ROOT, 'legal', page['slug'], 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(t)
    return out


def update_sitemap():
    xml = open(SITEMAP, encoding='utf-8').read()
    for page in content.PAGES:
        loc = f'{BASE}/legal/{page["slug"]}'
        if f'<loc>{loc}</loc>' not in xml:
            xml = xml.replace('</urlset>', f'  <url><loc>{loc}</loc></url>\n</urlset>')
    open(SITEMAP, 'w', encoding='utf-8').write(xml)


def main():
    shell = open(SHELL, encoding='utf-8').read()
    entry_tpl = open(NAV_ENTRY, encoding='utf-8').read()
    assert '<!--LEGAL-BODY-->' in shell and '<!--LEGAL-NAV-->' in shell, \
        'shell.html has lost its markers; recapture it from an imported legal page'
    # The shell was captured after the consent gate ran, so it must still carry the
    # parked tags. Without this a recapture from an ungated page would quietly
    # reintroduce tracking that fires before consent.
    assert shell.count('data-consent=') == 2, \
        f'shell.html carries {shell.count("data-consent=")} parked tracking tags, expected 2'
    assert 'googletagmanager.com/ns.html' not in shell, \
        'shell.html still has the GTM noscript iframe, which cannot be consent-gated'

    for page in content.PAGES:
        print('wrote', os.path.relpath(build(shell, entry_tpl, page), ROOT))
    update_sitemap()
    if content.TODO:
        print('\nStill needed for these documents (tools/legal/content.py):')
        for item in content.TODO:
            print('  -', item)


if __name__ == '__main__':
    main()
