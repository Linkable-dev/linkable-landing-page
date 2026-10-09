#!/usr/bin/env python3
"""Build the legal pages from text held in this repo.

The privacy policy, the terms and the cookie policy are authored in
tools/legal/content.py, which is the source of truth for what they say. This
script turns each document into the data the design's legal page renders (title,
lede, date, table of contents and body HTML), writes it to
content/legal/documents.json, and then renders the pages with
tools/design/build.mjs into legal/<slug>/index.html.

The design export has its own Privacy and Terms copy; only its layout is used.
Its text was a draft with the company number and address left as placeholders,
and it described cookie controls the site does not have.

Usage: python3 tools/build-legal.py
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'legal'))
import content  # noqa: E402  (path set above)

OUT = os.path.join(ROOT, 'content', 'legal', 'documents.json')
SITEMAP = os.path.join(ROOT, 'public', 'sitemap.xml')
BASE = 'https://www.linkable.link'


def slug(text):
    text = re.sub(r'<[^>]+>', '', text).lower().replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def render(blocks):
    """Body HTML plus the h2 outline. The document's own h1 and "Last updated"
    line are dropped because the design's page header shows both."""
    out, toc, ids = [], [], set()
    for kind, value in blocks:
        if kind == 'h1':
            continue
        if kind == 'p' and value.startswith('<strong>Last updated:'):
            continue
        if kind == 'h2':
            anchor = slug(value) or 'section'
            n = 2
            while anchor in ids:
                anchor = f'{slug(value)}-{n}'
                n += 1
            ids.add(anchor)
            toc.append({'id': anchor, 'label': re.sub(r'<[^>]+>', '', value)})
            out.append(f'<h2 id="{anchor}">{value}</h2>')
        elif kind == 'address':
            out.append('<p>' + '<br>'.join([content.COMPANY, *content.ADDRESS]) + '</p>')
        elif kind in ('ul', 'ol'):
            out.append(f'<{kind}>' + ''.join(f'<li>{i}</li>' for i in value) + f'</{kind}>')
        else:
            out.append(f'<{kind}>{value}</{kind}>')
    return ''.join(out), toc


def update_sitemap():
    xml = open(SITEMAP, encoding='utf-8').read()
    for page in content.PAGES:
        loc = f'{BASE}/legal/{page["slug"]}'
        if f'<loc>{loc}</loc>' not in xml:
            xml = xml.replace('</urlset>', f'  <url><loc>{loc}</loc></url>\n</urlset>')
    open(SITEMAP, 'w', encoding='utf-8').write(xml)


def main():
    docs = []
    for page in content.PAGES:
        body, toc = render(page['blocks'])
        docs.append({
            'slug': page['slug'],
            'title': page['title'],
            'lede': page['lede'],
            'meta': page['meta'],
            'updated': content.UPDATED,
            'toc': toc,
            'body': body,
            'others': [{'href': f'/legal/{p["slug"]}', 'label': p['nav']}
                       for p in content.PAGES if p is not page],
        })
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print('wrote', os.path.relpath(OUT, ROOT))
    update_sitemap()
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'design', 'build.mjs'), 'legal'], check=True)
    if content.TODO:
        print('\nStill needed for these documents (tools/legal/content.py):')
        for item in content.TODO:
            print('  -', item)


if __name__ == '__main__':
    main()
