# Master plan (final, 6 Nov 2026)

## Changelog of this file

- 6 Nov 2026 (draft): outline approved by the owner (Phases A–I); owner later decided: keep both reading views with the same controls; ink moves with its paragraph; Phase A started.
- 6 Nov 2026 (final, this version): replaces the draft. Covers the whole product end to end (redesign R1–R4 + every roadmap phase through Sync, AI and native apps, IDEAS, LIMITATIONS, open issues, built features). Built on [research/deep-research-2026-11.md](../research/deep-research-2026-11.md), which found the root causes of the Pencil bugs (see "Why Phase A is shaped this way"). Adds a traceability table, builder instructions and a short list of owner decisions.

## How to use this plan

- **Owner:** read "Phases at a glance", "Owner decisions still needed" and the Phase A gate. Everything else is for the builder.
- **Builder (a cheaper model):** read "Builder instructions" first, then only the step you are building plus the files it names. Do not read other phases. Never read docs/ARCHIVE.md.
- Every step is one build session: build → related tests while working → one full run → push → CI green → live check → mirror → HANDOFF. A step that grows past one session is split into "a" and "b" parts by the builder, logged in DECISIONS.
- IDs: `N1`–`N25` are the owner's numbered notes in [owner-test-notes-2026-11.md](owner-test-notes-2026-11.md) (Rounds 1–3, using that file's numbers; the duplicate 7/8/9/10/11 numbering is resolved in the traceability table), `R4-x` and `T1`–`T3` are Round 4, `V-x` the owner's vision list, `S-x` the agreed structure, `RM-x` roadmap phases, `IDEA` rows are IDEAS.md.

## Standing owner decisions (final unless the owner changes them; the latest wins)

1. One core (notebooks, pages, blocks, databases); Home, Library, Review and future layers are views/templates on top.
2. Uniformity: the same tools, bars, gestures and ink engine everywhere (notes, books, PDFs).
3. Design rule: tool → options pill (snaps to 4 edges) → detail card with sub-pages. Icon-only main bar. Our own look; never copy other apps' art or icons.
4. Four spaces (Home, Library, Notebooks, Review) plus one Search; Settings etc. in the quiet corner. (Built.)
5. Pencil: Pencil mode starts on **Lasso**; Text tool: first Pencil tap marks a block, second tap places the caret; an empty block or blank space takes the caret at once; **hold 0.5 s** places the caret; a Pencil never opens the keyboard by itself; finger scrolls and zooms.
6. Ink tools (Pen, Highlighter, Eraser, Shapes, Ruler, Tape) work **only on the ink layer**; **Lasso is universal** (ink and page content in one gesture).
7. Layers: **max 2** per page ("Layer 1", "Layer 2"), 👁 eye, 🔒 lock, **Merge** (warn first, then Undo), Photoshop-like (top layer drawn over the lower; tools act only on the active layer). The pen pill shows **"Layer 1 ▾"**, last used by default.
8. **Ink moves with its paragraph** (built; keep).
9. **Keep both reading views** (in place and full screen) with **the same controls**.
10. Home = productivity cockpit (no continue reading, no favourites, no notifications). Matrix quadrants are **manual**. Library = books (PDF, EPUB, DOCX; DRM-free; no Kindle import). Review = Anki-like decks + memory techniques. FSRS target memory **90%**. Fonts = a small set + import. Share/export last. ₹0; AI only after cost approval; sync only after the deep research (done: RESEARCH.md); no native apps or collaboration for now.

## Why Phase A is shaped this way (research summary)

Details and sources: [deep-research-2026-11.md](../research/deep-research-2026-11.md) §0.

- **Pen writes text over text lines (R4-20):** iPadOS Scribble collects _every_ editable element under the stroke, even below our transparent ink pad, and our editor stays editable while the Pen is chosen. → Make the page non-editable and `inert` while an ink tool is active.
- **Pencil taps on the bar write a comma (R4-17):** the bar is sticky _inside_ the page scroller, so scrolled text sits under it. → Move bars out of the scroller; cancel stylus touches on all chrome and activate buttons ourselves on `pointerup`.
- **Undo opens the keyboard (R4-16):** `runHistory` calls `view.focus()`. → Remove it.
- **Page jumps with the keyboard (R4-15):** the top bar follows the keyboard's viewport pan by design; Safari has no `interactive-widget`, and iOS 26 has viewport bugs. → Flex-column shell, bars in normal flow, our own caret reveal.
- **Selection vanishes / iOS callout (R4-11/13/19):** native selections on iPad are fragile and the callout cannot be removed from a focused editable. → Pencil selections become _our own_ selection (drawn by us, editor not focused or editable), so there is no native callout; for finger/keyboard selections in Text, our bar sits directly above the selection, which WebKit's callout is built to avoid.
- **Blank grey area (R4-9c):** likely iOS canvas memory (about 384 MB, then canvases draw blank). → Canvas budget.

## Phases at a glance

Order rule: the most broken and most used parts first. Each step ≈ one build session. "Dexie" = database version added.

| Phase                                            | Steps (sessions)                                                                                                                                              | What the owner gets                                                                 | Dexie       | Gate                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------- | ----------------------------- |
| **A Trustworthy Pencil**                         | A1 ink layer owns the Pencil + Pencil lab · A2 two layers, Merge, universal Lasso · A3 our own selection, caret, ⌫ · A4 still page and keyboard, bar fixes    | Pen always draws, never edits text; bar taps never write; selection stays; no jumps | —           | **Owner iPad check before B** |
| M0 Mockups                                       | one clickable mockup set (Library, book page, reader Aa, Review home + deck builder, Home, Layer gallery)                                                     | approve the look once                                                               | —           | owner approval                |
| **B Reading done right**                         | B1 reader controls and chrome · B2 Contents, Bookmarks, jumps · B3 reader search scope · B4 read aloud fixed, player, now-playing                             | calm reader, clear navigation, reliable listening                                   | —           | owner check (any time)        |
| **C Library and book reader**                    | C1 Books notebook, import, book page · C2 PDF reader + ink · C3 EPUB reader + ink · C4 highlights, notes, annotations, deep links · C5 reader extras          | read and annotate own books                                                         | 14          | owner check                   |
| D Left panel and tidy-ups                        | D1 Pages · Outline · Audio panel, sidebar clean-up, Panel button, lock fixes                                                                                  | calm sidebar, outline everywhere                                                    | —           |                               |
| E Review decks                                   | E1 decks, pause, Review home · E2 memory techniques                                                                                                           | Anki-like decks, plain words                                                        | 15          |                               |
| F Home cockpit                                   | F1 tasks, inbox, manual matrix, carry-over · F2 Top 3, project timer, Pomodoro, plan vs actual · F3 routines, habits, affirmations, evening journal, briefing | the owner's Notion system, in the app                                               | 16          |                               |
| G Ink and Insert complete                        | G1 Shapes, Ruler, Tape, Magnifier, lazy ink · G2 Table, Toggle, File, Camera, Audio with ink replay · G3 picture resize, mind map, ink labels                 | every "coming" tool works                                                           | — (uses 16) |                               |
| H Fonts and voices                               | H1 font set + import · H2 optional on-device natural voice (owner decision)                                                                                   | comfortable fonts                                                                   | —           |                               |
| I Views and Layer gallery                        | I1 notebook View ▾, per-tab views, shelf, tabs · I2 Layer gallery, shareable templates                                                                        | GoodNotes shelf, OneNote tabs, finance layer                                        | 17          |                               |
| J Share and export                               | J1 PDF, Word, Markdown, text, share sheet                                                                                                                     | share with friends                                                                  | —           |                               |
| K Close Phase 9                                  | K1 debt and safety · K2 languages, accessibility audit, three-day trial                                                                                       | a finished pre-sync app                                                             | —           | trial                         |
| L Sync (roadmap Phase 10)                        | L1–L8 per RESEARCH.md                                                                                                                                         | iPad ↔ PC                                                                           | 18+         | planning talk first           |
| M Summary · Notes · Review tabs (Phase 11)       | M1–M2                                                                                                                                                         |                                                                                     |             | planning talk                 |
| N Maths, new-page start, Calendar Day (Phase 12) | N1–N3                                                                                                                                                         |                                                                                     |             | planning talk                 |
| O Polish pack (Phase 13)                         | from IDEAS, one commit per item                                                                                                                               |                                                                                     |             | ≤7 owner checks               |
| P AI (Phase 14)                                  | after cost approval                                                                                                                                           | notes, cards, handwriting to text                                                   |             | owner approves cost           |
| Q Before global launch (Phase 15)                | smart merge, passkeys, sign-up, store wrapper                                                                                                                 |                                                                                     |             | owner approves cost           |

---

# Phase A — Trustworthy Pencil

Definition of Done (whole phase): every A test passes in Chromium and WebKit; the Pencil lab report from the owner's iPad (Scribble ON) shows zero text edits from ink tools and zero bar taps reaching the page; the owner signs off the Phase A gate list. Nothing from Phase B starts until then (M0 mockups may be prepared meanwhile).

## A1 · The ink layer owns the Pencil, chrome owns its taps, Pencil lab

Covers: R4-20, R4-22, R4-17, R4-21, N12, "Pencil taps not registering" (NEW BUG), R4-9c (canvas budget part), T1 (must keep working).

**Goal.** With Pen, Highlighter or Eraser selected, every Pencil stroke anywhere on the page draws ink and nothing else can happen to the text. A Pencil tap on any bar, pill, card, menu or ✕ does only that control's action.

**Behaviour (owner-facing).**

- Pen/Highlighter/Eraser: draw over text lines, pictures, the title, blank space below, and on a brand-new empty page. No text is selected, typed, deleted or Scribbled; the keyboard never appears. A finger still scrolls and pinches.
- Choosing Text returns to normal typing (Scribble works there, as in test T1).
- Bars and pop-ups: a Pencil tap acts once, immediately, even near the edge of a button; a near-miss lands on the bar's empty background and does nothing.
- Settings › Advanced › **Pencil lab** (hidden in the Features search under "pencil lab"): a test page that records what the iPad sends, with a Copy results button.
- Settings › About this app: version, build date, "Check for updates now", last checked time (so a stale app is visible).

**Technical.**

1. **Edit policy (one source of truth)** — new `src/editor/editPolicy.ts`:
   ```ts
   export type PageMode = 'edit' | 'select' | 'ink' | 'read' | 'frozen'
   export function pageModeFor(o: {
     tool: ActiveTool
     frozen: boolean
     reading: boolean
   }): PageMode
   // text → 'edit'; lasso → 'select'; pen | highlighter | eraser (later shapes, ruler, tape) → 'ink';
   // read → 'read'; frozen (read-only window, full-screen reader, locked to reading) → 'frozen'.
   export function applyPageMode(
     mode: PageMode,
     el: {
       editor: Editor
       content: HTMLElement
       title: HTMLInputElement | null
     },
   ): void
   ```
   `applyPageMode`: `'edit'` → `editor.isEditable = true`, `content.inert = false`, title editable. `'select'` → `isEditable = false`, not inert (Lasso needs hit testing), blur if focus is inside `content`. `'ink'` → blur first, then `isEditable = false`, `content.inert = true`, `title.readOnly = true`. `'read'`/`'frozen'` → `isEditable = false`, not inert. Call it from `PageEditor.tsx` (replace `editable={!frozen}`) on every change of tool, reading or frozen. A3 changes `'select'` behaviour further; A1 only sets the switch.
2. **Move the ink overlay outside the inert part.** In `pages/PageView.tsx` wrap title + editor + section chips + database blocks in `<div data-page-content>` and give `InkSurface` a sibling host `<div data-ink-host>` positioned over the same box (absolute, `inset: 0`, `z-index` above content). `ink/controller.ts` `placeOverlay()` keeps measuring the editor's blocks for anchoring, but the pad now covers the whole page box including the title and the room below. `ensureRoom()`: while an ink tool is chosen the page box is at least the visible scroller height (not 60%), so an empty page is fully drawable.
3. **Touch cancels on the pad:** keep the non-passive `touchstart` cancel for `touchType === 'stylus'` and add the same on `touchmove` (`ink/controller.ts`, `mount()`). Never read `pointerId` from coalesced events (iOS 18.2 bug); use the parent event's id.
4. **`pointercancel`:** keep the stroke only if it has ≥ 3 points and lasted ≥ 50 ms; otherwise drop it. Count both cases in the Pencil lab.
5. **Bars out of the scroller.** In `App.tsx` the page column becomes a flex column: `TopBar` → top `BarStack` (main bar, ribbon, pill room) → `<main data-page-scroller class="min-h-0 flex-1 overflow-auto">` → bottom `BarStack`. Nothing sticky inside `main` except the section chips (not editable). Keep `--dock-top` for the chips (now 0 inside the scroller). The floating bar stays `position: fixed`.
6. **Persistent chrome never covers editable text.** A pill docked left or right reserves its width as page padding (extend `pillRoom.ts`/`PillRoom` from top/bottom to all four edges), so the text never sits under it.
7. **Chrome tap module** — new `src/app/penTap.ts`, installed once in `main.tsx`:
   - Every chrome container gets `data-chrome` (TopBar, SpaceStrip, BarStack, OptionsPill, DetailCard, AnchoredMenu, every `usePopup` panel, MiniToolbar/SelectionMenu, InkSurface menus and handles, toasts, UpdateBar, reader controls, future now-playing pill).
   - `touchstart` (document, capture, `passive: false`): if a changed touch has `touchType === 'stylus'` and the target is inside `[data-chrome]` and not inside `input, textarea, select, [contenteditable="true"], [data-pen-native]` → `preventDefault()`.
   - `pointerdown` (capture) with `pointerType === 'pen'` inside chrome: remember the actionable element (`closest('button, [role=button], [role=menuitem], [role=tab], [role=option], [role=switch], a, label')`), x, y, time.
   - `pointerup` pen: same element, moved < 12 px, < 1000 ms, element not disabled and not inside `[data-pen-own]` → `el.click()`; mark it so the browser's own late `click` within 500 ms is swallowed (capture `click` listener: `isTrusted` + marked → `stopImmediatePropagation()` + `preventDefault()`).
   - `[data-pen-own]` = elements with their own pointer logic (press-and-slide tools, ⠿ grips, sliders, the New line hold, ⌫ repeat, lasso handles). They keep using their pointer handlers.
