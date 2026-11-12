# Reader and annotations v2

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Slice 7. Flag `reader.v2`. Mock: [annotations-mock.html](../mockups/annotations-mock.html) (approved by the owner 12 Nov 2026). Inventory ids R01 to R92: [reader-inventory](../plans/reader-inventory-2026-11-11.md). Pro switch ids: [pro-features.md](../mockups/pro-features.md) section Reader.

## Purpose

### Plain-words summary

The book reader (PDF and EPUB) gets its approved new look. Nothing is removed. These are the changes you will notice:

- The reader bar and the drawing bar can each be shrunk to a small tab on the edge. Each tab brings back only its own bar.
- The sidebar never covers the ✕ that leaves the reader.
- Tap Listen and the book is read aloud. Hold Listen and only the settings open. Letting go never starts the voice.
- A sticky note opens like a real small paper note. Only the ✏️ opens the editor.
- The reader padlock has four modes. You choose per book. A long press with a filling ring unlocks.
- Page edits in the Pages grid (move, delete, rotate, add) change the real book. Undo works. "Restore original" brings the first copy back.
- "Highlight where I land" is on for new people and can be turned off.
- The left panel has tabs: Pages, Outline, Annotations, and a + for your own.

Out of scope: the AI button in the top bar (Won't do here, it goes with the AI slice). Reader presets Read / Study / Deep and the cross-book Highlights database belong to the Library slice and are only linked from here.

### Flag

- `reader.v2` (in `src/app/flags.ts`). Off: today's reader is untouched, byte for byte. On: everything below. It turns on per user after the 3-step iPad check.
- Shared flags used: `foundation.parts`, `foundation.shell` (needed for the minimise chip and the layer scale).

## How it works

### Bar layout (from the mock)

- One sticky stack `.rstick` at top 8 px, column, gap 6 px (mock 2505). It holds the reader bar `.rbar` and the drawing bar `.rtool` (mock 1743, 2531).
- Reader bar: padding 4 px, radius 16 (`--r-lg`, mock 58), buttons gap 2 px, every tap target min-height 44 px (mock 1703, 2557). Title 13 px bold, sub line 11.5 px muted (mock 2546, 2553).
- Drawing bar: padding 4 px 6 px, wraps, separators 1 x 24 px (mock 1743, 1755). The pen row sits under a 1 px line (mock 1761).
- Bar slide away on scroll down: translateY(-130%) and fade, `--dur-3` 240 ms, ease `cubic-bezier(.2,.8,.2,1)` (mock 63, 2505, 2520).
- Phone (≤640 px): the title block hides, labels hide, buttons shrink to min width 37 px (mock 3395 to 3410).
- The bars must not blur. Surface is the shared glass token, with the "reduce transparency" fallback solid (mock 248).

### Parts

Shared parts used (names from [shared-parts.md](shared-parts.md)):

- Tokens (SP-01), Card ▾ frame 304/376 (SP-02) for the Listen and Aa cards, Tab row (SP-03) for the left panel tabs, ✕ field (SP-04) for Find, Tag picker (SP-05) for annotation tags, Drag drop-line, ▲▼, live reflow (SP-06) for the Pages grid, Arrange sheet (SP-07) for Edit tabs, Empty state (SP-08), Object bar (SP-09) for the sticky note bar.
- Shell: rail, top bar, left panel, More sheet 440, small dialog (every dialog has ✕), pop menu, toast, minimise chip (SH-13), Undo/Redo (SH-05), layer scale (z order, SH layer table).
- New shared part needed: none. The 4-mode padlock popover is a pop menu. The hold ring is a new small piece of the minimise/hold family; listed under Decisions to review.

## When I do X → Y

Ids: RD-Bxx = Beginner (on by default). RD-Pxx = Professional, each names its unlock switch. Each line is one e2e test. Every test also checks that nothing outside the target moved.

### Beginner

| Id     | When I do                                                              | Then                                                                                                                                                                                                  |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RD-B01 | Open a book with `reader.v2` on                                        | The reader bar shows ✕ Exit, title, "Page n of N", Find, Pen, Bookmark, Contents/Notes, Aa, Listen, padlock, More ⋯. Time-left line under it. (R01, R02, R08, R09, R12, R14, R15, R17, R18, R20, R24) |
| RD-B02 | Open the sidebar on an iPad portrait or phone while the reader is open | The sidebar opens beside the reader or over the page, never over the ✕ Exit reading. ✕ stays visible and tappable (44 pt). (Owner bug, PENDING line 266)                                              |
| RD-B03 | Tap ✕ Exit while the sidebar is open                                   | The reader closes and the book page shows. One tap, no first-tap swallow.                                                                                                                             |
| RD-B04 | Tap the minimise button on the reader bar                              | The whole reader bar hides. A chip "Reader" appears on the right edge, 64 px below the top bar. The drawing bar is unchanged.                                                                         |
| RD-B05 | Tap the minimise button on the drawing bar                             | The whole drawing strip hides (pen row too). A chip "Draw" appears under the Reader chip, 8 px apart. The reader bar is unchanged.                                                                    |
| RD-B06 | Both bars minimised, tap the "Draw" chip                               | Only the drawing bar returns. The Reader chip stays.                                                                                                                                                  |
| RD-B07 | Both bars minimised, tap the "Reader" chip                             | Only the reader bar returns. The Draw chip stays.                                                                                                                                                     |
| RD-B08 | Minimise both, reload the page                                         | Both stay minimised (setting key, not memory).                                                                                                                                                        |
| RD-B09 | Scroll down in the book, then up 12 px                                 | The reader bar slides away on down, comes back on up. Does not fight with minimise: a minimised bar stays minimised.                                                                                  |
| RD-B10 | Tap Listen once                                                        | Reading aloud starts from the first visible paragraph. The button shows pressed and "Pause". Tap again pauses, again resumes. (R72)                                                                   |
| RD-B11 | Press and hold Listen 0.5 s                                            | The Listen card opens (voice, speed, sleep timer). No playback. No text selected, no callout, no magnifier.                                                                                           |
| RD-B12 | Release the hold                                                       | Still no playback. The card stays open. Nothing starts until I press Play inside the card.                                                                                                            |
| RD-B13 | Tap Listen while the Listen card is open                               | It closes the card; does not start playback.                                                                                                                                                          |
| RD-B14 | Listen playing, tap ⏹ Stop                                             | Speech stops, highlight of the spoken passage clears. (R74)                                                                                                                                           |
| RD-B15 | Tap the padlock                                                        | A pop menu lists four modes: Everything works, Reading mode, View only (Frozen is listed only with the Pro switch, RD-P01). Pick one; the padlock icon changes to that mode.                          |
| RD-B16 | Pick "Everything works"                                                | All tools and selection work. This is the first-ever default.                                                                                                                                         |
| RD-B17 | Pick "Reading mode"                                                    | Text cannot be selected for editing. Highlight, notes, bookmarks, Find, Aa still work.                                                                                                                |
| RD-B18 | Pick "View only"                                                       | No edits, no highlights, no pen. Zoom, scroll, page turns, Find still work. A tap on a tool shows a small shake and a toast "Unlock to use this".                                                     |
| RD-B19 | In View only, press and hold the padlock                               | A ring fills around it over 1.5 s. At the end the lock opens to "Everything works" and a toast says so.                                                                                               |
| RD-B20 | In View only, press the padlock and let go at 0.8 s                    | The ring drains back. Still locked. No toast of success.                                                                                                                                              |
| RD-B21 | Lock a book "View only", open a second book                            | The second book keeps its own mode. Back in the first, it is still View only (per book, stored on the book record).                                                                                   |
| RD-B22 | New book, never locked                                                 | Opens in the last mode used on any book; the very first time it opens in Everything works.                                                                                                            |
| RD-B23 | Tap a highlight in View only                                           | Its note opens read-only (no ✏️, no delete).                                                                                                                                                          |
| RD-B24 | Select text in Everything works                                        | The selection pop-up shows 5 colours, Note, Copy, Define, Look up, Pin, Save to…, Make card, Add to vocabulary. (R39 to R49)                                                                          |
| RD-B25 | Pick a highlight colour                                                | The text itself is marked (real highlight in the text layer), not a floating overlay. Undo removes it. (Mock-feedback A4)                                                                             |
| RD-B26 | Open Annotations, tap a highlight row                                  | The book jumps there and the spot glows (see RD-B30). (R51)                                                                                                                                           |
| RD-B27 | Add a sticky note (pen bar or selection ▾)                             | A new note opens straight in the edit dialog with ✕ and Save.                                                                                                                                         |
| RD-B28 | Tap a sticky note on the page                                          | A read view opens: paper colour, text, ✕ and ✏️ only. It looks like a real note (mock 1935 to 1985: slight tilt −0.6 deg, radius 4/4/4/14, shadow).                                                   |
| RD-B29 | In the read view tap ✏️                                                | The edit dialog opens with the same text. Save returns to the read view. Tap ✕ closes without edits.                                                                                                  |
| RD-B30 | Jump to a bookmark or highlight with "Highlight where I land" ON       | The target glows 2 s (mock 2051, 2066). New users have it ON.                                                                                                                                         |
| RD-B31 | Switch "Highlight where I land" OFF in Aa › More, then jump            | No glow. The page still lands at the right place. Remembered after reload.                                                                                                                            |
| RD-B32 | Reduced motion set, jump                                               | Still outline for 1.6 s instead of the glow animation.                                                                                                                                                |
| RD-B33 | Long-press a sticky note                                               | After about 0.4 s it lifts; drag moves it anywhere, the page auto-scrolls near the edge. A normal tap never moves it. (Mock-feedback A6)                                                              |
| RD-B34 | Open the left panel                                                    | Tabs: Pages, Outline, Annotations, + (Audio shows under + as a default custom tab). One line. No dim layer behind the panel.                                                                          |
| RD-B35 | Tap + in the tab row                                                   | Edit tabs (Arrange sheet): add, rename, reorder (▲▼ or drag), remove. Every dialog has ✕.                                                                                                             |
| RD-B36 | Open Pages tab of a PDF                                                | A grid of page pictures. Hold a page 0.3 s (or use the grip), drag: a drop-line shows, others slide aside. (mock 10907)                                                                               |
| RD-B37 | Drop a page in a new place                                             | The real book changes: page order, page count label, outline. Toast "Moved page 4" with Undo.                                                                                                         |
| RD-B38 | Delete, rotate or add a blank page in the grid                         | Same: the real book changes; Undo works for each. (R68, OrganiseSheet today)                                                                                                                          |
| RD-B39 | Tap "Restore original" in the Pages tab                                | A small dialog (✕) asks; on Yes the first copy of the book returns, bookmarks and notes keep their places where the page still exists. Undo is offered.                                               |
| RD-B40 | Edit pages, close the reader, open again                               | The edited book is what opens. "Restore original" is still there.                                                                                                                                     |
| RD-B41 | Tap ✕ on the Pages-grid panel                                          | The panel closes. Nothing behind it was dimmed at any time.                                                                                                                                           |
| RD-B42 | Tap the left or right edge of the page (PDF paged, EPUB paged)         | The page turns with a short slide (180 ms). Middle tap shows or hides the bars. (R79)                                                                                                                 |
| RD-B43 | Open Aa › Style                                                        | "Full" is selected by default for a new user. The other styles remain pickable.                                                                                                                       |
| RD-B44 | Open Listen card, choose a voice                                       | Voices are grouped by type: Premium, Enhanced, On-device, Other. A pin ⭐ on a voice keeps it at the top. Remembered per language. (R76)                                                              |
| RD-B45 | Use Find, type, tap ✕ in the field                                     | The field clears, focus stays, hits clear. Esc closes Find. (R08)                                                                                                                                     |
| RD-B46 | Page Flip scrub, release                                               | The page changes; "Back to p. N" appears only if Pro (RD-P04). (R10)                                                                                                                                  |
| RD-B47 | Use the pen                                                            | Pen, Highlighter, Eraser (new in the reader: mock-feedback A3), colour, size Thin/Medium/Thick, Undo, Redo, Done. (R56 to R58, R60, R62, R65 to R67)                                                  |
| RD-B48 | Draw in a paged EPUB                                                   | Toast "Drawing works in Scroll mode" with a "Switch to Scroll" button. (BR:1034 today)                                                                                                                |
| RD-B49 | Turn on "Finger draws"                                                 | The finger draws; the page does not scroll under it. Off: the finger scrolls, only the Pencil draws. Next to the switch a one-line explanation (A7).                                                  |
| RD-B50 | Rotate the iPad with the reader open                                   | Bars reflow, nothing is covered, reading position is kept.                                                                                                                                            |

### Professional

| Id     | Unlock switch           | When I do                                           | Then                                                                                                                                            |
| ------ | ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| RD-P01 | `reader.readLock`       | Switch on, open the padlock menu                    | A fourth mode "Frozen" appears: bar hides, taps and Pencil do nothing, swipe still turns pages. Hold the lock icon 1.5 s (ring) to leave. (R82) |
| RD-P02 | `reader.historyBtns`    | Switch on                                           | Undo and Redo show at the start of the reader bar (the shared pair).                                                                            |
| RD-P03 | `reader.fullScreen`     | Tap Full screen in Aa                               | Text only, tiny title, progress line. Esc leaves. Edge taps turn pages. (R19)                                                                   |
| RD-P04 | `reader.flipBack`       | Scrub then release                                  | A "Back to p. N" button returns to where scrubbing began. (R11)                                                                                 |
| RD-P05 | `reader.askBook`        | Switch on and AI on                                 | The Ask button opens the question panel. Behaviour stays as today; the top-bar AI rework is Won't do here. (R16)                                |
| RD-P06 | `reader.penBarStyle`    | Choose Simple, Compact or Full                      | The pen bar shows that set. Default Beginner shows Compact. (R21)                                                                               |
| RD-P07 | `reader.syncFurthest`   | Tap Sync in More                                    | Jumps to the furthest page read on any device, or toast "You are already there". (R23)                                                          |
| RD-P08 | `reader.progressStyle`  | Choose Location, Chapter, Book, toggle Clock        | The progress line changes. (R25, R26)                                                                                                           |
| RD-P09 | `reader.dim`            | Drag Dim 0 to 60 %                                  | A black layer (z 24, under the bar) darkens the page. (R27)                                                                                     |
| RD-P10 | `reader.layout`         | Change spacing 1.2 to 2.2, alignment, margins       | The EPUB reflows live. (R31, R34, R35)                                                                                                          |
| RD-P11 | `reader.presets`        | Pick Compact/Standard/Large/Low vision, save Custom | The look changes; Custom stores the current look. (R36, R37)                                                                                    |
| RD-P12 | `reader.selMenu`        | Turn the select pop-up off                          | Selecting text shows no pop-up. (R38)                                                                                                           |
| RD-P13 | `reader.selExtras`      | Switch on, select a word                            | Pronounce, Look up on the web, Save to…, Make card, Ask AI, Add to vocabulary appear. (R43 to R49)                                              |
| RD-P14 | `reader.noteFilters`    | Open Annotations                                    | Filters by type, colour, chapter show. (R50)                                                                                                    |
| RD-P15 | `reader.exportMd`       | Tap Export                                          | Copy or save highlights and notes as Markdown. (R53)                                                                                            |
| RD-P16 | `reader.bulkCards`      | Tap Cards from all highlights                       | Dialog (✕) makes cards; toast with count and Undo. (R54)                                                                                        |
| RD-P17 | `reader.dailyHighlight` | Open Annotations                                    | An old highlight sits at the top; tap jumps with glow. (R55)                                                                                    |
| RD-P18 | `reader.inkTools`       | Switch on                                           | Eraser options, Lasso and Redo show in the drawing bar. (R58, R59, R66)                                                                         |
| RD-P19 | `reader.inkLook`        | Open pen ▾                                          | Custom colour, thin to thick, pen type, highlighter opacity. (R61, R63, R64)                                                                    |
| RD-P20 | `reader.pagesTab`       | Switch on                                           | Pages tab (page pictures / chapters) is in the left panel. Off: Pages is not in the default tab row; it still can be added by +.                |
| RD-P21 | `reader.resourcesTab`   | Switch on                                           | An Audio / Resources tab lists the book page's recordings. (R71)                                                                                |
| RD-P22 | `reader.aloudSkip`      | Switch on                                           | Sentence back and forward buttons in the Listen card. (R73)                                                                                     |
| RD-P23 | `reader.aloudVoice`     | Switch on                                           | Speed 0.5x to 2x and the grouped voice list show. (R75, R76)                                                                                    |
| RD-P24 | `reader.sleepTimer`     | Choose End of page, 10, 20, 30, 60                  | Speech stops by itself then. (R78)                                                                                                              |
| RD-P25 | `reader.gestures`       | Double-tap, pinch, edge-tap                         | Double-tap zoom 200 % with corner overview; pinch 50 to 300 %; edge taps turn pages. (R79 to R81)                                               |
| RD-P26 | `reader.barScroll`      | Switch on                                           | Bar hides on scroll down and returns on scroll up; a pin keeps it. (R83)                                                                        |
| RD-P27 | `reader.lockDirection`  | Choose Portrait or Landscape                        | The screen tries to stay that way; a toast helps if the browser refuses. (R84)                                                                  |
| RD-P28 | `reader.liquid`         | Switch on (PDF)                                     | Liquid mode (beta) opens a reflowed view. Stays a demo message until text-reflow exists. (R85)                                                  |
| RD-P29 | `reader.lineFocus`      | Turn on Line focus or ruler                         | Dims all but two lines; Alt+↑/↓ moves it. (R86 to R88)                                                                                          |
| RD-P30 | `reader.hideBlanks`     | Turn on Self-test                                   | Recall words hide; tap shows one. (R89)                                                                                                         |
| RD-P31 | `reader.keepAwake`      | Switch on                                           | The screen does not sleep while reading. (R90)                                                                                                  |
| RD-P32 | `reader.tapCounts`      | Choose a tool, tap 2, 3, 4, 5 times                 | Word, line, paragraph, page get selected. Only while a tool is chosen. (R92)                                                                    |
| RD-P33 | any switch above        | Switch it off                                       | The feature disappears; data stays; Beginner view otherwise unchanged.                                                                          |
| RD-P34 | any switch              | Open Settings › Professional features › Reader      | The list shows all 32 with plain names; "Turn on all in group" and "Reset to Beginner" work.                                                    |

## Sizes, spacing, motion

| Item               | Value                                                            | Mock        |
| ------------------ | ---------------------------------------------------------------- | ----------- |
| Tap target         | min 44 px                                                        | 1703, 2613  |
| Bar radius         | 16 px (`--r-lg`); controls 12 px (`--r-md`)                      | 57, 58      |
| Durations          | 120 / 180 / 240 ms                                               | 60 to 62    |
| Easing             | cubic-bezier(.2,.8,.2,1)                                         | 63          |
| Bar stack          | top 8 px, gap 6 px, z 30                                         | 2505        |
| Dim layer          | fixed, black, z 24, no pointer events                            | 2752        |
| Lock layer         | fixed, z 70, `touch-action: pan-y`                               | 2837        |
| Lock ring          | 56 px circle, stroke 3, fills 1.5 s linear                       | 2862        |
| Sticky read view   | tilt −0.6 deg, min-height 150, padding 14/22/26, radius 4/4/4/14 | 1935        |
| Sticky bar buttons | 36 x 36 (hit area padded to 44 in the app), icon 16              | 1958, 1975  |
| Glow               | 2 s text, 2.2 s drawn area                                       | 2051, 2066  |
| Pages grid chips   | 36 px high; drag starts after 0.3 s hold                         | 3506, 10907 |
| Phone breakpoint   | ≤640 px                                                          | 3395        |
| Minimise chip      | shell SH-13 (44 high, 64 px below top bar, 8 px apart)           | shell-spec  |

## States

- **Empty:** no annotations: Annotations tab uses Empty state "No highlights yet. Select text to start." No bookmarks: the ribbon outline shows. A book with no outline: "No chapters in this book." Pages grid of a book with no page pictures yet: skeleton tiles, then pictures.
- **Error:** book fails to load: "This book could not open. Try again" with Retry and ✕ (today BR:136 `failed`). Page edit fails to save: toast "Could not save the page change" and the grid returns to the last good state.
- **Offline:** reading, highlights, notes, pen, Listen (device voices) work. Define and Look up show a short offline message. Sync of strokes waits.
- **Phone (≤640):** title hides, labels hide, sheets are bottom sheets, the left panel is a full-height sheet with ✕. Chips stay on the right edge.
- **iPad portrait:** left panel overlays from the left and never covers ✕ Exit. **Landscape:** left panel docks beside the page.
- **Dark / light / sepia:** all colours are tokens. The sticky note uses `--sticky` and `--sticky-ink`, tested for 4.5:1 in all three.
- **Reduced motion:** no slide, no glow animation, no ring animation (the ring shows a plain hold timer text "Hold… 1.5 s").
- **Locked:** the lock layer sits above the page, below the padlock. Bars follow the mode.

## Edge cases

- Listen hold on iPad Safari: `touch-callout: none`, `user-select: none`, `contextmenu` prevented on the button only; a pointer-up after a hold is swallowed (flag `heldOpen`) so the tap handler does not run.
- Both bars minimised and the page scrolls: no chip moves.
- Sidebar opened while a bar is minimised: chips stay on the right edge and are never below the sidebar's layer.
- Reader on a very small window (<320 px): the bar scrolls sideways, ✕ Exit is first and fixed.
- Moving a sticky note onto another: they overlap; the one touched last is on top.
- Deleting a page that has annotations: the annotations stay, marked "page removed", jump goes to the nearest page; Undo restores all.
- Restore original with a newer edit session on another device: the sync keeps the latest write; Restore creates a new edit (so Undo works).
- Lock mode memory when a book is deleted: removed with the book. When a book is restored from Trash: restored with it.
- A book with 2000 pages: Pages grid uses virtual rows (existing `visibleRows`, `bookPanelMath.ts`).
- Frozen mode and Listen: Listen keeps playing; the bar is hidden so Stop is reached by the lock menu.

## Security check

- No new network calls. Define uses the existing dictionary call on tap only; Look up opens a new tab with `noopener,noreferrer`.
- Page edits run on local bytes only; the original copy is stored in the same local table (size budget: one extra copy per edited book; blocked above 200 MB with a clear message).
- Note text is plain text; sticky note content is escaped before display (never `innerHTML`).
- Lock mode is a comfort lock, not security. The text says so. The page lock stays in [lock.md](lock.md).
- Voices and the sleep timer use device APIs only.

## Nothing lost

Today's reader (code in `src/reader/` and `src/app/reading/`) → new place. Line numbers are in the current worktree. R-ids from the reader inventory.

| Today (file:line)                                                | Feature                                                                                       | Lives in the new design                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| BookReader.tsx:870 `reader-close`                                | ✕ close reader (R01)                                                                          | Reader bar, first button; RD-B02/B03                      |
| BookReader.tsx:881 `reader-page`                                 | "Page n of N" (R02)                                                                           | Reader bar title block                                    |
| BookReader.tsx:891-918                                           | Zoom out, fit width, zoom in (R06)                                                            | Reader bar › Zoom group (phone: in Aa)                    |
| BookReader.tsx:935, 952                                          | Prev/next page (R04)                                                                          | Reader bar, edge taps RD-B42                              |
| BookReader.tsx:969-981                                           | Text smaller/larger (R07)                                                                     | Aa › Font                                                 |
| BookReader.tsx:990, 1009                                         | Scroll / Pages toggle (R05, R33)                                                              | Aa › Layout                                               |
| BookReader.tsx:1017, pdf/FindPanel.tsx:56                        | Find in book (R08)                                                                            | Find bar, ✕ field, RD-B45                                 |
| BookReader.tsx:1028, ReaderInkBar.tsx:29                         | Pen / drawing bar (R09, R56 to R67)                                                           | Drawing bar, minimisable (RD-B05)                         |
| ReaderInkBar.tsx:76, 103, 131                                    | Ink colour, size, type                                                                        | Pen ▾ card; Pro inkLook RD-P19                            |
| BookReader.tsx:1047, extras/PageFlip.tsx:74                      | Page Flip (R10, R11)                                                                          | Page Flip card; Back to p. N is RD-P04                    |
| BookReader.tsx:1063, 1241                                        | Bookmark star and corner ribbon (R12, R13)                                                    | Reader bar star, ribbon kept                              |
| BookReader.tsx:1071, BookPanel.tsx:56                            | Contents (R14, R69)                                                                           | Outline tab                                               |
| BookReader.tsx:1079, annotations/AnnotationsPanel.tsx:32         | Notes/Annotations (R15, R50 to R55)                                                           | Annotations tab                                           |
| BookReader.tsx:1091                                              | Ask AI about the book (R16)                                                                   | RD-P05 (rework Won't do)                                  |
| BookReader.tsx:1101, AaSheet.tsx:28                              | Aa sheet (R17, R25 to R38)                                                                    | Aa card; Style "Full" default                             |
| BookReader.tsx:1113, pdfTools/PdfTools.tsx                       | PDF tools menu (organise, combine, scan, OCR)                                                 | Stays in More; Organise is the Pages grid                 |
| BookReader.tsx:1127, ReadingLock.tsx:15                          | Reading lock (R18, R82)                                                                       | Padlock, 4 modes; Frozen = RD-P01                         |
| ReadingLock.tsx:6 `UNLOCK_HOLD_MS`                               | Hold 1.5 s to unlock                                                                          | Kept for View only and Frozen                             |
| BookReader.tsx:1144                                              | Full screen (R19)                                                                             | RD-P03                                                    |
| BookReader.tsx:1157, 758-790                                     | More ⋯ (pen bar style, go to page, sync furthest)                                             | More ⋯; RD-P06, RD-P07                                    |
| BookReader.tsx:741 `goToSubmit`                                  | Go to page / percent (R22)                                                                    | More › Go to                                              |
| BookReader.tsx:757 `syncFurthest`                                | Sync furthest (R23)                                                                           | RD-P07                                                    |
| BookReader.tsx:1177, extras/timeLeft.ts:55                       | Time left (R24)                                                                               | Reader bar sub line                                       |
| BookReader.tsx:1586 `useClock`                                   | Clock (R26)                                                                                   | RD-P08                                                    |
| BookReader.tsx:1211                                              | Dim (R27)                                                                                     | RD-P09                                                    |
| BookReader.tsx:1222-1229                                         | Full-screen title and progress                                                                | RD-P03                                                    |
| BookReader.tsx:698-709 `onEdgeTap`                               | Edge tap and bar toggle (R79)                                                                 | RD-B42                                                    |
| BookReader.tsx:710-735                                           | Double-tap zoom, corner overview (R80)                                                        | RD-P25, ZoomPreview.tsx:12                                |
| pdf/PdfView.tsx:377                                              | Pinch zoom (R81)                                                                              | RD-P25                                                    |
| BookReader.tsx:1475, annotations/SelectionPopup.tsx:12           | Select pop-up (R38 to R49)                                                                    | Select pop-up; extras RD-P13                              |
| annotations/NoteSheet.tsx:6                                      | Note edit / delete (R52)                                                                      | Note dialog; sticky read view RD-B28                      |
| annotations/SaveToSheet.tsx:18                                   | Save to… (R46)                                                                                | Same sheet with ✕                                         |
| annotations/BulkCardsDialog.tsx:10                               | Cards from all highlights (R54)                                                               | RD-P16                                                    |
| annotations/DailyHighlights.tsx:28                               | Daily highlights (R55)                                                                        | RD-P17                                                    |
| annotations/annotationService.ts:30-111                          | Create/update/delete/restore                                                                  | Unchanged service; sticky adds a `kind: "sticky"`         |
| annotations/annotationService.ts:208 `exportMarkdown`            | Export Markdown (R53)                                                                         | RD-P15                                                    |
| annotations/deepLink.ts:38                                       | Links into a book position                                                                    | Unchanged                                                 |
| annotations/colours.ts:4                                         | Five highlight colours                                                                        | Unchanged (names editable: Library slice)                 |
| DictionarySheet.tsx:39                                           | Define, Pronounce (R42, R43)                                                                  | Select pop-up, RD-P13                                     |
| BookPanel.tsx:14-234                                             | Left panel Pages/Outline/Notes/Audio (R68 to R71)                                             | Tab row: Pages, Outline, Annotations, +; Audio RD-P21     |
| bookPanelMath.ts:8 `visibleRows`                                 | Virtual grid rows                                                                             | Reused by the Pages grid                                  |
| pdfTools/OrganiseSheet.tsx:85, pageOps.ts:43-72                  | Organise pages (move, delete, turn, blank)                                                    | Pages grid edits, RD-B36 to B39; file `pageOps.ts` reused |
| pdfTools/saveBook.ts, pdfEdit.ts                                 | Save edited PDF                                                                               | Edits write the real book; original kept                  |
| pdfTools/CombineSheet.tsx, ScanSheet.tsx, OcrSheet.tsx, aiOcr.ts | Combine, scan, OCR, AI OCR                                                                    | Unchanged, under More; AI OCR stays behind the AI switch  |
| aloud/AloudPanel.tsx:27                                          | Listen panel (R72 to R76, R78)                                                                | Listen card (tap/hold, RD-B10 to B14)                     |
| aloud/bookAloud.ts:46-117                                        | Read-aloud engine, speed, voice, skip                                                         | Unchanged engine; Listen card calls it                    |
| app/reading/aloudController.ts:23,34                             | Sleep timer                                                                                   | Listen card, RD-P24                                       |
| ReaderInkBar / epub/epubInk.ts:12, pdf/pdfInk.ts:19              | Ink anchors per page/block                                                                    | Unchanged storage                                         |
| BookReader.tsx:375-390, extras/orientation.ts:22                 | Lock screen direction (R84)                                                                   | RD-P27                                                    |
| app/reading/barMode.ts:5                                         | Bar hides on scroll (R83)                                                                     | RD-B09, RD-P26                                            |
| readStyle.ts:7-173                                               | Fonts, colours, themes, ink bar mode                                                          | Aa card; `cleanStyle` kept                                |
| epub/bookFont.ts:13                                              | Literata and book fonts (R28, R29)                                                            | Aa › Font                                                 |
| BookReader.tsx:146-147                                           | Epub size and flow prefs                                                                      | Same keys, no migration                                   |
| BookReader.tsx:249-300                                           | Save progress, furthest page, sync                                                            | Unchanged                                                 |
| BookReader.tsx:495-517 `readerBridge`                            | Book note live block bridge                                                                   | Unchanged                                                 |
| app/reading/NowPlayingPill.tsx                                   | Now-playing pill app-wide                                                                     | Unchanged                                                 |
| not in code (docs only)                                          | Liquid mode (R85)                                                                             | RD-P28 stays a demo message                               |
| not in code today                                                | Sticky notes, Eraser in reader, 4-mode lock, glow switch, edge-slide, voice pins, custom tabs | New in this slice (owner-approved)                        |

## Won't do

- The top-bar AI button rework (AI slice).
- Presets Read / Study / Deep, the cross-book Highlights database, colour meanings (Library slice).
- Native apps, shared reading, social highlights.
- Drawing in a paged EPUB (stays Scroll only; owner pick Q1).
- Real brightness control (native only; Dim stays the black layer).
- A new PDF editor engine; page edits use today's `pageOps`.
- Cloud sync of page edits (Sync slice; strokes only, owner pick).
- Blur on the reader bar (owner: must look crisp).

## Sub-slice build order

One surface group per commit; each ends with tests green and a mirror copy.

| Step | Group                                                            | Files (proposed paths)                                                                              |
| ---- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 7a   | Bars: stack, minimise chips, sidebar-vs-✕ fix, scroll hide       | `src/reader/v2/ReaderBars.tsx`, `src/reader/v2/barState.ts`, edit `BookReader.tsx` mount            |
| 7b   | Listen tap/hold card                                             | `src/reader/v2/ListenButton.tsx`, `src/reader/v2/ListenCard.tsx`, `src/reader/aloud/AloudPanel.tsx` |
| 7c   | Padlock 4 modes + hold ring                                      | `src/reader/v2/LockMenu.tsx`, `src/reader/v2/lockModes.ts`, edit `ReadingLock.tsx`                  |
| 7d   | Sticky note read view, edit, long-press move                     | `src/reader/v2/StickyNote.tsx`, `src/reader/annotations/annotationService.ts` (kind field)          |
| 7e   | Left panel tabs, Edit tabs, no dim                               | `src/reader/v2/PanelTabs.tsx`, edit `BookPanel.tsx`                                                 |
| 7f   | Pages grid edits, Undo, Restore original                         | `src/reader/v2/PagesGrid.tsx`, `src/reader/pdfTools/pageOps.ts`, `saveBook.ts`                      |
| 7g   | Glow switch, edge-tap slide, Style Full, voices by type and pins | `src/reader/v2/glowPref.ts`, `src/reader/AaSheet.tsx`, `src/reader/v2/voices.ts`                    |
| 7h   | Pro switches, settings list, eraser in reader, Finger-draws text | `src/reader/v2/proSwitches.ts`, `src/reader/ReaderInkBar.tsx`                                       |

## Tests

- **Unit:** `lockModes.test.ts` (what each mode allows, per-book memory, default); `barState.test.ts` (minimise independent, persisted); `holdTap.test.ts` (hold never starts playback; tap does); `pagesGrid.test.ts` (move/delete/rotate + Undo + Restore original byte equal); `glowPref.test.ts`; `voices.test.ts` (grouping, pins); existing `reader.test.ts`, `bookPanel.test.ts`, `pdfEdit.test.ts` stay green.
- **E2E, one per line id** RD-B01 to RD-B50, RD-P01 to RD-P34, in `e2e/readerV2.spec.ts` (and `readerV2Pro.spec.ts`), on chromium and ipad-webkit. RD-B02, B11, B12, B19, B33, B36 must also run on the real WebKit device project (touch hold).
- **Screenshots:** Beginner and Professional x light and dark (and sepia once) x iPad landscape, iPad portrait, phone, PC. Shots: bars, both minimised, Listen card, padlock menu, sticky read view, Pages grid, Annotations tab.
- **A11y:** axe per theme; focus order; Esc closes the top layer; chips have `aria-label="Show reader bar"`; ring has a text alternative; 44 pt check; contrast 4.5:1 in three themes.
- **Size budget:** `reader.v2` chunk ≤ 40 KB gzip, loaded only when a book opens; Pages grid lazy.
- **Nothing-lost probe:** a script lists every R01 to R92 `data-testid`/label on the flag-off reader and finds it (or its listed new place) with the flag on; fails on any missing id.
- **Regression:** BUG "sidebar covers ✕" (layer scale) and BUG "long-press starts read aloud" stay as permanent tests.
- **Flag off:** all existing reader e2e (`readerControls`, `readerSheets`, `bookPanel`, `bookInk`, `bookReaderVisible`) pass unchanged.

## Owner iPad check (3 steps)

1. Open a PDF. Open the sidebar. The ✕ at the top of the reader must still show and close the reader with one tap. Then shrink the reader bar and the drawing bar one by one: each little tab on the right brings back only its own bar.
2. Tap Listen: the book is read. Tap again to pause. Now hold Listen: only settings open and no reading starts when you lift your finger. Tap a sticky note: it looks like a small paper note; only the pencil icon edits it.
3. Tap the padlock, pick View only, then hold the padlock until the ring is full to open it. Open the Pages tab, move a page, press Undo, then try Restore original.

## Decisions to review

1. **Lock modes in the Beginner view.** The mock has only one lock (now the Frozen mode). The owner's answer A2 lists four modes. I put Everything works, Reading mode and View only in Beginner, and Frozen behind `reader.readLock` (its pro-features text matches the old lock). Alternative: all four in Beginner, and the switch hides the padlock. Pick shown here drops nothing.
2. **"Select with a tool" mode** (from the first research) is not one of the four owner modes; tap counts stay Pro (`reader.tapCounts`) and work only while a tool is chosen, in Everything works.
3. **Hold ring** is a small new piece shared by padlock unlock and any later hold-to-confirm. Proposed as a shell piece; if the shell slice does not want it, it stays private to the reader.
4. **Sticky notes** are stored as annotations with `kind: "sticky"` so they ride on the existing table, export and backup. No new table.
5. **Restore original** keeps one extra copy of the PDF per edited book (local). Large files above 200 MB only get Undo, no Restore, with a message. Owner can raise the cap.
6. **EPUB page edits:** the grid edits chapters order only as a view (not the file) because EPUB has no page images; the owner text says "pages of the real book", so for EPUB the grid shows chapters read-only plus "Hide chapter". Marked for review.
7. **Where 4-mode memory lives:** on the book record next to `at` and `progress` (per book); new books use the last chosen mode, first ever is Everything works (owner answer 11 Nov).
8. **Eraser in the reader** appears in Beginner (owner A3); Lasso and Redo stay Pro (`reader.inkTools`) as in pro-features.md.
9. **Audio tab** moves under + as a default custom tab (Beginner sees three tabs plus +). It is Pro only when a book has no recordings (`reader.resourcesTab`).
10. **Mock differences:** the mock shows panel width and some colours without exact numbers; the build takes panel width from the shell left-panel spec, not the mock.

## Storage changes needing approval (checked 12 Nov 2026)

The build adds no database version. These spec lines need a type or table change in hot files, so their sub-slice parts wait for the owner/manager:

- Sticky notes: `Annotation.kind` (src/core/types.ts:747) is `'highlight' | 'note' | 'bookmark'`; add `'sticky'` (type only, no index change).
- 4-mode lock memory per book (decision 7): the book is a `Page` record (types.ts:134), which has no lock-mode field; add optional `readLockMode?` on `Page` (no index).
- Restore original: needs one stored copy of the PDF bytes; proposal: optional `original?: ArrayBuffer` on `BookFile` (types.ts:713), under the 200 MB cap.
