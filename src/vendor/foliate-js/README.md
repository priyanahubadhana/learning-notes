# foliate-js (vendored)

- Source: https://github.com/johnfactotum/foliate-js, commit `78914aef4466eb960965702401634c2cb348e9b1` (1 May 2026), MIT licence (see `LICENSE`).
- Used for: reading EPUB books (Phase C3). Only `src/reader/epub/EpubView.tsx` imports it, so it can be swapped for `epubjs`.
- Files kept: `view.js`, `epub.js`, `epubcfi.js`, `overlayer.js`, `paginator.js`, `fixed-layout.js`, `progress.js`, `text-walker.js`, `search.js`. Left out: PDF, MOBI, FB2, comic book, text-to-speech, its zip.js and its demo UI.
- Our patches (kept small):
  1. `view.js`: `makeBook` and the file-type helpers are replaced by a stub (we open the book ourselves with `src/reader/epub/epubLoader.ts`, built on fflate); `initTTS` removed.
  2. `paginator.js`, `fixed-layout.js`: the frame `sandbox` is `allow-same-origin` only (`allow-scripts` removed), so no script in a book ever runs.
- `*.d.ts` files next to the sources are ours (types for the parts we call).
