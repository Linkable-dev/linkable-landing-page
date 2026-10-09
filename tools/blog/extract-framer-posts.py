#!/usr/bin/env python3
"""One-off: turn the six articles that were written in Framer into the same JSON
the database articles use (content/blog/posts/<slug>.json), so every post renders
through the one design template. Run once when the Framer post pages were
replaced; kept for the record and in case a Framer page has to be re-read.

    python3 tools/blog/extract-framer-posts.py

Reads blog/<slug>/index.html (the Framer export) for every post whose source is
not "generated" in content/blog/posts.json, and writes its body blocks plus its
hero image into the cache. Inline formatting becomes the markdown subset the
generated posts use (**bold**, *italic*, [label](url)).
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, 'content', 'blog')


class Blocks(HTMLParser):
    """Collects h2/h3/p/ul/ol/blockquote blocks from Framer rich text."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.stack, self.buf, self.items, self.list = [], [], None, None, None
        self.quote = False
        self.unknown = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('ul', 'ol'):
            self.list, self.items = tag, []
        elif tag == 'li':
            self.buf = ''
        elif tag == 'blockquote':
            self.quote = True
        elif tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'p'):
            if self.list is None or self.buf is None:
                self.buf = ''
            self.stack.append(tag)
        elif tag in ('strong', 'b'):
            self._add('**')
        elif tag in ('em', 'i'):
            self._add('*')
        elif tag == 'a':
            self.stack.append(('a', a.get('href', '')))
            self._add('[')
        elif tag == 'br':
            self._add(' ')
        elif tag not in ('span', 'div', 'img', 'figure'):
            self.unknown.add(tag)

    def handle_endtag(self, tag):
        if tag in ('strong', 'b'):
            self._add('**')
        elif tag in ('em', 'i'):
            self._add('*')
        elif tag == 'a':
            href = ''
            while self.stack:
                top = self.stack.pop()
                if isinstance(top, tuple):
                    href = top[1]
                    break
            self._add(f']({href})' if href else ']')
        elif tag == 'li':
            if self.items is not None and self.buf is not None and self.buf.strip():
                self.items.append(self._clean(self.buf))
            self.buf = None
        elif tag in ('ul', 'ol'):
            if self.items:
                self.blocks.append({'type': self.list, 'items': self.items})
            self.list, self.items = None, None
        elif tag == 'blockquote':
            self.quote = False
        elif tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'p'):
            if self.stack and self.stack[-1] == tag:
                self.stack.pop()
            if self.list is not None:
                return  # paragraph inside a list item: the <li> closes the item
            text = self._clean(self.buf or '')
            self.buf = None
            if not text:
                return
            kind = 'quote' if self.quote else {'h1': 'h2', 'h4': 'h5'}.get(tag, tag)
            self.blocks.append({'type': kind, 'text': text})

    def handle_data(self, data):
        self._add(data)

    def _add(self, s):
        if self.buf is not None:
            self.buf += s

    @staticmethod
    def _clean(s):
        s = re.sub(r'\s+', ' ', s).strip()
        s = s.replace('** **', ' ').replace('****', '')
        s = re.sub(r'\[([^\]]*)\]\(\)', r'\1', s)
        return s


def rich_text(page):
    """Inner HTML of the article body's RichTextContainer."""
    s2 = page.find('<section class="framer-3if7bs"')
    s3 = page.find('<section class="framer-7h0g1z"')
    assert s2 >= 0 and s3 > s2, 'body section not found'
    open_at = page.index('data-framer-component-type="RichTextContainer"', s2)
    start = page.index('>', open_at) + 1
    depth, re_div = 1, re.compile(r'<div\b|</div>')
    for m in re_div.finditer(page, start):
        depth += -1 if m.group(0) == '</div>' else 1
        if depth == 0:
            return page[start:m.start()]
    raise AssertionError('unterminated rich text')


def hero(page, alt):
    at = page.index('data-framer-name="16:9"')
    img = re.search(r'<img[^>]*>', page[at:]).group(0)
    width = int(re.search(r'\swidth="(\d+)"', img).group(1))
    height = int(re.search(r'\sheight="(\d+)"', img).group(1))
    files = [{'path': p, 'w': int(w)} for p, w in re.findall(r'(/assets/images/[^\s,"]+) (\d+)w', img)]
    if not files:
        files = [{'path': re.search(r'\ssrc="([^"]+)"', img).group(1), 'w': width}]
    alt_m = re.search(r'\salt="([^"]*)"', img)
    return {'files': files, 'width': width, 'height': height, 'alt': html.unescape(alt_m.group(1)) if alt_m and alt_m.group(1) else alt}


registry = json.load(open(os.path.join(CONTENT, 'posts.json')))
changed = False
for meta in registry:
    if meta.get('source') == 'generated':
        continue
    page = open(os.path.join(ROOT, 'blog', meta['slug'], 'index.html'), encoding='utf-8').read()
    p = Blocks()
    p.feed(rich_text(page))
    # Framer posts used h3 for sections and h5 for sub-points. Where a post has no
    # h2 at all, its h3s are its sections, so they become h2 (the table of
    # contents is built from h2); h5s become h3 either way.
    promote = not any(b['type'] == 'h2' for b in p.blocks)
    for b in p.blocks:
        if b['type'] == 'h3' and promote:
            b['type'] = 'h2'
        elif b['type'] == 'h5':
            b['type'] = 'h3'
    if p.unknown:
        print(meta['slug'], 'ignored tags:', sorted(p.unknown), file=sys.stderr)
    json.dump({'blocks': p.blocks, 'faqs': []}, open(os.path.join(CONTENT, 'posts', meta['slug'] + '.json'), 'w'), indent=2, ensure_ascii=False)
    meta['heroImage'] = hero(page, meta['title'])
    meta['words'] = sum(len((b.get('text') or ' '.join(b.get('items') or [])).split()) for b in p.blocks)
    changed = True
    kinds = {}
    for b in p.blocks:
        kinds[b['type']] = kinds.get(b['type'], 0) + 1
    print(f"{meta['slug']}: {len(p.blocks)} blocks {kinds}, hero {meta['heroImage']['files'][-1]['path']}")
if changed:
    json.dump(registry, open(os.path.join(CONTENT, 'posts.json'), 'w'), indent=2, ensure_ascii=False)
    open(os.path.join(CONTENT, 'posts.json'), 'a').write('\n')
