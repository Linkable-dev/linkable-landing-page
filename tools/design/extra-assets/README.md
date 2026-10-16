# Images the design export left out

The 14 Oct 2026 design update arrived as a single-page HTML export, which bundles
only the images in the page markup, not the ones the page logic sets (creator
cards, content tiles, the "Ways to collaborate" photos). These files fill that
gap; `import.py` uses one only when the export has no image under the same id,
so a full export replaces them.

Every file here is the design's own image, byte for byte: the design project
(claude.ai/artifact/XqoULbTnnfYpyoqfwZcA3x) serves each `/_blob/<id>` it
references as an asset, fetched with the Artifact tool's `read` and
`path: "<id>"` (one id per call; `paths` only reads published files).

Until 16 Oct these were stand-ins, and they made the photos look blurry: 15 were
cut from the founder's PDF print of the site at 1.5x (so 54 to 416 px wide, with
the page's rounded corners, play button and Instagram badge baked in), the
Gifted photo was a landscape copy of Sofia's card photo instead of its own
1050x1400 portrait, and the creator photos and thumbnails sent separately on
14 Oct had been matched to ids by hand, three of Elsa W.'s thumbnails in the
wrong slots. `f0065530…` (Naomi L.'s avatar in the logic's `platApps` list,
which the template does not render today) had no file at all.

A creator with no photo here or in the export is left out of the niche chips,
and a missing content thumbnail is dropped from its card (see `home()` in
`import.py`).