8. **Hit areas (R4-21).** A Tailwind utility `.hit` (in `index.css`): 44 × 44 px minimum box, 20 px icon, and for small ✕ buttons a `::after { inset: -6px }` only where the neighbour is ≥ 12 px away. Bars have ≥ 4 px gaps and their own background, so a near-miss hits the bar, never the page.
9. **Canvas budget** — `ink/render.ts`: device pixel ratio capped at 2; each cached layer bitmap at most 1.5 × the visible height; release canvases on unmount (`width = height = 0`); keep total estimated canvas bytes under 160 MB (the lab shows the number). pdf.js (C2) uses the same budget module `src/app/canvasBudget.ts` (`reserve(bytes): boolean`, `release(id)`).
10. **Pencil lab** — `src/app/lab/PencilLab.tsx`, route `#/lab/pencil` (lazy loaded, not in the sidebar). Panels: (a) a real `PageEditor` with sample text and the ink overlay; (b) live counters per pointerType: down, move (raw and coalesced), up, cancel, `lostpointercapture`; `touchstart` by `touchType`; `beforeinput`/`input` events on the editor with `inputType` and `data` ("Scribble wrote: …"); focus changes; `visualViewport` height/offsetTop; current page mode; canvas MB; pen hover events (`pointermove` pen with `buttons === 0`); (c) toggles to switch each A1 measure off (to prove which one matters); (d) **Copy results** (JSON + plain summary). Strings via `t()`.
11. **Update visibility:** `settings/AboutSection.tsx` (new) reads the build id from `buildInfo`, calls the existing update check in `app/updates.ts`, shows "Up to date" / "Update ready".

**Tests.**

