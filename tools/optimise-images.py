#!/usr/bin/env python3
"""Serve the site's photographs in WebP as well as their originals.

Framer's CDN transcodes images on the fly: ask for a PNG with a browser that
accepts modern formats and you get AVIF back at about a third of the size, same
pixels. Our copies are the originals, byte for byte, so they look identical but
weigh three times as much and land noticeably later while scrolling.

This regenerates that behaviour statically. For every photograph the pages
reference it writes a .webp beside the original, then wraps the <img> in a
<picture> so the browser picks the smaller file and falls back to the original
where WebP is unsupported.

Wrapping is safe here: Framer styles images through inline styles on the <img>
itself, and no CSS rule in the site selects `img` at all, let alone as a direct
child. `picture { display: contents; border-radius: inherit }` in site.css keeps
the element out of the layout and passes a rounded corner through to the image.

The WebP is encoded losslessly, so the browser gets the original pixels whichever
source it picks. Lossy q90 used to be the setting here and it was measurably
worse than its comment claimed: across the site's photographs the median came out
at 41.6 dB PSNR but fifty files fell below 40 dB and the worst reached 28 dB.
Raising the quality does not rescue those: some of these images plateau around
38 dB however high you push it, and by q100 the WebP is larger than the PNG it
replaces.

Lossless is not a size win here, and it is not meant to be. On the photographs
the homepage loads it comes to 7.45 MB against 5.82 MB for the originals, so
MIN_SAVING rejects it for most of them and the page serves the original file
instead. Only the images lossless genuinely beats keep a .webp, 73 of 191 at the
time of writing. Either way the bytes on the wire decode to the source pixels,
which is the point: this script no longer trades quality for weight, it only
takes a smaller file when that file is exact. The cost is real and worth stating
plainly, the homepage carries about 5.8 MB of photographs where the live Framer
site serves 2.0 MB of lossy AVIF for the same pixels.

`-m 6` rather than `-z 9`: the latter saves about 3% more and takes twenty five
times longer, which is not a trade worth making on every import. cwebp drops the
RGB values underneath fully transparent pixels unless `-exact` is passed, so a
handful of files differ from the original there; every visible pixel matches.

Idempotent, so re-running costs nothing. import-framer.py calls it after writing
the pages; run it directly to redo just this step.
"""
import os, re, struct, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, 'public', 'assets', 'images')
ENCODE = ['-lossless', '-m', '6']   # pixel-exact; see the note above
MIN_SAVING = 0.10       # skip WebP that barely beats the original
RASTER = re.compile(r'/assets/images/([^"\s,)]+\.(?:png|jpe?g))', re.I)
IMG_TAG = re.compile(r'<img\b[^>]*>', re.I)


def pages():
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in {'node_modules', 'dist', '.git', 'public', 'tools', 'src', 'api', 'content'}]
        out += [os.path.join(dirpath, f) for f in filenames if f.endswith('.html')]
    return sorted(out)


def webp_for(name):
    """foo-width-100.png -> foo-width-100.webp (kept beside the original)."""
    return os.path.splitext(name)[0] + '.webp'


def complete_webp(path):
    """True when path is a whole WebP, not a half-written one.

    A cwebp killed mid-write (a timed-out import, a cancelled build) leaves a
    truncated or empty file behind. Judging it by existence and mtime alone
    marks it current forever, and rewrite() then points a <source> at it, so the
    browsers that prefer WebP get a broken image while the PNG fallback sits
    there unused. The RIFF header carries the payload length, so a file that
    ends early can be recognised without decoding it.
    """
    try:
        with open(path, 'rb') as f:
            head = f.read(12)
        if len(head) < 12 or head[:4] != b'RIFF' or head[8:12] != b'WEBP':
            return False
        return struct.unpack('<I', head[4:8])[0] + 8 == os.path.getsize(path)
    except OSError:
        return False


def encode(names):
    made = skipped = failed = bigger = 0
    for name in sorted(names):
        src = os.path.join(IMAGES, name)
        dst = os.path.join(IMAGES, webp_for(name))
        if not os.path.exists(src):
            continue
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src) and complete_webp(dst):
            skipped += 1
            continue
        r = subprocess.run(['cwebp', '-quiet', *ENCODE, src, '-o', dst],
                           capture_output=True)
        if r.returncode != 0 or not os.path.exists(dst) or not complete_webp(dst):
            failed += 1
            print('  could not encode', name, r.stderr.decode()[:120])
            if os.path.exists(dst):
                os.remove(dst)
            continue
        # An already-compressed JPEG can come out bigger as high-quality WebP.
        # Keep the original in that case: the <img> fallback still serves it.
        if os.path.getsize(dst) > os.path.getsize(src) * (1 - MIN_SAVING):
            os.remove(dst)
            bigger += 1
            continue
        made += 1
    return made, skipped, failed, bigger


def rewrite(html, have_webp):
    """Wrap raster <img> tags in <picture> with a WebP source."""
    count = 0

    def one(m):
        nonlocal count
        tag = m.group(0)
        refs = RASTER.findall(tag)
        # Only swap in WebP when every file this tag mentions has one, so a
        # <source> can never point at something that does not exist.
        if not refs or not all(r in have_webp for r in refs):
            return tag
        srcset = re.search(r'\ssrcset="([^"]*)"', tag)
        sizes = re.search(r'\ssizes="([^"]*)"', tag)
        src = re.search(r'\ssrc="([^"]*)"', tag)
        if srcset:
            source_set = RASTER.sub(lambda mm: '/assets/images/' + webp_for(mm.group(1)), srcset.group(1))
        elif src:
            source_set = RASTER.sub(lambda mm: '/assets/images/' + webp_for(mm.group(1)), src.group(1))
        else:
            return tag
        source = f'<source type="image/webp" srcset="{source_set}"'
        if sizes:
            source += f' sizes="{sizes.group(1)}"'
        source += '>'
        count += 1
        return f'<picture>{source}{tag}</picture>'

    # Never wrap twice: strip any <picture> we added before, then rebuild.
    html = re.sub(r'<picture><source type="image/webp"[^>]*>(<img\b[^>]*>)</picture>', r'\1', html)
    return IMG_TAG.sub(one, html), count


def main():
    files = pages()
    referenced = set()
    for f in files:
        referenced |= set(RASTER.findall(open(f, encoding='utf-8').read()))
    print(f'{len(referenced)} photographs referenced by {len(files)} pages')

    made, skipped, failed, bigger = encode(referenced)
    print(f'webp: {made} encoded, {skipped} already current, {bigger} skipped (no smaller than the original), {failed} failed')

    have = {n for n in referenced if os.path.exists(os.path.join(IMAGES, webp_for(n)))}
    wrapped = 0
    for f in files:
        html = open(f, encoding='utf-8').read()
        new, n = rewrite(html, have)
        if new != html:
            open(f, 'w', encoding='utf-8').write(new)
        wrapped += n
    print(f'wrapped {wrapped} <img> tags in <picture>')

    before = sum(os.path.getsize(os.path.join(IMAGES, n)) for n in have)
    after = sum(os.path.getsize(os.path.join(IMAGES, webp_for(n))) for n in have)
    if before:
        print(f'those images: {before/1048576:.1f} MB original, {after/1048576:.1f} MB webp '
              f'({100 - after * 100 // before}% smaller)')


if __name__ == '__main__':
    if subprocess.run(['which', 'cwebp'], capture_output=True).returncode != 0:
        sys.exit('cwebp not found (brew install webp)')
    main()
