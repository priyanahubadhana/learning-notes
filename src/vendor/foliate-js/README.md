# foliate-js (vendored)

- Source: https://github.com/johnfactotum/foliate-js, commit `78914aef4466eb960965702401634c2cb348e9b1` (1 May 2026), MIT licence (see `LICENSE`).
- Used for: reading EPUB books (Phase C3). Only `src/reader/epub/EpubView.tsx` imports it, so it can be swapped for `epubjs`.
- Files kept: `view.js`, `epub.js`, `epubcfi.js`, `overlayer.js`, `paginator.js`, `fixed-layout.js`, `progress.js`, `text-walker.js`, `search.js`. Left out: PDF, MOBI, FB2, comic book, text-to-speech, its zip.js and its demo UI.
- Our patches (kept small):
  1. `view.js`: `makeBook` and the file-type helpers are replaced by a stub (we open the book ourselves with `src/reader/epub/epubLoader.ts`, built on fflate); `initTTS` removed.
  2. `paginator.js`, `fixed-layout.js`: the frame `sandbox` is upstream's `allow-same-origin allow-scripts` again (14 Nov 2026; WebKit delivers no taps or selection without it, bug 218086). Safe only with the three guards of DECISIONS 13 Nov "EPUB on iPad": the site `script-src` stays strict (`scripts/siteRules.test.mjs`), `src/reader/epub/bookSandbox.ts` cleans every book page and adds a `script-src 'none'` rule to it, and `e2e/readerV2EpubSafety.spec.ts` proves a hostile book runs nothing. Removing a guard means removing `allow-scripts` again.
  3. `epub.js`: `EPUB` and its `Loader` take a `guard` (ours: `bookGuard` in `src/reader/epub/bookSandbox.ts`, always added by `makeEpubLoader`). It refuses every script file and cleans every page before `createURL` makes it a frame address, ahead of foliate's own `data` listeners.
- `*.d.ts` files next to the sources are ours (types for the parts we call).
