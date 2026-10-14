# Images the design export left out

The 14 Oct 2026 design update arrived as a single-page HTML export, which bundles
only the images in the page markup, not the ones the page logic sets (creator
cards, content tiles). These files fill that gap; `import.py` uses one only when
the export has no image under the same id, so a full export replaces them.

- 15 are cut from the founder's PDF print of the site (`Linkable Website.pdf`,
  page 1, rendered at 1.5x), each at the box the page draws it in, inset 2px.
- `7d81b2f6…` (the Gifted photo in "Ways to collaborate") is a copy of Sofia's
  card photo `f537fe89…`: same shot, and the PDF has cards drawn over it.

Creators whose photos are in neither place are left out of the niche chips
(see `home()` in `import.py`).