- Unit: `editPolicy.test.ts` (every tool × frozen × reading → mode); `penTap.test.ts` (jsdom: pen down/up on a button clicks once; trusted click within 500 ms swallowed; moved 20 px → no click; `data-pen-own` skipped; input excluded); `canvasBudget.test.ts`.
- E2E new `e2e/pencilIsolation.spec.ts` (Chromium + WebKit, simulated pen events via `e2e/inkHelpers.ts`): for Pen, Highlighter, Eraser: editor root has `contenteditable="false"`, `[data-page-content]` has `inert`, `document.activeElement` is not inside it, title `readOnly`; a pen stroke across a text line saves one stroke and the block texts are byte-identical before/after, and the selection is empty; a stroke on a new empty page saves; a stroke on the blank room below saves; Text tool restores `contenteditable="true"`.
- E2E new helper `e2e/scribbleProbe.ts` = **simulated Scribble interference**: `editableTargetsInRect(page, rect, pad = 8)` samples points every 6 px across the rect grown by `pad`, calls `document.elementsFromPoint(x, y)` (multi-element hit test that, like WebKit's, skips `pointer-events: none` and `inert`) and returns every element that `isContentEditable` or is an enabled `input`/`textarea`. New `e2e/chromeIsolation.spec.ts`: for every visible `[data-chrome]` button, pill, card and menu (in Text, Lasso and Pen, page scrolled to the middle so text passes under the top), `editableTargetsInRect(button rect)` is empty — except the search box itself. Also: for the whole page rect while Pen is active → empty.
- E2E: pen tap (pointer events only, no click) on Lasso, Pen, ✕ and a menu item fires each action exactly once; the same tap followed by a synthetic trusted-like click does not double-fire.
- Existing specs that must stay green: `ink`, `inkTools`, `inkLayers`, `penSelect`, `penTapRules`, `penTools`, `undoPictures`, `mainBar`, `pillMove`, `popups`, `floatingBar`, `ribbonLayout`, `dockedBar` (update selectors for the moved bars).
- Owner iPad (Scribble ON in iPadOS Settings; installed app; after Update): write across three text lines, a picture, the title and blank space with Pen and Highlighter — ink only? New page: draw at once? Tap each bar tool 10 times with the Pencil, and each ✕ slightly off-centre: any comma, letter or caret in the text? Then open Pencil lab, repeat a few strokes, tap Copy results and paste it into the chat.

**Risks.** `inert` drops the editor's DOM selection and its side menu while drawing (expected; the selection lives in ProseMirror state). Moving bars changes many selectors in old e2e specs (budget time; use helpers). `touchstart` cancel stops native scrolling of a chrome strip by the Pencil (fingers still scroll it). Toggling `isEditable` may re-render BlockNote menus: measure that a tool switch stays under 50 ms.

**Honestly impossible on the web, and the fallback.** Scribble cannot be switched off per element; if the lab shows Scribble still acting on a non-editable, inert page (not expected from WebKit's code), the fallback is a one-time tip: "Turn off Scribble in iPad Settings › Apple Pencil while drawing, or use the Pen only away from text", plus the existing penGuard refusal and Undo message. PencilKit-level latency stays out of reach (LIMITATIONS).

## A2 · Two layers, Merge, universal Lasso

Covers: R4-23, R4-24, owner decision 7, S "multiple ink layers" (superseded by R4-24), lasso extras (screenshot of a mixed selection).

**Goal.** A Photoshop-like but tiny layer model, and one Lasso that picks ink and page content together.

**Behaviour.**

- Each ink tool's pill starts with a chip **"Layer 1 ▾"** (the active layer, last used on this page; Layer 1 on a new page). Tapping it opens the **Layers card**: rows from top to bottom **Layer 2**, **Layer 1**, **Page** (the text; not a layer, just shown for orientation). Each layer row: 👁 show/hide, 🔒 lock, tap the row to make it active (highlighted, ✓). Buttons: **Add Layer 2** (when only one exists), **Move up/down** (swap order), **Merge Layer 2 into Layer 1** (a warning sheet: "Layer 2's drawings move into Layer 1. They can't be separated later, but you can Undo right away." → Merge → toast with Undo), **Delete layer** (toast with Undo).
- Pen, Highlighter, Eraser (and later Shapes, Ruler, Tape) act **only on the active layer**. Drawing on a locked or hidden active layer shows a toast "Layer 1 is locked" with **Unlock** (or "hidden" with **Show**); nothing is drawn.
- A hidden layer that has drawings shows a small chip at the page's top right: "Layer 2 hidden · Show".
- **Lasso (universal):** one loop or rectangle selects ink strokes on all visible, unlocked layers **and** the page blocks inside the loop. The selection menu adapts: ink only → Duplicate, Colour, Copy as picture, Save as picture, Delete, move/scale/rotate handles (scale and rotate separate, as built); text/blocks only → the text selection bar (A3); mixed → Copy (picture + text), Cut, Delete (one Undo), Screenshot (PNG of the area), Save to notes, Make card (text part), ✕; move/scale/rotate dimmed with "Works on drawings only".
- Pages saved earlier with more than two layers keep all of them; the card shows a note: "This page has 4 layers from an earlier version" with **Merge extras into Layer 2** (Undo). **Add** stays hidden while there are two or more.

**Technical.**

- `ink/layers.ts`: `MAX_LAYERS = 2`; new pure `mergeLayers(doc, fromId, intoId)` (re-points chunks' strokes, soft-deletes `fromId`) and `mergeExtras(doc)`; names fixed "Layer 1"/"Layer 2" for new layers (keep old names).
- Active layer per page: device pref map `ink.activeLayer` `{ [pageId]: layerId }`, at most 400 entries (oldest dropped), validated on read; falls back to the top visible unlocked layer.
- `ink/inkDoc.ts` + `inkHistory.ts`: merge and delete are one history step each (show/hide and lock stay non-undoable, as decided).
- `ink/controller.ts`: `layerForDrawing()` returns the active layer or null with a reason (`'locked' | 'hidden'`); the eraser filters to the active layer; lasso hit test (`lassoUp`) collects strokes (half of the points inside) from visible unlocked layers **and** blocks whose rect centre is inside the loop (via `PageLayout.blocks()`), producing `{ strokes: string[]; blockIds: string[] }`. Block part becomes a `BlockRangeSelection` (existing, `editor/dragSelect.ts`).
- `ink/LayersCard.tsx` rewritten to the rows above; `app/tools/main/PillContent.tsx` gets the "Layer N ▾" chip for pen, highlighter, eraser (and G1 tools).
- Mixed screenshot: `ink/screenshot.ts` extended to rasterise blocks with the strokes (draw text via an SVG `foreignObject` snapshot of the selected blocks; if WebKit refuses `foreignObject` rasterising, fall back to strokes only and say so).

**Tests.** Unit: max 2, merge moves every stroke and soft-deletes, mergeExtras, undo/redo of merge, active-layer fallback, eraser ignores the inactive layer. E2E `inkLayers.spec.ts` updated: chip shows "Layer 1 ▾", add, swap, hide badge, lock toast with Unlock, merge warning + Undo, old 4-layer page shows note and merges; `lassoUniversal.spec.ts`: loop over text + ink → mixed menu, Delete removes both with one Undo, ink-only shows handles. Owner: try Merge and Undo; does "Layer 1 ▾" make sense?

**Risks.** Mixed screenshot via `foreignObject` may taint the canvas in WebKit (fallback above). Lasso over long pages: limit block hit test to blocks in the loop's bounding box.

**Web limits.** None beyond A1.

## A3 · Our own selection, exact caret, ✕ and ⌫

Covers: R4-11, R4-12, R4-13, R4-18, R4-19 (a–d), T2 (keep), T3, R4-14, N12 (structural fix), owner decision 5.

**Goal.** Selections never vanish, are always visible, have easy handles, our bar, ✕ and Delete; the caret lands where the Pencil points; Pencil users can delete without the keyboard.

**Behaviour.**

- Under **Lasso** (Pencil mode's default) the page is not editable (A1 mode `'select'`): a tap marks a block, a second tap shows **our caret** there (a thin blinking line; no keyboard); a drag selects; double-tap = word, triple-tap = line; hold 0.5 s = caret at that spot, keep moving = extend. The selection is **ours**: a soft highlight, two round handles (44 px touch area, 12 px dot) and our **selection bar** right above it (colour, size, Aa, B, I, align, list, highlight, link, cut, copy, ⋯ paste, Make card, ★, Save to notes, **🗑 Delete**, **✕ Deselect**). No iOS Cut/Copy/Paste bar appears. It stays until ✕, Esc, a tap elsewhere on the page, a tool change, or an action that ends it.
- Under **Text** with a finger or keyboard: the iPad's own selection (needed for typing); our bar appears directly above it and the iPad's bar moves out of its way; ✕ and Delete are on our bar too. The selection must not disappear by itself.
- **⌫ key** on the main bar right after ↵ New line: tap deletes the character before our caret (or the selection); hold repeats (after 0.4 s, every 80 ms, faster after 1 s) and after 1.5 s deletes whole words. One hold = one Undo step. Works with no keyboard, under Lasso or Text.
- Handles: drag with Pencil or finger; the page auto-scrolls near the edges; the highlight follows smoothly (no flicker). With reduced motion: no fades.
- Settings › Tool bar › **Selection bar…** opens Edit bar on a "Selection bar" list (show/hide/reorder; Reset).

**Technical.**

- New ProseMirror plugin `src/editor/ownSelection.ts` (registered through a BlockNote extension in `editor/schema.tsx`/`PageEditor.tsx`): plugin state `{ active: boolean; caret: number | null }`; while `active` (page mode `'select'`, or the editor not focused) it returns `DecorationSet` for the state selection: inline decorations `class="ln-sel"` for text ranges, node decorations `class="ln-sel-node"` for block ranges, a widget `ln-caret` at `caret`. CSS in `index.css` (theme tokens, Night/Sepia contrast ≥ 3:1).
- Handles and bar: `app/tools/main/SelectionHandles.tsx` (new) positioned from `view.coordsAtPos` in the page scroller coordinates; drag → `caretAt()` → `TextSelection.create`. Bar = existing `SelectionMenu.tsx`/`MiniToolbar.tsx` with ✕ and Delete added, `data-chrome`, placed above the selection (below only if no room).
- `src/editor/caretAt.ts` (new, pure + DOM): `caretAt(view, x, y): number | null` = `view.posAtCoords`; if null, clamp the point into the nearest block's rect (from `view.dom` children) and retry; compare distances to `coordsAtPos(pos)` and `pos ± 1` and pick the nearest character boundary; where `document.caretPositionFromPoint` exists (Safari 26.2+) use it as the tie-breaker. Replace the ad-hoc logic in `tapSelect.ts` and `holdSelect.ts` with it.
- Hold (T3): stillness slop 10 px (Settings › Advanced range 4–16, default 10); timer 0.5 s (existing setting). Under Lasso Scribble cannot claim the hold (page not editable). Under Text it is best effort (see limits).
- Text-tool persistence (R4-11): reproduce in WebKit e2e (finger double-tap, wait 2 s). Known suspects to check and fix in this order: `keyboardPolicy.ts` blurs on pen taps; `holdSelect.ts` `setTimeout(() => dom.focus())`; the 400 ms Undo/Redo poll re-rendering the bar; `inputmode` toggles while selected. Rule: nothing may call `blur()`, `focus()` or change `inputmode` while a non-empty selection exists, except the user's own action.
- ⌫: `editor/lineActions.ts` gains `deleteBackward(view, unit: 'char' | 'word')` (transaction; respects blanks/cards like Backspace; uses `caret` from `ownSelection` when not focused); `app/tools/main/mainTools.ts` adds tool `backspace` after `newline` in the default main list (migration adds it once for saved lists, next to New line; removable in Edit bar); hold logic in `app/tools/main/newLineGesture.ts` style (`data-pen-own`).
- R4-18: every lasso path (free-hand, rectangle, tap) ends in the same `selectionFromLasso()` that shows the outline/handles; test each.

**Tests.** Unit: `caretAt.test.ts` (fake rect maps: wrap points, null outside, nearest boundary), `ownSelection.test.ts` (decorations for text, block and caret; cleared on ✕), `deleteBackward` (char, word, selection, blank, start of block). E2E (Chromium + WebKit) `ownSelection.spec.ts`: Lasso double-tap → `.ln-sel` present after 2 s; ✕ clears; tap elsewhere clears; Esc clears; handle drag extends by words; Delete removes with one Undo; no `window.getSelection()` range under Lasso; Text: finger double-tap selection still non-empty after 2 s and our bar's rect is above the selection's rect; ⌫ tap and hold (fake timers via `page.clock`) with one Undo. Existing `penTapRules`, `penSelect`, `pictureSelect`, `newLine` stay green. Owner: under Lasso, double-tap a word and wait; drag handles; ✕; ⌫ tap and hold; under Text with a finger: does the iOS bar move away from ours?

**Risks.** Decorations on very long selections (whole page) can be slow: cap inline decorations to the visible range ± 2 screens and use node decorations for whole blocks. BlockNote's own side menu and formatting toolbar may react to selection changes while unfocused: suppress them in `'select'` mode.

**Web limits.** In Text with the keyboard, the iOS callout cannot be removed, only pushed away; if it still overlaps, ours moves below the selection. Hold-to-caret under Text with Scribble on stays best effort (a held Pencil that moves slightly may become handwriting) → the reliable ways are two taps (T2 ✅) or Lasso.

## A4 · A still page, a calm keyboard, bar fixes

Covers: R4-15 (clarified), R4-16, R4-1, R4-2, R4-10, N7 (pop-ups behind bars), N18 (toggles), N23 (Sepia band), toolbar "laggy" (performance), N6 and N11 (verify built).

**Goal.** The bar stays at the top and the text doesn't move when the keyboard opens or closes; small bar bugs fixed.

**Behaviour.**

- Keyboard opens (⌨ button or finger tap in Text): the bar stays where it is; the page scrolls only if the caret would be hidden, by the smallest amount, without animation; when the keyboard closes nothing moves.
- Undo/Redo never open or close the keyboard.
- A pill docked left/right is a long thin vertical strip (one column; scrolls if long), like top/bottom.
- The main bar has no duplicates (one Highlighter tool; the Text pill's highlight colour is a different icon) and no stray indent/outdent buttons.
- Names: hovering a bar icon with a mouse or (where the iPad supports it) the Pencil shows its one-word name after 0.4 s. Settings › Tool bar › **Show names under icons** (off by default) adds tiny labels. Long-press shows the name only on buttons that have no hold action of their own (⋯, ⌨, Panel, Search); tools keep press-and-slide, New line and ⌫ keep their holds.
- Every toggle in the ribbon and on the bar turns off on a second tap and stays on the same ribbon tab.
- Pop-ups always open above both bars; the ribbon in Sepia sits on a Sepia background.

**Technical.**

- Shell (with A1's move): `html, body { height: 100%; overflow: hidden }`, app root `height: 100dvh` (fallback `100vh`), page column flex as in A1. Remove the "follow the keyboard pan" code in `editor/BarStack.tsx` (the `viewportTop` subscription for the top stack). The bottom stack keeps using `visualViewport` (above the keyboard).
- Our caret reveal: new `src/editor/scrollPolicy.ts` registered through `_tiptapOptions: { editorProps: { handleScrollToSelection } }` (only this file touches `_tiptapOptions`): compute the caret rect (`coordsAtPos`), the scroller's visible box (its rect ∩ `visualViewport` height), and if the caret is outside with a 24 px margin, set `scroller.scrollTop += delta` (no smooth); return `true`. Every programmatic focus uses `{ preventScroll: true }`; add an ESLint `no-restricted-syntax` rule banning `.scrollIntoView(` outside `src/app/reveal.ts` (a helper that scrolls the page scroller by delta).
- On `visualViewport` `resize`: if `window.scrollY !== 0` → `window.scrollTo(0, 0)` (best effort for iOS's layout-viewport pan).
- R4-16: `editor/historyActions.ts` `runHistory`: delete `view.focus()`. Same check in ink undo and the Undo toast.
- R4-1: `app/tools/main/OptionsPill.tsx` + `pillParts.tsx`: when `vertical(place.edge)`, the content is `flex-direction: column; flex-wrap: nowrap; overflow-y: auto; max-height: calc(100% - 2 * var(--pill-margin))`; thickness and colour groups are single columns.
- R4-2: `mainTools.ts` default list unit-tested for unique ids and icons; `migrate.ts` gains `dedupeMain()` (run once, key `toolbar.dedupe1`) that removes duplicate ids and the indent/outdent ids from saved main lists (they stay in the ribbon and Features).
- R4-10: `app/tools/ToolButton.tsx` tooltip on `pointerenter` for mouse and pen-with-`buttons === 0` after 400 ms; label setting `toolbar.showNames` (device, on/off).
- N18: test sweep over every registry tool marked `toggle: true` (add the flag where missing): run it twice from the ribbon; assert state off and the same tab open.
- N7: one z-index scale in `index.css` (`--z-bar: 20; --z-pill: 30; --z-popup: 40; --z-toast: 50; --z-modal: 60`), all pop-ups via the body portal; e2e asserts `elementFromPoint` at a menu's centre is inside the menu with ribbon + short bar shown.
- N23: the bar stack background uses `bg-bg` theme token on the whole width; screenshot test in Sepia.
- Performance (owner: "laggy"): measure tap → pill visible in the Chromium e2e with the performance API; target ≤ 100 ms; memoise `PillContent` per tool; no layout reads inside pointermove handlers of the pill drag.

**Tests.** Unit: `scrollPolicy.test.ts` (delta maths), `dedupeMain`, toggle flags. E2E: `keyboardStill.spec.ts` (simulate keyboard by resizing the viewport and `visualViewport` mock: the bar's top stays equal; the caret line stays visible; the scroller moves only when needed), `undoNoFocus.spec.ts` (activeElement unchanged after bar Undo/Redo), `pillVertical.spec.ts` (left/right pill width ≤ 64 px), `mainBarDefaults` unit, `toggles.spec.ts`, `popups.spec.ts` z-order, `barColor.spec.ts` Sepia. Owner: open and close the keyboard ten times while typing at the top, middle and bottom of a long page: does anything jump?

**Risks.** iOS 26 viewport bugs may still offset the page after the keyboard closes; the Pencil lab logs `visualViewport` so we can see it. `100dvh` in an installed iPad app with the top blur (`--top-clear`) must keep the 36 px offset.

**Web limits.** The keyboard's own pan of the layout viewport cannot be fully prevented on iOS; we minimise it. Fallback: the bar never moves; if the page still shifts by a few px on close, the lab data goes to DECISIONS for a later fix.

## Phase A gate (owner, one sitting on the iPad, installed app, Scribble ON)

1. Pen and Highlighter over text, pictures, title, blank space, new page: ink only? 2. Twenty Pencil taps on bar tools and ✕: nothing written into the page? 3. Lasso: double-tap a word, wait 5 s: still selected? ✕, Delete, handles. 4. ⌫ tap and hold. 5. Keyboard open/close ten times: does the bar or page jump? 6. Undo/Redo with the keyboard closed: stays closed? 7. Layers: Layer 1 ▾, Add, hide, lock, Merge + Undo. 8. Lasso around text + ink: one menu, Delete + Undo. 9. Pencil lab: Copy results into the chat. 10. Old checks still pending in HANDOFF (step 2/3/4a) that the owner has time for.
   Plus: review the "Decisions to review" rows in DECISIONS.md in the same sitting (about 45 rows; the builder marks the ones this plan already changed).

---

# M0 — One mockup set (planning rule: mockup before new screens)

**Goal.** The owner approves the look of all new screens of Phases B–I once, so building never stops for it.
**Deliverable.** One clickable artifact (static HTML, our own design, Lucide icons, the three themes): Library gallery + book page; reader with Aa sheet (Font, Layout, Themes, More), Contents (right pane) and Bookmarks; annotations panel with filters; Audible-style player + now-playing pill; Review home + 3-step deck builder; Home cockpit on iPad landscape and phone; Layer gallery. Plus the **short-bar picture** the owner asked for: PNG screenshots of the real main bar (Day, Night, Sepia) produced by Playwright (`e2e/screenshots/mainBar-*.png`), not an artifact.
**Owner action.** Comment or approve. Changes are written into the matching steps below before they are built.

---

# Phase B — Reading done right (both views, same controls)

Definition of Done: B tests pass; reading works in Day, Night, Sepia, Paper, Dark contrast and at phone width; owner reading check list in HANDOFF.

## B1 · Reader controls and chrome

Covers: N25, N19, N2, R4-3, R4-9 (a–d), V Aa sheet (tabs, saved themes), owner decision 9, N10 (explain only).

**Behaviour.**

- 📖 Read (in place) and Full-screen reader show **the same Reader controls**; the main bar and ribbon are hidden while reading (R4-3). Controls: ✕ Exit · Contents · Bookmarks · Aa · Find · Listen · ✎ Edit (in place only: leaves reading) · ⋯ (Lock to reading, Line focus, Self-test, Full screen ↔ In place).
- **Aa sheet** with tabs **Font** (font tiles with live preview; until H1 the current fonts), **Layout** (size slider, line spacing, margins, width, alignment left/justify, Scroll or Pages), **Themes** (Day, Night, Sepia, Paper, Dark contrast + **saved themes**: Compact, Standard, Large, Low vision, and "Save current as…"), **More** (line focus, ruler, blanks, keep screen awake, reading speed for time left). The same settings as today (`readingPrefs.ts`), now only here and in Settings › Reading — removed from the editing ribbon's Home tab (View tab keeps one "Reading settings…" item that opens this sheet).
- **Brightness** (V): the web cannot set screen brightness; the sheet offers a **Dim** slider (a black overlay 0–60 %) and says so.
- Top controls behaviour (N19), Settings › Reading › **Reader bar**: **Small ✕ + show on scroll up** (default), Always show, Only at the top. Applies to both views.
- Reading is calm (R4-9b): while reading, no keyboard ever (page not editable, `inputmode="none"`); ✎ Edit returns to editing.
- The reader's top bar is crisp (no blur, N2) and starts below the installed app's top blur zone.
- Dragging the Read pill (R4-9a, d): the page never scrolls; on release it always snaps to an edge; it never stays mid-screen.
- In place, choosing **Pages** opens the full-screen reader (paged reading needs it; logged decision kept) with a one-line note.
- N10 (no build): Help text explains that the bar above the keyboard (↶ keyboard, B I U, mic) is iPadOS's own.

**Technical.**

- New `src/app/reading/ReaderControls.tsx` used by `ReadingFrame.tsx` (full screen) and the in-place path (rendered in the top `BarStack` instead of `MainBar` when `readingView !== 'off'`). `readingTools.ts` stays the registry; `ReadingPanels.tsx` split into `AaSheet.tsx`, `ContentsPane.tsx` (B2), `BookmarksPanel.tsx` (B2).
- Saved themes: device setting `reading.savedThemes` (max 8; `{ name, theme, font, size, spacing, margin, width, align }`, validated).
- Reader bar behaviour: `reading.barMode: 'mini' | 'always' | 'top'`; scroll direction detection on the reader scroller with a 12 px threshold; the mini ✕ is a 44 px `data-chrome` button top-left inside the safe area.
- Page mode `'read'` (A1) makes the page non-editable in place; `ReadingSelection.tsx` keeps highlighting through transactions (it already works with frozen text).
- R4-9: the pill grip gets `touch-action: none`, `setPointerCapture`, `preventDefault` on `pointerdown`, `data-pen-own`; snap runs on `pointerup`, `pointercancel` and `lostpointercapture`. Remove `backdrop-filter` and lingering `will-change` from reader bars (R4-9c candidate; also N2). The canvas budget (A1) covers the other candidate.
- Dim overlay: `pointer-events: none` fixed layer under the controls.

**Tests.** Unit: reader bar mode reducer, saved theme validation. E2E `readerControls.spec.ts`: main bar hidden while reading (both views); same controls in both; Aa tabs change the page; save/apply a theme; bar modes; ✎ Edit; pill drag snaps and the scroller's `scrollTop` is unchanged during the drag; no focus inside the page while reading. Update `reading.spec.ts`. Owner: read for five minutes in each view; drag the pill around; scroll down then up: does the ✕ come back?

**Risks.** Removing reading items from the ribbon Home tab changes old tests; keep tool ids (control panel finds them).
**Web limits.** Real brightness and orientation (C5) are native-only; dim overlay instead.

## B2 · Contents, Bookmarks, landing animation

Covers: R4-5, R4-6, R4-7, R4-8, N20, V "Contents panel with page numbers" (books in C2/C3).

**Behaviour.**

- **Contents** (its own button): a right-side **navigation pane** (Word-style), dockable (📌 keeps it open and pushes the text on screens ≥ 1024 px; overlay on smaller), a collapsible heading tree H1 › H2 › H3 (▸/▾), the current heading highlighted while you scroll, a calm look. In books: chapter list with page numbers (C2/C3).
- **Bookmarks** (its own button, separate from Contents): a list (snippet, position %, date), tap to go, swipe or 🗑 to remove (Undo).
- **Adding a bookmark**: a ribbon drops into the margin beside that paragraph (0.6 s), a toast "Bookmark added · Undo"; bookmarked paragraphs keep a small ribbon in the margin (reading and editing views).
- **Jumping** (Contents, Bookmarks, search results, deep links): a smooth scroll of the **same duration whatever the distance** (default 1.2 s; Settings 0.6–1.5 s), then the target **glows** for about 1.6 s (soft accent outline fading out). Very long jumps: jump to 1.5 screens away, then glide. A touch stops the scroll. Reduced motion: instant jump, static outline 1.5 s.

**Technical.**

- `src/app/reveal.ts` (from A4) gains `glideTo(scroller, targetTop, ms)` (rAF, easeInOutCubic, cancel on `pointerdown`/`wheel`/`touchstart`/`keydown`) and `landOn(el)` (adds `.ln-landing`, removed after 1.6 s; CSS keyframes in `index.css`). Target offset: 25 % of the visible height from the top.
- `ContentsPane.tsx`: headings from `readingOutline.ts`; current heading via `IntersectionObserver` on heading elements; docked state device pref `reading.contentsDocked`.
- `BookmarksPanel.tsx`: `readingMarks.ts` (device storage, as today); margin ribbons rendered by a ProseMirror node decoration `ln-bookmarked` (works in editing too). C1 moves bookmarks into the `annotations` table.
- Paged mode: page slide 300 ms, then the glow.

**Tests.** Unit: `glideTo` duration independent of distance (fake clock), cancel on input. E2E `navigation.spec.ts` (new reading part): Contents and Bookmarks are two panels; current heading highlighted after scrolling; bookmark toast + margin ribbon; jump ends at the target within 1.2 s ± 0.2 and `.ln-landing` present; reduced-motion path. Owner: does the landing glow make it obvious where you arrived?

## B3 · Reader search with a scope filter

Covers: R4-4 (corrected wording wins).

**Behaviour.** The reader's 🔍 keeps today's search panel and adds a **scope row shown first and open by default**: **This page** (default) · This notebook/book · Everywhere. On This page: every match is marked in the text, "3 of 12" with ↑ ↓; the last match continues to the next page of the notebook/book with a one-line note. Wider scopes show the normal result list (same look as Search) and tapping a result jumps with B2's landing. (The owner asked to discuss details later: this is the minimal reading of the corrected words; the builder must not add more.)

**Technical.** `app/reading/ReaderFind.tsx`; in-page matches via the CSS Custom Highlight API (`Highlight` + `CSS.highlights`, Safari 17.2+; fallback: decorations); scope state per reading session; wider scopes call `search/searchQuery.ts` `runSearch` with `notebookId` filter or none.
**Tests.** E2E: default scope is This page; count and stepping; continue to next page; Everywhere shows grouped results.

## B4 · Read aloud fixed, Audible-style player, now playing everywhere

Covers: N22, N24, V "Read aloud like Audible", RM batch 4 voice part.

**Behaviour.**

- No repeated words: speech goes **one sentence at a time** with natural pauses (0.25 s after a sentence, 0.6 s after a paragraph).
- **Player sheet** (from Listen): title, ⏯ play/pause, ⏪ back and ⏩ forward (choice: 15 s or one sentence; default one sentence), speed chips 0.75–2.0×, **Voice** picker (best voices first, with a "Get better voices" guide: iPad Settings › Accessibility › Spoken Content › Voices; download an Enhanced or Premium voice, then come back), **Sleep timer** (moon: 10, 20, 30, 45, 60 min, **End of page/chapter**), Next page/chapter.
- **Now playing pill** on every screen (above the phone tab bar; in the top bar area on iPad): title, ⏯, ⏹. Navigating away never leaves speech running without the pill; ⏹ always stops.

**Technical.**

- Rewrite `app/reading/aloudController.ts` as an app-level singleton (`src/app/audio/nowPlaying.ts`) with one queue of sentences (`speechChunks.ts` split by `Intl.Segmenter` sentence granularity), one current index, one live utterance; Pause = `cancel()` + remember the index; resume speaks from that sentence; every `onend`/`onerror` carries a token and stale tokens are ignored (the likely repeat cause: restarts overlapping a still-finishing piece).
- Back/forward by seconds = sentences estimated from characters per second at the current rate.
- Voice ranking: names containing "Premium" > "Enhanced" > `localService` > default; remember the chosen voice per language (device).
- `NowPlayingPill.tsx` mounted in `App.tsx`, `data-chrome`.
- Media Session: not used (needs real audio; speech isn't) [unverified]; H2 can add it with recorded audio.

**Tests.** Unit (`readAloud.test.ts` extended with a fake `speechSynthesis` that fires late `end` events and boundary repeats): no sentence spoken twice; pause/resume index; sleep timer end-of-chapter; ranking. E2E: pill visible after navigating to Settings and Home; ⏹ stops; player controls. Owner: listen for 10 minutes; any repeated word? Is the voice better after downloading an Enhanced voice?

**Web limits.** Natural neural voices need either the device's downloaded voices (free; quality varies) or H2's optional on-device model; cloud voices cost money (parked). Speech may stop when the screen locks (iOS); the app resumes from the sentence when it returns.

---

# Phase C — Library and book reader

Definition of Done: import, read, highlight, note, bookmark, ink and resume work for PDF, EPUB and DOCX on the owner's iPad; backups carry books; Replace accepts older backups whose upgrades only added tables.

## C1 · Books notebook, import, book page, gallery (Dexie 14)

Covers: V library with % progress and Continue, V "Books notebook with gallery", V book page, S Library = view of Books notebook, S tags/search work the same, RM batch 7, open issue "Replace from older zips" (table-only part).

**Behaviour.**

- Library space shows the **Books** notebook as a **gallery**: covers, title, author, a progress bar and %, **▶ Continue** (or **Read again** when finished). **Import** (PDF, EPUB, DOCX; "DRM-free files only" said in the dialog). On a PC, drag files onto the Library.
- Each book is a page in Books: header (cover, title, author, ▶ Continue, progress, last read), then sections **Highlights & notes** (filled automatically, C4), **Summary**, **Cards**. Tags, search, sub-pages work as everywhere.
- A DOCX book becomes a normal page tree (one page per Heading 1) that opens **locked to reading**, so it reads with the same reader, ink and highlights as notes.
- The book opens where you left it.

**Technical.**

- Dexie **14**: `bookFiles: 'id, pageId'` (`{ id, pageId, name, mime, size, bytes: Blob }` + record fields), `annotations: 'id, pageId, [pageId+kind], updatedAt'`.
- `Page.book?: { fileId: string; format: 'pdf' | 'epub' | 'docx'; author?: string; coverImageId?: string; pageCount?: number; progress?: number; at?: string; openedAt?: number }` (optional field, no index). `at` is a locator string: `pdf:<page>:<yFraction>` or `epub:<cfi>`; progress and `at` are written on reading pause (2 s still), on hide and every 30 s, never per scroll event.
- Notebook `kind: 'books'` (created on first Library open; one per workspace; listed in the Notebooks space too).
- `src/library/` (new feature folder): `libraryService.ts` (import, list, open, delete → normal page Trash), `importBook.ts` (size cap 300 MB; MIME and magic-byte checks: `%PDF`, zip with `mimetype` = `application/epub+zip`, DOCX zip with `word/document.xml`), `cover.ts` (PDF page 1 via pdf.js at 300 px wide → WebP into `images`; EPUB cover from the package; DOCX: generated title cover), `LibraryScreen.tsx`, `BookHeader.tsx`. Libraries lazy-loaded (`import()`), never in the first load.
- DOCX: `mammoth` (BSD-2) → sanitise with the existing `sanitizePastedHtml` → BlockNote HTML parse → blocks via `mapping.ts` only; pages split at Heading 1; `readFirst: true` + `locked to reading`.
- Annotation shape (used by C2–C4 and for note pages):
  ```ts
  interface Annotation extends BaseRecord {
    pageId: string // book page or note page
    kind: 'highlight' | 'note' | 'bookmark'
    colour?: 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
    anchor:
      | { type: 'block'; blockId: string; from?: number; to?: number }
      | { type: 'pdf'; page: number; rects: number[] } // x, y, w, h groups, 0–1 of the page
      | { type: 'epub'; cfi: string }
    quote?: { exact: string; prefix: string; suffix: string } // W3C TextQuoteSelector, re-anchoring fallback
    note?: string // ≤ 20,000 chars
    chapter?: string // label at creation, for filters
    savedTo?: { pageId: string; blockId: string }[]
    origin: 'user' | 'ai' // AI hook (Phase P)
  }
  ```
- Bookmarks of note pages move from `readingMarks.ts` (device) into `annotations` once (key `marks.moved1`), keeping the device list as a backup until the next version.
- Backups: tables are picked up automatically by `fullFile.ts`; `share/checkRows.ts` validates `bookFiles` and `annotations` field by field; "Notes only" keeps book rows with empty bytes (like pictures). **Replace rule:** add `TABLE_ONLY_VERSIONS = [13, 14]` (grows with every table-only version) in `share/restore.ts`: a file whose version is older but every version between it and now is table-only can Replace (missing tables start empty); upgrade test from a v12 and a v13 file.
- CSP (`public/_headers`): add `frame-src 'self' blob:` (EPUB in a sandboxed iframe, C3); keep `script-src 'self' 'wasm-unsafe-eval'`; add `worker-src 'self' blob:` (exists) for the pdf.js worker shipped as a file.
- Search: Books chip becomes real (book pages); Highlights chip lists annotations (C4).

**Tests.** Unit: import validation (bad magic, too big), `book` field validation, locator parse, Dexie 13→14 upgrade test, restore table-only rule. E2E `library.spec.ts`: import a small PDF, EPUB and DOCX fixtures (`e2e/fixtures/`), gallery cards with %, Continue opens, progress saved after reload, DOCX pages read-only, backup round trip with a book. Owner: import a real book of yours of each type.

**Risks.** Large Blobs in IndexedDB on iOS (RESEARCH Q8): test a 100 MB PDF on the iPad; if it fails, store in 8 MB chunks (`bookFiles` rows with `part`). Storage quota: show the size in Settings › This device.

## C2 · PDF reader with ink

Covers: V PDF reading, V Contents with page numbers, S "PDFs use the same layers on their real pages", uniformity rule.

**Behaviour.** Continuous vertical pages (or one page at a time), fit width, pinch or +/- zoom, page numbers, Contents from the PDF outline, text selection (where the PDF has text), highlights in five colours, the same ink tools, layers and Lasso on the pages, the same Reader controls. Scanned PDFs (no text) say "This PDF has no text layer: highlights become drawn boxes" and highlight by rectangle.

**Technical.**

- `pdfjs-dist` (Apache-2.0), newest version at least 2 weeks old, pinned exactly; worker as a bundled file. `src/reader/pdf/PdfView.tsx`: virtualised pages (render the visible page ± 1), canvas per page within `canvasBudget` (cap scale so width × height < 16.7 M px), text layer (`TextLayer`) for selection.
- Ink: generalise `InkSurface` with an **anchor provider** interface: `{ frames(): Map<anchorId, Rect>; anchorAt(pt): anchorId }`; notes use blocks (today), PDFs use `pdf:<pageNo>` with the page rect; strokes are stored in page-fraction coordinates (exact under zoom). No new tables: `inkLayers`/`inkChunks` keyed by the book page id.
- Highlights → `annotations` `{ type: 'pdf', page, rects }` + `quote`.
- Find (B3) uses pdf.js text content.

**Tests.** Unit: rect normalisation, anchor provider maths. E2E with a 3-page fixture: render, select text, highlight saved and redrawn after reload, pen stroke on page 2 stays on page 2 after zoom, Contents jump. Owner: a long real PDF: smooth scroll? ink on pages?

**Risks.** iOS canvas memory → budget + releasing off-screen canvases. Big PDFs slow to open → show page 1 first.

## C3 · EPUB reader with ink

Covers: V EPUB, V page-turn animation, V Aa applies, S ink anchors to paragraphs with "drawn at" and View as drawn.

**Behaviour.** Reflowable book with the Aa sheet (fonts, size, spacing, margins, themes, alignment), Scroll or Pages (slide animation; page curl not offered), Contents with locations, the same highlights, notes, bookmarks and ink. Ink moves with its paragraph; **View as drawn** temporarily restores the text settings used when the ink was drawn.

**Technical.**

- foliate-js (MIT) vendored at a pinned commit in `src/vendor/foliate-js/` with its LICENSE and a README line (commit hash, date); our wrapper `src/reader/epub/EpubView.tsx` is the only importer (swap to `epubjs` stays possible). Book content in a sandboxed iframe (`sandbox="allow-same-origin"`, no scripts) under the CSP.
- Ink anchor provider for EPUB: anchors = CFI of the paragraph element (`epub:<cfi>`), frames from the element's client rect; stroke `drawn` (exists) stores width and font size; View as drawn = apply those reading prefs while toggled.
- Highlights via foliate's overlayer; stored `{ type: 'epub', cfi }` + `quote`.

**Tests.** E2E with a small EPUB fixture: open, paginate, Aa size change keeps position, highlight survives reload, ink stroke moves with its paragraph after a size change, View as drawn toggles. Owner: read a chapter in Pages mode.

**Risks.** foliate-js API changes (pinned); ink in Pages mode across column breaks: if anchoring fails, ink is offered in Scroll mode only and the Pen pill says so (fallback logged).

## C4 · Highlights, notes, annotations, deep links, export

Covers: N21 (all parts), V annotations panel with filters, V selection pop-up (Highlight colour, Look up, Note, Copy, Pin), V highlights as hyperlinks, V AI hooks, S highlights land on the book page automatically, inspiration "export highlights".

**Behaviour.**

- Select text (book or note page, while reading) → pop-up: five colours, **Note**, **Copy**, **Look up**, **Pin** (= bookmark here), **Save to…**.
- **Save to…**: this book's page (default and automatic for books), any page (picker), a new "Highlights" page, or the page's Summary. The saved line is a link back.
- Every highlight and note **links to the exact spot**: tapping it opens the reader there with B2's landing glow (`#/read/<pageId>?at=<locator>`).
- **Annotations panel** (reader ⋯ and the book page): filters by type (highlight, note, bookmark), colour and chapter; tap to jump; long-press to edit or delete (Undo).
- **Export highlights**: Markdown file or copy (quote, note, location, link).
- AI hooks (no AI yet): every annotation keeps `origin`; `src/ai/hooks.ts` defines `interface NoteMaker { fromAnnotations(pageId: string): Promise<DraftBlocks> }` with no implementation, so Phase P plugs in.

**Technical.** `src/reader/annotations/` (`annotationService.ts`, `AnnotationsPanel.tsx`, `SelectionPopup.tsx`, `deepLink.ts`); note pages' highlights stay BlockNote highlight marks (they move and copy with text) and the panel lists them by scanning the page's blocks, plus `annotations` rows for notes and bookmarks; router (`app/router.ts`) gains route `read` with `pageId` and `at`; Search's Highlights chip queries `annotations` by text (simple contains over at most 2,000 rows per query, paged).
**Tests.** Unit: re-anchoring by quote when a block changed; deep link parse. E2E: highlight → saved on book page automatically; Save to another page → link back opens and glows; filters; Markdown export content. Owner: highlight ten passages in a real book; does the book page collect them?

## C5 · Reader extras

Covers: V/Read-set extras (Page Flip, time left in chapter and book, Look up dictionary/translation/Wikipedia, vocabulary builder, reading goals/streak, custom theme (B1), Liquid mode, export (C4)), N3 orientation lock.

**Behaviour.** **Page Flip**: a scrubber with a page preview and "Back to p. 42". **Time left** in chapter and book from your measured reading speed (fallback 220 wpm). **Look up**: Dictionary (Wiktionary), Wikipedia, Translate (opens the web page for that word only, in a new tab; privacy line in Settings). **Vocabulary**: "Add to vocabulary" from Look up → a card in a "Vocabulary" page of the book's notebook. **Liquid mode (beta)** for text PDFs: reflowed text with "Show original" always one tap away. **Orientation**: Settings › Reading › Lock orientation tries the browser lock; if the iPad refuses (it does while multitasking), the app explains how to use the Control Centre rotation lock.
**Technical.** `reader/extras/` (`pageFlip.tsx`, `timeLeft.ts` with a rolling words-per-minute average stored per device, `lookup.ts`, `vocabulary.ts`, `liquid.ts` from pdf.js `getTextContent()` grouping lines by y-gaps and font size, `orientation.ts` with try/catch around `screen.orientation.lock`).
**Tests.** Unit: time-left maths, liquid grouping on a fixture, orientation fallback message. E2E: Page Flip return, vocabulary card created.
**Parked:** bubble zoom (later, IDEAS), sync of progress (Phase L), offline dictionary (Phase O), Kindle/Apple Books/Audible connections (parked by owner).

---

# Phase D — Left panel and tidy-ups

## D1 · Pages · Outline · Audio panel, sidebar clean-up, small fixes

Covers: S left panel approved, N14 ("3-line" item, see decisions), N1, N16, LIMITATION "pages can't be dragged".

**Behaviour.**

- A **Panel** button first on the main bar opens a left panel with tabs **Pages** (thumbnails of the notebook's pages: title + first lines; real page images for PDFs), **Outline** (the same heading tree as B2's Contents), **Audio** (recordings of this page; shown once G2 exists). Docked on wide screens, overlay on narrow.
- Sidebar (N1): names wrap to two lines instead of "Claud…"; row icons only on hover, focus or in an "Edit" mode; equal 36 px rows; consistent spacing. Pages can be dragged in the tree (finger: long-press then drag; Pencil/mouse: drag).
- Lock screen (N16): PIN field with placeholder "Type your PIN here", visible border and Unlock button outline, contrast ≥ 4.5:1; Face ID: clear error messages by cause (cancelled, not set up, needs iCloud Keychain, not supported here).

**Technical.** `src/app/panel/LeftPanel.tsx`; `pages/PageTree.tsx` drag (reuse notebook drag code; `movePage` service; keyboard alternative Move up/down); `app/lock/` WebAuthn: call `navigator.credentials.get` directly inside the tap handler (no `await` before it), log `err.name` and time-to-fail (< 100 ms = refused before a sheet), map to messages.
**Tests.** E2E: panel tabs, outline jump, sidebar names not truncated at 280 px width, page drag reorder + Undo, PIN field accessible name and contrast. Owner: Face ID unlock in the installed app (iPadOS 26.3+).

---

# Phase E — Review decks

## E1 · Decks, Pause, Review home (Dexie 15)

Covers: S Review rework (all bullets), S pause/suspend, FSRS 90%, IDEA bulk actions on cards (pause part), owner "All cards works great: keep its strengths".

**Behaviour.**

- **Review home**: **All cards** (default deck) and your **decks** as tiles with three numbers (New · Learning · Due) and **Study**.
- **New deck** in three short steps: **Where** (tree picker: notebooks › pages › sub-pages with ▾, tick any level; "Books" collection), **Which cards** (tags any/all, state: new, learning, due, all), **Name** (+ colour). A live "N cards match" line. Tapping a notebook in the tree reviews everything in it.
- Decks are live filters (they refill by themselves). Old saved searches stay; each card search gets a **Make deck** button (once offered on the Review home: "Turn your saved searches into decks?").
- **Pause** a notebook, a page/chapter (with its sub-pages) or a card: stops showing in reviews, nothing is lost; **Paused** list in Review with **Resume**.
- Settings › Review: **Target memory 90% (recommended)** in plain words ("Higher means more reviews").

**Technical.**

- Dexie **15**: `decks: 'id'`:
  ```ts
  interface Deck extends BaseRecord {
    name: string
    order: OrderKey
    colour?: string
    scope: {
      notebookIds: string[]
      pageIds: string[]
      withSubpages: boolean
      notebookKinds?: string[]
    }
    tagIds: string[]
    tagMode: 'any' | 'all'
    states: ('new' | 'learning' | 'due' | 'all')[]
    routeOrder?: boolean
  }
  ```
- Pause: `Notebook.paused?: true`, `Page.paused?: true` (optional fields, no index) + a `meta` row `paused.ids` (ids list kept by `pauseService.ts`) so `recall/reviewService.ts` `reviewable` checks a Set (no table scan); cards keep `suspendedAt` (existing) for single cards. Ancestor check via `getPagePath` cached per queue build.
- `recall/deckService.ts` builds `getReviewQueue` scopes from a deck (existing scope kinds + tags); counts with the same code (speed test with 10,000 cards < 300 ms).
- `TABLE_ONLY_VERSIONS` += 15.
  **Tests.** Unit: deck query (scope, tags any/all, states), pause excludes, resume, counts speed test, upgrade 14→15. E2E: create a deck in three steps, study it, pause a notebook, Paused list, Make deck from a saved search. Owner: build your real decks.

## E2 · Memory techniques (templates + helpers)

Covers: "Added 5 Nov: memory techniques" (all), IDEA pictures in recall cards (local part).
**Behaviour.** A **Memory techniques** section in Templates (and later the Layer gallery): **Memory palace** (a page with "rooms" as headings and cards in route order; its deck option "Walk the route" reviews in page order), **Vivid image** (a card answer can hold a picture or a sketch (ink)), **Major system** helper (type a number → word ideas from a small built-in English list; your own picks saved), **PAO table** (a database starter: person, action, object per 00–99), **Acronym/chunking builder** (select a list → first-letter acronym suggestion, card made), **Story/link method** template. Each has a one-screen "How to use" and an honest evidence line (memory palace: good initial evidence, medium effect in a 2021 meta-analysis; the others "widely taught; little direct research").
**Technical.** `templates/starterTemplates.ts` additions (starterVersion bump); `recall/` allows image blocks inside card answers (mapping + `cardParts`); `src/memory/majorSystem.ts` (digit → consonant sound table, word list file ≤ 30 KB, English only, i18n note); `deck.routeOrder`.
**Tests.** Unit: major system encoding, acronym builder. E2E: create a palace from the template, walk the route order.

---

# Phase F — Home cockpit (Dexie 16)

Definition of Done: the owner can run a full day (plan, tasks, matrix, timer, habits, evening review) on the iPad without Notion.

## F1 · Tasks, inbox, manual matrix, carry-over, tasks from notes

Covers: S Home tasks with carry-over, Upcoming, projects; S tasks from checklist lines; S matrix workflow (all bullets); Search Tasks chip.

**Behaviour.**

- **Inbox**: quick add (one line; words like "today", "tomorrow", "mon" set the day).
- **Matrix**: four boxes (Do · Schedule · Delegate · Drop, named in plain words), filled **only by dragging** from the inbox (or a "Move to…" menu for keyboard/VoiceOver). Never auto-sorted.
- Tick → moves to **Completed** (kept forever, by day). Unfinished and box-4 tasks are never deleted; each day's journal page shows a read-only **Day record** (done, carried, still open).
- Unfinished task options: **Tomorrow**, **Pick a day**, **Move to list…**; left alone, it simply stays (no auto roll-over, no guilt counter shown unless carried 3+ times: a quiet "carried 3×").
- **Upcoming** (by day) and **Projects** (a task's project; also used by the timer).
- Tasks from notes: on any checklist line, **→ Home** (in the block menu and the selection bar) makes a linked task; ticking either side ticks both.

**Technical.**

- Dexie **16** adds all Home tables (F2, F3 use them; one upgrade):
  `tasks: 'id, status, quadrant, plannedDay, doneDay, top3Day, projectId, sourceBlockId'`, `projects: 'id'`, `timeEntries: 'id, startedAt, day, projectId'`, `dayPlans: 'id, day'`, `habits: 'id'`, `habitChecks: 'id, habitId, day, [habitId+day]'`, `files: 'id, kind'`.
  ```ts
  interface Task extends BaseRecord {
    title: string
    status: 'open' | 'done' | 'dropped'
    quadrant: 0 | 1 | 2 | 3 | 4 /* 0 = inbox */
    order: OrderKey
    plannedDay?: string
    doneAt?: number
    doneDay?: string
    top3Day?: string
    projectId?: string
    listName?: string
    sourceBlockId?: string
    sourcePageId?: string
    carried: { from: string; to: string; at: number }[]
    estimateMin?: number
    note?: string
  }
  ```
  Days are local `YYYY-MM-DD` using the existing "Day starts at" hour (`core/time.ts`); times UTC ms.
- `src/home/` feature folder: `taskService.ts` (all writes; soft delete only), `quickAdd.ts` (date words in en/hi/es), `HomeScreen.tsx`, `Matrix.tsx` (drag with pointer events; finger long-press 0.4 s to lift; Pencil drag direct), `DayRecordBlock` (new pluggable block type `dayRecord` registered in `blocks/` and mapped in `mapping.ts`, rendering from the DB, inserted into journal day pages by `journalService` for new days).
- Note link: `taskSync.ts`: block checked ↔ task status; if the block's page is open in this window, apply via the editor (`editor.updateBlock`); otherwise write the block record (respects "editor → database while open").
- Search: Tasks chip searches task titles (index on title words: reuse `searchEntries` with kind `task`).
  **Tests.** Unit: quick add parsing, carry history, sync both ways, upgrade 15→16 test. E2E: add → drag to box 1 → tick → Completed; carry to tomorrow; day record on journal; → Home from a checklist line and tick from Home updates the note. Owner: one real morning.

## F2 · Top 3, project timer, Pomodoro, plan vs actual, reports

Covers: S Top 3, time blocks, Pomodoro with time log, time tracking by project only, reports (hours per project, daily timeline planned vs actual), S priorities shown completed or missed.

**Behaviour.** **Top 3** for today (from any task; "2 of 3" counter; at day end each shows ✓ or red ✕). **Timer**: one big start/stop, pick a **project** only; mode **Free** (counts up) or **Focus** (25/5, long break 15 every 4; lengths editable); a running chip on every screen (beside the now-playing pill); after 2 h "Still working?" (keep / stop at a chosen time). **Plan**: drag tasks or free blocks onto today's timeline. **Reports**: today and this week, hours per project (bars), and the **day timeline**: planned blocks vs actual timer entries side by side. No streaks, no guilt.
**Technical.** `home/timer.ts` (one running entry; elapsed = now − startedAt, never ticks; survives reload and sleep), `home/TimerChip.tsx` (`data-chrome`), `home/planService.ts` (`dayPlans`), `home/reports.ts` (pure aggregation; speed test with 20,000 entries), Wake Lock only while the Focus screen is visible. In-app sound at the end only if the app is open (no notifications, owner rule).
**Tests.** Unit: elapsed across a simulated sleep, Pomodoro cycle math, report aggregation, planned vs actual overlap. E2E: start, reload, still running; Focus cycle with fake clock; report numbers.

## F3 · Routines, habits, affirmations, evening journal, Briefing

Covers: S routines (morning/night, affirmations, meditation, exercise, daily checks), habit tracker with missed-day marks (red ✕), affirmations (read aloud or own recording; no timer, no cards), no notifications, evening journal, Briefing (app-made now, AI later), health data later.

**Behaviour.** **Routines** (Morning, Night) as tick lists of habits; a **7-day strip** per habit; a missed day shows a **red ✕** on Home. **Affirmations**: choose a page of bullet points → ▶ reads it aloud (B4 engine) **or** plays your own recording (record in the app). **Evening review** (after a time you set): done/not done, decide on unfinished tasks (F1 options), 1–3 journal prompts written into today's journal page. **Briefing** at the top of Home: today's Top 3, tasks due, cards due, habits left, yesterday's carried tasks (no reading, per owner). Health data: not on the web (later, native).
**Technical.** `home/habitService.ts` (`habits`, `habitChecks`), `home/Routines.tsx`, `home/briefing.ts` (pure; hook for AI later), recording via `MediaRecorder` (Safari 14.1+; `audio/mp4`) stored in `files` (`kind: 'audio'`), **Permissions-Policy** change in `public/_headers`: `microphone=(self)` (security review note in DECISIONS), journal prompts appended through `journalService`.
**Tests.** Unit: missed-day logic with the day-start hour, briefing contents. E2E: tick a habit; missed yesterday shows ✕; record (fake media stream in Chromium) and play; evening review writes to the journal. Owner: record an affirmation on the iPad.
**Web limits.** No reminders or notifications (owner rule; also web push needs a server). Health data needs a native app.

---

# Phase G — Ink and Insert complete

## G1 · Shapes, Ruler, Tape, Magnifier, lazy ink loading

Covers: S extras (Shapes, Tape, Magnifier, Ruler), owner decision 6 (they work on the ink layer only), Insert "coming" items, RM batch 6 (zoom), LIMITATION lazy ink loading.

**Behaviour.** **Shapes** tool (line, arrow, rectangle, ellipse, triangle; drag to draw; handles to adjust; pen colour and width). **Ruler**: a draggable ruler on the ink layer (two-finger or handle to rotate; angle shown); Pen strokes near its edge follow it. **Tape**: draw tape over any area to hide what is under it (ink and text); tap to peel/restore; **Make card** from a tape (the hidden area becomes the answer as a picture). **Magnifier**: a zoom window at the bottom (2×–4×) where you write big and it lands small at a moving target box. All on the active ink layer; Lasso can select them.
**Technical.** New stroke kinds in `core/inkTypes.ts`: `kind: 'ink' | 'highlight' | 'shape' | 'tape'` (add-only; old rows valid), shape params `{ shape, x, y, w, h, rot }`; ruler is UI state (not saved) with a snapping function in `ink/ruler.ts`; magnifier in `ink/Magnifier.tsx` maps points by scale + target offset; lazy loading: `inkService` loads chunks for blocks within ± 3 screens (query by `pageId` then filter in memory by anchor; add index `[pageId+blockId]` only if the 500-stroke test shows a need).
**Tests.** Unit: shape geometry, ruler snap, magnifier mapping, tape hit. E2E: draw each, tape peel, Make card from tape. Owner: write with the Magnifier for one minute.

## G2 · Table, Toggle list, File/PDF, Camera, Audio with ink replay

Covers: Insert order (Table, Shape, Picture, Camera, File/PDF, Callout, Audio, Recall card, Tape, Magnifier, Ruler), RM batch 6 "audio tied to handwriting", D1 Audio tab, Notability lesson (stroke `at` hook).
**Behaviour.** **Table** (BlockNote's own), **Toggle list**, **File/PDF** attachment (opens in the reader), **Camera** (take a photo into the page), **Audio**: record in the page; while recording, strokes remember the time; tapping a stroke later plays from that moment; the left panel's Audio tab lists recordings.
**Technical.** Add `table`, `toggleListItem`, `file`, `audio` from BlockNote `defaultBlockSpecs` to `editor/schema.tsx`; register types in `blocks/builtinBlockTypes.ts`; extend `mapping.ts` (only file that knows the format) and `share/checkRows.ts`; file/audio bytes in `files` with refs `lnfile:<uuid>` (like `lnimg:`), resolver in `src/files/fileRef.ts`; camera = `<input type="file" accept="image/*" capture="environment">` → `saveImage`; replay = stroke `at` vs recording `startedAt`.
**Tests.** Unit: mapping round trips for each new block; ref parsing. E2E: insert each; table edit; audio record (fake stream) and stroke tap seeks.

## G3 · Picture resize, mind map, ink labels

Covers: RM batch 5 (resizable pictures, mind map block with themes), S direct manipulation, RM batch 6 "ink blocks get a label for search", IDEA mind maps in cards (block part).
**Behaviour.** Drag a picture's corner to resize (Pencil, finger, mouse); a simple **mind map** block (central topic, branches, drag to rearrange, three themes); give a drawing a **label** (typed) so Search finds it. Handwriting-to-text is **not** offered on the web (no free on-device recognizer outside text fields); it waits for Phase P.
**Technical.** Image width stored in block props (BlockNote image `previewWidth`); custom touch handles; mind map as a new pluggable block (`blocks/mindMap`) with JSON content and SVG render; ink label on `InkLayer`/chunk group → search entry kind `ink`.
**Tests.** E2E: resize persists; mind map add/branch/reload; label found by Search.

---

# Phase H — Fonts and voices

## H1 · A small perfect font set + import your own

Covers: N4, S fonts, RM batch 4 handwriting fonts (English and Hindi).
**Behaviour.** Font tiles with a live preview of your own sentence: **Literata** (book serif), **Source Serif 4** (serif), **Atkinson Hyperlegible Next** (calm sans, readability), **Lexend** (easier reading), **OpenDyslexic** (kept), **Caveat**, **Kalam** (also Hindi), **Patrick Hand**, **Shantell Sans** (handwriting styles). **Import font** (.ttf, .otf, .woff2): stored on the device, in Everything backups, with a note that you are responsible for its licence. Fonts apply to reading (Aa) and notes (Style card).
**Technical.** `@fontsource/*` packages (all OFL-1.1, verified on npm), pinned, loaded only when picked or previewed (`app/reading/fonts.ts`), Latin + Devanagari subsets; imported fonts in `files` (`kind: 'font'`), registered with the `FontFace` API at start for the ones in use; validation: size ≤ 10 MB, magic bytes (`OTTO`, `\0\1\0\0`, `wOF2`); exports (J1) fall back to a bundled font for imported ones. OFL licence texts shipped in `public/licenses/`.
**Tests.** Unit: font file validation; E2E: pick each, import a test font, backup round trip includes it.

## H2 · Optional on-device natural voice (owner decision)

Covers: N22 "natural, calm voice", IDEA nicer voices. **Only if the owner says yes** (decision D5).
**Behaviour.** Settings › Reading › **Natural voice (download ~80 MB once)**: English voices that run on the iPad, no data sent; then the player can use them, with lock-screen controls.
**Technical.** `kokoro-js` (Apache-2.0) in a Web Worker, model from the Hugging Face CDN (CSP `connect-src` adds that host; files are too big for Cloudflare Pages' 25 MiB limit), cached by the service worker; audio played through an `<audio>` element → Media Session API for lock-screen controls. Measure first-sentence latency on the iPad; if > 3 s, keep device voices as default.
**Risks.** Memory on older iPads; WebGPU not required (WASM path).

---

# Phase I — Views and Layer gallery (Dexie 17)

## I1 · Notebook View ▾ and per-tab views

Covers: S notebooks keep the default + optional views (Shelf, Tabs), S per-tab views (list, gallery, shelf, board, table, calendar), IDEA "+ View", IDEA custom notebook tab templates.
**Behaviour.** Every notebook has **View ▾**: Default (today's notebook home), **Shelf** (GoodNotes-like covers and page thumbnails), **Tabs** (OneNote-like coloured section tabs: top-level pages as tabs, sub-pages listed). Each tab inside a notebook home (Pages, Review, Summary, Databases…) has its own view (list, gallery, shelf, board, table, calendar where it makes sense), remembered.
**Technical.** `Notebook.view?: 'default' | 'shelf' | 'tabs'`, `Notebook.tabViews?: Record<string, ViewKind>`, `Page.tabColour?: string` (optional fields, validated in `checkRows`); views reuse `databases/views/viewTypes.ts` renderers where possible (gallery, board, table, calendar) over page lists.
**Tests.** E2E: switch views, remembered after reload, Tabs colours.

## I2 · Layer gallery and shareable templates

Covers: S Layers option A + Layer gallery, S future layers (finance tracker), S "a finance setup should be shareable as a template", audience: friends and communities, IDEA publish databases (file part).
**Behaviour.** Quiet corner › **Layer gallery**: cards with a preview and "what it adds" (starters: **Finance tracker**, **Memory techniques kit**, **Study kit**); **Add** installs it as normal notebooks/templates/databases; **Remove** takes away only what it added and you never changed (asks otherwise). **Share as layer file** from any notebook (a file friends open with Add).
**Technical.** Dexie **17**: `layerInstalls: 'id, packId'` (`{ packId, version, installedAt, createdIds: { table: string; id: string; hash: string }[] }`); packs are the existing bundle format (`share/bundle.ts`) + `layer.json` manifest (validated, sizes capped); starters in `src/layers/packs/`; uninstall soft-deletes items whose content hash is unchanged.
**Tests.** Unit: manifest validation, uninstall rule. E2E: add finance, use, remove.

---

# Phase J — Share and export

## J1 · PDF, Word, Markdown, text, the share sheet

Covers: N5 (PDF, Word, share sheet; link → after sync), S share/export approved, IDEA page ⋯ Import/Export (Export part), LIMITATION ink in shared files.
**Behaviour.** Page ⋯ › **Export** (and notebook menu): **PDF**, **Word (.docx)**, **Markdown**, **Text**; then **Share…** opens the iPad share sheet (Mail, WhatsApp, Files…) or saves the file on a PC. Locked pages are left out unless unlocked now (asks). Ink is included (as vector in PDF, as pictures in Word). Notebook files ("Share one notebook", "Add as copies") now carry ink.
**Technical.** PDF: a print view (`share/print/PrintView.tsx` + print CSS, fonts as on screen) with `window.print()`; owner check in the installed app; **fallback** if print fails there: `jspdf` (MIT) layout engine `share/pdfExport.ts` with bundled TTF fonts (OFL) for Latin and Devanagari. Word: `docx` (MIT) builder from blocks (`share/docxExport.ts`: headings, runs with marks and colours, lists, checklists as ☐/☑, quotes, code, images downsized to 1600 px, cards as Q/A, ink via `ink/screenshot.ts` PNG after its anchor block). Share: `navigator.canShare({ files })` → `navigator.share`, else download. Bundles: `share/bundle.ts` adds `inkLayers`/`inkChunks` with id remapping.
**Tests.** Unit: docx structure (unzip and check XML parts), markdown output, bundle with ink round trip. E2E: export each format (download event), share fallback. Owner: PDF and Word from the installed app via the share sheet.
**Parked:** share as a link (needs Sync + accounts: Phase L/Q).

---

# Phase K — Close Phase 9 (before sync)

## K1 · Debt and data safety

Covers: HANDOFF open issues (audit warnings; Replace from older zips; Delete forever keeps pictures), LIMITATIONS (two-window refresh note, WebKit test failures), IDEA restore that streams, IDEA clean up unused pictures (size display), DECISIONS rows still open.
**Work.** `npm audit` review; Delete forever erases picture, file and book bytes no longer referenced (Trash `purge*` + reference scan of `lnimg:`/`lnfile:` refs, one transaction per item); full upgrade path for Replace from any older version (temp database at the old version, run the upgrades, then copy) with tests from v10–v16 fixtures; streaming restore for big files (fflate streaming unzip → bulkPut per 2,000 rows); storage usage screen; re-run the two parked WebKit failures; refresh LIMITATIONS.
**Tests.** Upgrade fixtures; purge tests; a 500 MB synthetic restore in Chromium without exceeding memory.

## K2 · Languages, accessibility, the three-day trial

Covers: RM batch 8 (three-day trial, Spanish and Hindi native review), global rules (VoiceOver, Voice Control, keyboard, contrast, RTL), IDEA Hindi BlockNote menus, IDEA translated sample notebook and dates, owner deliverable "list of every feature with visuals" (if not delivered earlier).
**Work.** Native review lists exported from `i18n` (new strings since Phase 9); VoiceOver and Voice Control pass on iPad (owner) for bars, reader, Home, Review; RTL screenshot pass (pseudo-RTL); axe checks in e2e for every new screen; three-day trial with the owner and one tester; close Phase 9 per `rules/phase-end.md` (LEARNING, archive, retrospective).

---

# Phase L — Sync (roadmap Phase 10)

Planning talk first (owner). Design approved in [RESEARCH.md](../RESEARCH.md); summary of its ordered steps, each a session:
L1 order keys with id tie-break and suffix (fix bug 1) + stable ids (workspace, journal, day/month pages, templates, card ids from their block) + `updatedAt` on every write · L2 device tests (sign-in, Argon2id time/memory, Web Crypto) · L3 connectors (record store Supabase, file store Drive, sign-in provider; vendor code only inside them, lint-enforced) · L4 Google sign-in limited to the owner's email; never wipes local notes · L5 end-to-end encryption (master key, passphrase, printed recovery code, Drive spare key) · L6 data fields (`deviceId`, `rev`/`baseRev`, `serverSeq`, `mergeMode`, `formatVersion`; add-only Dexie) · L7 sync and merge rules per data type (blocks: newest edit wins per block, loser to History; three-way text merge per block before Yjs; ink chunks, books, annotations, tasks, decks, habits each with a rule) · L8 pictures/books/audio to Drive (encrypted, queued), encrypted Drive backups when open, first merge of PC and iPad, limits and privacy, clock skew, health-data privacy review. Also: reading progress and bookmarks sync, favourites move into notes, share-as-link groundwork, "Delete forever" clears cloud copies.

# Phase M — Summary · Notes · Review tabs (roadmap Phase 11)

Planning talk first. Page, notebook and app levels; "Add to Summary" keeps lines linked; fits the existing notebook tabs; C4's "Save to Summary" uses it.

# Phase N — Maths, new-page start, Calendar Day (roadmap Phase 12)

N1 visual maths editor + LaTeX, loaded only when used; N2 new page start with a template list ("Study (Recommended)" first, "Always start new pages as Study"); N3 Calendar Day view (full-page card, swipe days; Year parked).

# Phase O — Polish pack (roadmap Phase 13)

One commit per item, ≤ 7 owner checks of ≤ 2 minutes. Pool: every IDEAS.md polish row (see traceability), selection bar customisation beyond A3, two-window live refresh, FSRS personal training (optimizer after a few hundred reviews), highlight resurfacing (Readwise-style daily review in Review), offline dictionary, bubble zoom, reading goals sync, voice commands (online speech with a one-time privacy notice) and full hands-free use, menus pin/reorder/hide.

# Phase P — AI (roadmap Phase 14)

Only after the owner approves the cost. "Allow AI" per notebook, off by default, listed in Settings › Permissions; only chosen text is sent; AI changes shown for approval with one-tap Undo. Plugs into C4's `NoteMaker` hook (notes, summaries, cards from highlights), handwriting to text and maths (beta), Story so far / Ask this book, learning companion, MCP through a local server on the PC. Hindi handwriting needs a paid model.

# Phase Q — Before global launch (roadmap Phase 15)

Smart merge, passkeys, sign-up, cost model (users pay or bring storage), own domain (costs money: ask), privacy policy, account deletion, GDPR/DPDP/app-store checks, ~20 Safari smoke tests per push if free minutes allow; App Store app by wrapping this web app (Capacitor; needs a Mac and $99/yr: owner approval) — a native wrapper is also the only route to PencilKit latency, per-element Scribble control, Pencil Pro squeeze, health data, widgets and notifications.

---

# Existing features: review and improvements

| Area (built)                                  | Keep / improve                                                                                              | Where          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| Notebooks, pages, nesting, journal, templates | Keep; page drag in sidebar; move page to another notebook must update cards (IDEA)                          | D1; O          |
| Editor and blocks                             | Keep; add Table, Toggle, File, Audio (BlockNote ships them); Title block (decision row)                     | G2; O          |
| Databases, views, dashboards, tracker         | Keep; IDEAS board/table extras; databases as blocks                                                         | O; after L     |
| Cards, FSRS 90%, Review screen, All cards     | Keep; decks, pause, plain words; pictures in cards                                                          | E1; E2         |
| Revise tab, marks, summary                    | Keep; feeds Phase M                                                                                         | M              |
| Links, tags, search                           | Keep; Books/Highlights/Tasks chips real; typo-tolerant search exists (suggest)                              | C1, C4, F1     |
| Lock                                          | Keep (owner: works); PIN visibility, Face ID messages; real encryption                                      | D1; L          |
| Reading mode, read aloud                      | Rework                                                                                                      | B1–B4          |
| Backup and restore                            | Keep; table-only Replace; full upgrade path; streaming                                                      | C1; K1         |
| Toolbar, ribbon, control panel/Search         | Keep; A fixes; names; z-order                                                                               | A4             |
| Ink engine                                    | Keep; isolation, 2 layers, universal lasso, canvas budget, lazy loading, new tools                          | A1–A2, G1      |
| Pictures                                      | Keep; resize by drag; cleanup                                                                               | G3; K1         |
| i18n, help tips                               | Every new string in en + hi + es; help line per new feature                                                 | every step; K2 |
| Offline/PWA/updates                           | Keep; About section with version and update check                                                           | A1             |
| Performance                                   | First load stays ≤ 350 KB (readers, pdf.js, foliate, mammoth, docx, jspdf lazy); Pencil tap → pill ≤ 100 ms | every step     |

---

# Traceability (every request → step, or parked with reason)

| ID                | Request (short)                                                                                                                  | Step / status                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| N1                | Sidebar messy, truncated names                                                                                                   | D1                                                                                  |
| N2                | Reader top bar blurry                                                                                                            | B1                                                                                  |
| N3                | Orientation lock                                                                                                                 | C5 (web limit; Control Centre fallback)                                             |
| N4                | Fonts + import own                                                                                                               | H1                                                                                  |
| N5                | Share: PDF, Word, link, share sheet                                                                                              | J1 (link → L/Q)                                                                     |
| N6                | New line on the short bar by default                                                                                             | Built (step 2); A4 test keeps it                                                    |
| N7 (redesign #11) | ⋯ menu behind the ribbon                                                                                                         | A4                                                                                  |
| N8 (redesign #7)  | Pencil press-and-drag on tools                                                                                                   | Built (step 2, 350 ms); Phase A gate check                                          |
| N9 (redesign #8)  | Short bar too full, unclear                                                                                                      | Built (step 2); R4-2 cleanup A4; names A4                                           |
| N10               | iPadOS shortcut bar is not ours                                                                                                  | Explained (help text, B1)                                                           |
| N11 (redesign #9) | Edit bar first in ⋯                                                                                                              | Built (step 2)                                                                      |
| N12               | Pencil select deletes content                                                                                                    | A1 (structural), A3; Phase A gate                                                   |
| N13               | Undo/Redo with pictures; History before big deletes                                                                              | Built (3a); kept by tests; gate check                                               |
| N14               | "3-line" item on the short bar                                                                                                   | D1 Panel button (decision D2)                                                       |
| N15               | Page address ▸, Device mode ▸: don't change                                                                                      | No change (tests guard)                                                             |
| N16               | PIN field visibility; Face ID failed                                                                                             | D1                                                                                  |
| N17               | Lock works                                                                                                                       | No change                                                                           |
| N18               | Toggle jumps to Home tab                                                                                                         | A4                                                                                  |
| N19               | Reader ✕ unreachable when scrolled; Settings choice                                                                              | B1                                                                                  |
| N20               | Word-style navigation pane                                                                                                       | B2 (+ D1 Outline)                                                                   |
| N21               | Reading workflow: colours, notes, save to notebook, links back, list                                                             | C4                                                                                  |
| N22               | Audible player, robotic voice, repeats                                                                                           | B4; H2 (natural voice, decision D5)                                                 |
| N23               | Sepia ribbon band                                                                                                                | A4                                                                                  |
| N24               | Now playing control everywhere                                                                                                   | B4                                                                                  |
| N25               | Dedicated reader controls (Aa inside reader)                                                                                     | B1                                                                                  |
| V-1               | Library with % progress, opens where left                                                                                        | C1                                                                                  |
| V-2               | Contents with page numbers                                                                                                       | B2, C2, C3                                                                          |
| V-3               | Annotations panel with filters (type, colour, chapter)                                                                           | C4                                                                                  |
| V-4               | Aa sheet tabs, saved custom themes, brightness                                                                                   | B1 (brightness → Dim overlay, web limit)                                            |
| V-5               | Page-turn animation                                                                                                              | B2 (slide), C3; page curl parked (not in foliate; later)                            |
| V-6               | Selection pop-up (colour, Look up, Note, Copy, Pin)                                                                              | C4                                                                                  |
| V-7               | Read aloud like Audible                                                                                                          | B4                                                                                  |
| V-8               | Highlights are links back                                                                                                        | C4                                                                                  |
| V-9               | AI hooks now                                                                                                                     | C4 (`origin`, `NoteMaker`), P                                                       |
| V-10              | Books notebook gallery; book page sections                                                                                       | C1                                                                                  |
| V-11              | One space, read and note together (no split view)                                                                                | C2–C4; RM split view dropped (owner)                                                |
| V-12              | Feature list with visuals; organisation research; questions one at a time                                                        | Feature map: after Phase A gate (artifact); research: this plan + research file     |
| S-1               | 4 spaces + Search, quiet corner                                                                                                  | Built (4a)                                                                          |
| S-2               | Home cockpit items                                                                                                               | F1–F3                                                                               |
| S-3               | Tasks from checklist lines                                                                                                       | F1 (decision D3)                                                                    |
| S-4               | One core; layers as views/templates                                                                                              | I2                                                                                  |
| S-5               | Finance and future layers, shareable                                                                                             | I2                                                                                  |
| S-6               | Matrix workflow (manual, completed, never deleted, carry)                                                                        | F1                                                                                  |
| S-7               | Project-only timer, hours per project, planned vs actual                                                                         | F2                                                                                  |
| S-8               | Routines, habits, red ✕, affirmations, no notifications                                                                          | F3                                                                                  |
| S-9               | Library formats PDF, EPUB, DOCX; no Kindle import                                                                                | C1–C3; Kindle parked (owner)                                                        |
| S-10              | Reader: one view (superseded: keep both views, same controls)                                                                    | B1                                                                                  |
| S-11              | Ink layers in reader, anchored to paragraphs, drawn-at, View as drawn; PDFs on real pages                                        | C2, C3                                                                              |
| S-12              | Uniformity rule                                                                                                                  | A1–A2, C2–C3                                                                        |
| S-13              | Library = gallery view of Books; highlights land automatically; tags/search same                                                 | C1, C4                                                                              |
| S-14              | Review decks, tree picker, merge saved searches                                                                                  | E1                                                                                  |
| S-15              | Pause notebook/chapter/card                                                                                                      | E1                                                                                  |
| S-16              | Deep research on each inspiration app                                                                                            | research files (this round + earlier)                                               |
| S-17              | Notebook views Default/Shelf/Tabs; per-tab views                                                                                 | I1                                                                                  |
| S-18              | Toolbar redesign (rows, pill, detail card, undo pill)                                                                            | Built (step 2)                                                                      |
| S-19              | Left panel Pages/Outline/Audio                                                                                                   | D1                                                                                  |
| S-20              | Extras: Shapes, Tape, Picture, Magnifier, Ruler                                                                                  | G1 (Picture built)                                                                  |
| S-21              | Short bar order                                                                                                                  | Built; ⌫ added after ↵ (A3)                                                         |
| S-22              | Short-bar picture (image)                                                                                                        | M0 (Playwright PNGs)                                                                |
| S-23              | Snapping pill, pin, calm bar                                                                                                     | Built; R4-1 A4                                                                      |
| S-24              | 📖 Read button; Kindle-style options                                                                                             | Built; B1                                                                           |
| S-25              | Device modes stay                                                                                                                | No change                                                                           |
| S-26              | NEW BUG Pencil taps not registering                                                                                              | A1 (chrome taps, touch cancels, About/update)                                       |
| S-27              | PENDING batch 3a                                                                                                                 | Built (commit 6a8faed)                                                              |
| S-28              | Aa pill                                                                                                                          | Built                                                                               |
| S-29              | Direct manipulation everywhere                                                                                                   | Pills built; pictures G3; shapes G1                                                 |
| S-30              | Pen pill, highlighter tool, 5 pens, eraser modes                                                                                 | Built (steps 2–3)                                                                   |
| S-31              | Lasso: free/rect, filters, menu, screenshot, separate handles, convert to text/maths                                             | Built + A2 (universal, mixed screenshot); convert → P (web limit)                   |
| S-32              | Insert order                                                                                                                     | G1–G2                                                                               |
| S-33              | New line hold and settings                                                                                                       | Built                                                                               |
| S-34              | Read set extras (Page Flip, time left, ruler, Look up, vocabulary, goals/streak, curl, theme, Liquid, export, bubble zoom, sync) | C5, B1, C4; bubble zoom → O; sync → L; curl → later                                 |
| S-35              | Fonts small set + import, OFL                                                                                                    | H1                                                                                  |
| S-36              | Share/export last; share sheet                                                                                                   | J1                                                                                  |
| S-37              | Templates shareable (friends, communities)                                                                                       | I2                                                                                  |
| SCH-1             | FSRS 90%, adjustable in plain words                                                                                              | Built (setting 70–97, default 90); wording E1                                       |
| MEM-1..6          | Memory palace, vivid image, Major/PAO, chunking/acronym, story, evidence labels                                                  | E2                                                                                  |
| R4-1              | Side pill must stay a thin strip                                                                                                 | A4                                                                                  |
| R4-2              | Duplicate/stray main-bar icons                                                                                                   | A4                                                                                  |
| R4-3              | Hide the top toolbar while reading                                                                                               | B1                                                                                  |
| R4-4              | Reader search: current menu + scope filter, This page first                                                                      | B3 (details: decision D4)                                                           |
| R4-5              | Contents and Bookmarks separate                                                                                                  | B2                                                                                  |
| R4-6              | Bookmark feedback, margin marks                                                                                                  | B2                                                                                  |
| R4-7              | Opened bookmark flashes its spot                                                                                                 | B2                                                                                  |
| R4-8              | Same-duration smooth jump + glow                                                                                                 | B2                                                                                  |
| R4-9              | Pill drag scrolls page, keyboard, blank area, mid-screen                                                                         | B1 (+ A1 canvas budget)                                                             |
| R4-10             | Tool names on hover / long-press                                                                                                 | A4 (decision D6)                                                                    |
| R4-11             | Selection disappears after ~1 s                                                                                                  | A3                                                                                  |
| R4-12             | ✕ to deselect; tap elsewhere                                                                                                     | A3                                                                                  |
| R4-13             | Own selection bar instead of iOS bar; customisable                                                                               | A3 (web limit in Text with keyboard)                                                |
| R4-14             | ⌫ beside ↵                                                                                                                       | A3                                                                                  |
| R4-15             | Page/bar jump with the keyboard                                                                                                  | A4                                                                                  |
| R4-16             | Undo/Redo open the keyboard                                                                                                      | A4                                                                                  |
| R4-17             | Pencil taps on the bar became Scribble                                                                                           | A1                                                                                  |
| R4-18             | Lasso bar in all cases; outline missing once                                                                                     | A3                                                                                  |
| R4-19             | Selection handles, animation, invisible selection                                                                                | A3                                                                                  |
| R4-20             | Pen doesn't draw over text / new page                                                                                            | A1                                                                                  |
| R4-21             | Bigger hit areas, no fall-through                                                                                                | A1                                                                                  |
| R4-22             | All chrome captures Pencil taps                                                                                                  | A1                                                                                  |
| R4-23             | Ink tools only on the ink layer; Lasso universal; Photoshop model                                                                | A1, A2                                                                              |
| R4-24             | Max 2 layers, eye, lock, Merge, "Layer 1 ▾"                                                                                      | A2                                                                                  |
| T1                | Scribble under Text, no keyboard ✅                                                                                              | Keep (A1 test)                                                                      |
| T2                | Two-tap caret ✅                                                                                                                 | Keep (A3 uses `caretAt`)                                                            |
| T3                | Hold 0.5 s partial                                                                                                               | A3 (Lasso reliable; Text best effort)                                               |
| RM-9 batch 4      | Fonts and Voice; voice commands, speech-to-text; VoiceOver/Voice Control                                                         | H1, B4, H2; commands → O; VoiceOver → K2                                            |
| RM-9 batch 5      | Pictures resizable, mind maps                                                                                                    | G3                                                                                  |
| RM-9 batch 6      | Ink extras (zoom, audio tied to ink, labels, favourites, paper, palm)                                                            | G1–G3; favourites/paper/palm built                                                  |
| RM-9 batch 7      | Reader PDF/EPUB, highlights to any page, side notebook, split view                                                               | C1–C5; split view dropped (owner V-11)                                              |
| RM-9 batch 8      | Trial, Spanish/Hindi review, close                                                                                               | K2                                                                                  |
| RM-10             | Sync                                                                                                                             | L1–L8                                                                               |
| RM-11             | Summary · Notes · Review tabs                                                                                                    | M                                                                                   |
| RM-12             | Maths, new-page start, Calendar Day                                                                                              | N                                                                                   |
| RM-13             | Polish pack                                                                                                                      | O                                                                                   |
| RM-14             | AI                                                                                                                               | P                                                                                   |
| RM-15             | Global launch, App Store wrapper                                                                                                 | Q                                                                                   |
| OPEN-1            | 21 dev-tool audit warnings                                                                                                       | K1                                                                                  |
| OPEN-2            | Order-key tie and sync blockers                                                                                                  | L1                                                                                  |
| OPEN-3            | Replace from older zips                                                                                                          | C1 (table-only), K1 (full)                                                          |
| OPEN-4            | Delete forever keeps pictures                                                                                                    | K1                                                                                  |
| LIM               | Pages can't be dragged                                                                                                           | D1                                                                                  |
| LIM               | Two windows: read-only doesn't refresh                                                                                           | O                                                                                   |
| LIM               | Ink loads all strokes                                                                                                            | G1                                                                                  |
| LIM               | Ink not in shared files                                                                                                          | J1                                                                                  |
| LIM               | WebKit test failures on robot typing                                                                                             | K1                                                                                  |
| DEC               | ~45 "Decisions to review"                                                                                                        | Phase A gate sitting (owner); rows changed by this plan marked by the builder in A1 |
| IDEA              | AI companion, handwriting block to text, AI agents, reader AI extras, Story so far                                               | P                                                                                   |
| IDEA              | Multi-language, Hindi menus, translated dates/sample                                                                             | K2                                                                                  |
| IDEA              | Phone layout, PWA, privacy review, clock skew                                                                                    | Built (phone, PWA); privacy/clock → L                                               |
| IDEA              | Bulk card actions, stats/streaks, FSRS training, review cap counting                                                             | E1 (pause part); rest O                                                             |
| IDEA              | Move page between notebooks updates cards                                                                                        | O (before L)                                                                        |
| IDEA              | Unlinked mentions, create page from [[, link label refresh, On this page, CJK search, search cells                               | O                                                                                   |
| IDEA              | Tag drag/merge in sidebar, "Create #…"                                                                                           | O                                                                                   |
| IDEA              | Table/board/dashboard/view extras, databases as blocks                                                                           | O; databases as blocks after L                                                      |
| IDEA              | History drawn preview, compare, pin copy                                                                                         | O                                                                                   |
| IDEA              | Password box UX, file buttons, Anki section labels, Anki sub-deck "›", Hindi wording                                             | O (check which are already built first)                                             |
| IDEA              | CSV skip duplicates, date order, merge by key                                                                                    | O                                                                                   |
| IDEA              | Pictures/video/mind maps in cards                                                                                                | E2 (pictures, local), G3 (mind map block); video links O; cloud storage L           |
| IDEA              | Restore streaming; unused picture cleanup                                                                                        | K1                                                                                  |
| IDEA              | Reading: resurfacing, nicer voices, offline dictionary, OCR voice, goals sync                                                    | O; H2; L                                                                            |
| IDEA              | Lock real encryption, recovery code                                                                                              | L                                                                                   |
| IDEA              | Kindle/Apple Books/Google Play/Audible connections                                                                               | Parked (owner)                                                                      |
| IDEA              | Full hands-free voice                                                                                                            | O (later)                                                                           |
| IDEA              | Publish databases publicly                                                                                                       | Q (needs accounts)                                                                  |
| IDEA              | Flaky e2e rows                                                                                                                   | K1 (stability pass)                                                                 |
| IDEA              | TypeScript 7                                                                                                                     | When typescript-eslint supports it (check at each phase start)                      |
| IDEA              | Off-computer backup                                                                                                              | Built (private GitHub repo + Drive mirror); app-side → L                            |

---

# Owner decisions still needed (minimal; each has a recommendation the builder will use if no answer comes)

| #   | Decision                                                                                                                       | Recommendation                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| D1  | Order change: Library (C) before the left panel (D), and a new "Ink and Insert complete" phase (G) after Home                  | **Yes**: books are the main use; the left panel is nicer once books exist; G turns every "coming" tool into a real one |
| D2  | N14 "3-line" item = a **Panel** button first on the main bar that opens Pages · Outline · Audio                                | **Yes**                                                                                                                |
| D3  | Checklist lines become Home tasks: **only when you tap "→ Home"** (no flood)                                                   | **Yes** (auto for all checklists later if wanted)                                                                      |
| D4  | R4-4 reader search: scope row first, default This page, with "3 of 12" stepping                                                | **Yes**, nothing more until you ask                                                                                    |
| D5  | H2 natural on-device voice (~80 MB download from Hugging Face, ₹0, English only at first)                                      | **Try it in H2 as an opt-in**; skip if latency > 3 s on your iPad                                                      |
| D6  | Tool names: hover (mouse/Pencil hover) + optional "names under icons"; long-press names only on buttons without their own hold | **Yes** (long-press already opens options on tools)                                                                    |
| D7  | DOCX books become read-only note pages (same reader, ink, highlights) instead of a separate viewer                             | **Yes**                                                                                                                |

Everything else follows the standing decisions; mid-build questions go to DECISIONS "Decisions to review" with the safest option.

---

# Builder instructions (read before every step)

**Rules that always apply** (from CLAUDE.md and `rules/`; if anything here conflicts with them, stop and ask):

1. Read `docs/HANDOFF.md`, `docs/INDEX.md`, this plan's step, the feature spec(s) it touches in `docs/features/`, and `rules/security.md`. Nothing else unless needed. Never read `docs/ARCHIVE.md`. Don't re-read files you already have.
2. Effort **medium**. Short replies. Show only changed code. No helper agents unless the owner asks. No unrequested extras; nothing beyond the current step. New ideas → `docs/IDEAS.md`.
3. Code rules: TypeScript strict, no `any` without a reason; services for all data access (`core/*Service.ts`, feature services); `editor/mapping.ts` is the only file that knows BlockNote's format; `editor/scrollPolicy.ts` the only one touching `_tiptapOptions`; no new direct links between features (shared code in `core`, `app`, `i18n`, `help`, `settings`); soft deletes only; every user-facing text through `t()` with keys in `i18n/en.ts` **and** the Hindi and Spanish files (mark them for native review); times in UTC ms, days as local `YYYY-MM-DD`; RTL-safe CSS (logical properties); 44 px touch targets; `data-chrome` on every bar/pill/menu/card; `focus({ preventScroll: true })`; never `scrollIntoView`.
4. Data: a new table = a new Dexie version that only adds (never edit an old version); an upgrade test from the previous version; add the version to `TABLE_ONLY_VERSIONS` if it only adds tables; validate new rows in `share/checkRows.ts`; backups include new tables automatically (check `fullFile.test.ts`). Optional fields need no version, but are validated on import.
5. Dependencies: only those named in the step; licence checked (`npm view <pkg> license`), version **at least 2 weeks old**, pinned exactly, lazy-loaded if not needed at start, `npm audit --omit=dev` clean; log in DECISIONS.
6. Design: our own look and Lucide icons; never copy another app's art, icons or exact layout. Day, Night, Sepia and phone width for every new screen.
7. Money, deleting the owner's data, the "said no" list, a rule conflict or a true blocker → stop and ask. Anything else the plan doesn't cover → pick the safest option, log it in DECISIONS "Decisions to review" (date, step, picked, other options), carry on.

**Testing rhythm (token-cheap):**

- While working: run only the related tests: `npx vitest run src/<folder>` and `npx playwright test e2e/<spec>.ts --project=chromium`; for Pencil, selection, keyboard and reader specs also `--project=webkit --workers=2 --timeout=120000`.
- Add tests with every change (unit for logic, e2e for every UI behaviour; shared steps in `e2e/helpers.ts`, Pencil steps in `e2e/inkHelpers.ts`, Scribble probe in `e2e/scribbleProbe.ts`).
- **Once before the push:** `npm run lint`, `npm run format:check`, `npm run check:links`, `npm test`, `npm run build`, `npm run test:e2e` (Chromium full) and the WebKit specs touched by the step. Never push failing code; fix first.
- Push **once per step** (CI takes ~35 of the 60-minute limit and free minutes are limited). Watch CI (`gh run watch`); on green the deploy job publishes and runs the live check; confirm `scripts/check-live.mjs` passed. Never upload to Cloudflare by hand.

**After every sub-step:** update `docs/HANDOFF.md` (5 lines: done, next, open issues, files, how to restart) and commit. **After every step:** `docs/CHANGELOG.md` entry (date, what, why, files), feature spec updated (or a new one from `_TEMPLATE.md`), owner checks added to HANDOFF (only what tests can't check, each with why), IDEAS updated, full run, push, CI green, live check, then the **mirror** line from `rules/sessions.md` (robocopy; exit codes 0–7 are success) and confirm in one line.

**Stopping cleanly on limits:** if the session or usage limit is near, finish the current sub-step or revert it to the last green commit; commit only passing work; write HANDOFF ("stopped at A3.2; next: …; restart: `npm run dev`"); never leave a half-migrated database version uncommitted. If a limit stops you mid-way, a one-time restart is scheduled for just after the reset (rules/sessions.md) and resumes the same work after checking `git status`. If a part keeps failing after two honest tries, stop and tell the owner so they can switch that part to Opus.

**Step checklist template (copy into HANDOFF while working):** spec read · plan step read · tests listed · code · related tests green · strings en/hi/es · a11y names · themes + phone · DECISIONS rows · full run · push · CI · live check · CHANGELOG · spec · HANDOFF · mirror.

## Run decisions (owner, 6 Nov, after Max upgrade)

- Build A → K automatically, then STOP at L (Sync) for the owner's free-account checklist.
- Sonnet, medium effort, for all builders.
- Speed: parallel builders in separate git worktrees for independent phases (waves); builders run only related tests locally and rely on GitHub CI for the full suite. Before pushing, a builder rebases on the latest main, resolves conflicts, and re-runs its related tests. Pushes happen one at a time.
- Owner iPad testing happens once at the end, before Sync (no per-phase gate); the fixes then go in one batch.
- AI stays at Phase P after Sync, designed to fit a $100 API credit (usage caps, cheapest suitable model, owner's own key never in code).
- Waves: 1 = A. 2 = B + E + H. 3 = C + F. 4 = D + G + I. 5 = J + K. A Dexie version is assigned at merge time in merge order (each schema change is an upgrade with a backup).
- Self-testing (owner, 6 Nov): builders test as much as possible themselves, including Playwright WebKit with an iPad device profile (touch, pen pointer events, iPad viewport, simulated Scribble and keyboard via visualViewport) as a stand-in for the real iPad. The owner's real-iPad pass comes at the end.
- Keep building through limits: wait for each reset and continue, wave after wave, until Phase L. Owner may later delete and rebuild parts he dislikes.
- Mode: execution only. Planning is done; no new planning rounds unless something blocks.
- Owner (6 Nov): while Sync waits for accounts, keep building any later phase that doesn't need accounts or money (e.g. M Summary tabs, N Maths/Calendar, O Polish). Skip only Sync-dependent parts and AI (P, needs the API key and cost approval).
- Owner (6 Nov), add to Phase P (AI):
  - (1) An MCP server for the app, so Claude (and other AI tools) can read, search and write notes, cards and tasks with the owner's permission (respecting the per-notebook "Allow AI" switch).
  - (2) A "universal AI" connector layer: a swappable provider/plugin interface, so new Claude features and other AI tools can be added as plugins without a rebuild.
  - A web PWA can't host an MCP server itself; options are a small local bridge on the PC, or a server reading the synced copy after Phase L. Research and decide in P. Costs only with owner approval.
- Owner (6 Nov), add to Phase P: "Bring your own AI". Each user connects THEIR OWN AI (Claude, ChatGPT, Gemini, Codex and others) through:
  - (a) a shareable connector package (an MCP server/config, a Claude skill file, an OpenAPI action for custom GPTs), so the user's AI tool can read and write their notes with permission;
  - (b) the user's own API keys (stored on their device only).
    Example: Gemini summarises a YouTube video and saves it into a chosen notebook automatically.
    The user's own accounts pay the AI costs (keeps the app ₹0). Verify each vendor's current MCP/action support during P.

## Audit changes (6 Nov 2026, from [audit-2026-11.md](archive/audit-2026-11.md); each change has its reason there)

Yardstick added by the owner during the audit: a practical learning experience, where the app makes the notes (automatically where possible, through the user's own AI) and the user's time goes to consuming, understanding and recalling; notes stay the core, made automatically or fully by hand in the visual GoodNotes style (edited pictures, labels, tape, YouTube embeds with timestamped screenshots, handwriting with typing, short keyword notes). Standing decisions 1–10 and the run decisions stay; the items below add to them.

1. **Phase A:** unchanged. A3 is timeboxed (two honest tries, then the fallback named in the audit). The universal-Lasso mixed screenshot is optional.
2. **C1 data model:** `Page.source` replaces `Page.book` (`kind: book | article | video | audio | file | paste`, `url`, `durationSec`, `capturedAt`, the book fields as before); `Annotation.anchor` gains `{ type: 'time'; seconds; endSeconds? }`; `Annotation.cardIds`; `Card.sourceAnnotationId`; `Block.batchId` (one AI result). Optional fields, validated in `checkRows.ts`, no new Dexie version. Reason: a book is one kind of source; YouTube and websites are the owner's top sources.
3. **Principle (owner):** AI output is ordinary, fully editable content: the same blocks, cards, rows and pictures a hand makes, no locked AI blocks, the mind map an editable tree (never a picture), and one-step **Remove this AI result** (soft delete of the batch, one Undo).
4. **New Phase CR — Capture → Notes → Recall** (after C4, four sessions, no new table): **CR1** Sources notebook, Library shows every source, a Capture inbox (`#/capture?url=&title=&text=`, paste, drag on PC, an iOS Shortcut and a bookmarklet; the app fetches nothing itself: CORS and no Web Share Target on iOS). **CR2** one notes format (`ln-notes/1`: key points, steps, mind map, cards, screenshot slots), Copy prompt with saved presets, Paste notes or drop a zip with frames, AI-made blocks marked `source: 'ai'` with a `batchId`, a Claude Code recipe for transcripts and key frames on the PC. **CR3** one-tap card from a highlight (cloze or Q/A), bulk cards from a page's highlights, cards link back to the spot, a daily highlight review tile, Look up → vocabulary cards (from C5). **CR4** bring-your-own-key AI v0 (only after the owner's explicit cost OK; off by default; key on the device only, never synced or backed up; `connect-src` for the chosen provider only; per-notebook Allow AI; approval list with Undo). MCP, connector packages and the PC bridge stay in Phase P after L.
5. **G0 picture editor** (new, before G1; owner's order: crop and corner resize with zoom and shape → arrows and ink → rotate → cut out a part; labels; tape on pictures; a picture or cut-out as a card answer; no blur). **G0b mind map block** (from G3; an editable JSON tree). **G2a embed block** (from G2: YouTube via youtube-nocookie after a tap, Needs internet offline, Insert timestamp, pasted screenshots stamped with the video time; CSP `frame-src` for that host only).
6. **Moves:** C5 after CR (its Look up → vocabulary part into CR3); H2 to Phase O; F one wave later; G3 keeps picture resize and ink labels.
7. **Waves:** 1 = A · 2 = B + E1 + H1 · 3 = C + CR + G0 + G0b + G1 + G2a + E2 · 4 = D + F + rest of G2 + G3 · 5 = C5 + I + J + K. Then L (stop for the owner's free-account checklist).
8. **Quality steps:** brief B1 (first load ≤ 350 KB, CI size gate) right after Phase A; B5 (WebKit gate for Pencil specs) any time; B6 (split App.tsx) after A; B7 (axe) and B8 (dead code) any time; owner checks in `owner-checks-pending.md`.

- Owner answers to the audit (6 Nov):
  - (1) YES to CR4: AI with the owner's own key / $100 credit (still spend caps, key device-only).
  - (2) YES to a free-tier Cloudflare Worker CORS proxy for automatic YouTube/article fetching (₹0). The owner PREFERS connected AI apps like Gemini (deep YouTube integration), so the primary path is the Gemini/connected-AI route (copy prompt → Gemini → paste into ln-notes/1, later an API/connector). The Worker is a fallback.
  - (3) YES to the re-cut waves (Home one wave later).
- Owner (6 Nov): the Pencil FEEL and UI are not yet at GoodNotes/Notability level (smooth, but the overall UI isn't optimised). ADD a step "G-Feel" right after Phase A's iPad gate (wave 2), a dedicated Pencil-experience polish pass. It uses all owner inputs (the GoodNotes screenshots and interaction model: tool → pill → card with sub-pages, snapping pills, hover labels, icon-only bar, sticky tools, two-tap/hold rules, 44 px targets) and research (inspiration-apps, ink-layers-pencil-ux, deep-research). It covers:
  - ink latency tuning (prediction, desynchronized canvas, frame budget), stroke smoothing per pen type, pressure curves calibrated on the owner's light pressure (max 0.157);
  - pill/card motion and timing, tool-switch speed, palm rejection quality;
  - a side-by-side comparison checklist against GoodNotes that the owner runs on the iPad.
    Honest limit: PencilKit-level latency needs the native wrapper (Phase Q).
- Owner (6 Nov night): CONTINUOUS POLISH. After each wave, run a short research + polish pass (Opus decides, Sonnet builds) on what was just built (e.g. mic/dictation, audio recording, Pencil feel): web research on best practice, then small improvements, tested and pushed. Keep going until Sync, then the non-Sync phases.
- Owner (6 Nov night): use the escalation path when needed (Sonnet → Opus → Fable). The coordinator MAY add small, clearly useful features found during research/polish that fit the vision and rules (₹0, no stack change, logged in DECISIONS 'Decisions to review' so the owner can remove them).
