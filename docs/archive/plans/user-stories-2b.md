# Features, stories and problems, through Phase 2B (17 Nov 2026)

Written in plain words for the owner. Every feature (F-), story (US-) and problem (P-) has a short id, so you can comment on any one of them ("P-5 is not what I meant"). Sources are in [brackets]: TB = text box spec lines, C = your findings from the combined test, S = the 17 Nov bug sweep, P1/2A/2B = phase task numbers. Where a rule was replaced, only the newest rule is written.

**Live or test?**

- **Live** = in the real app today. The live app has had no new code since 12 Nov.
- **Test** = only in the test version (build/next, behind a switch). Turn it on with Settings > Try new features > Test a phase > "Up to Phase 2B".
- Your 16 Nov answer: nothing new goes live now. Everything is released together after full testing and when all bugs are fixed.

**Contents:** Part 1 By phase. Part 2 Features. Part 3 User stories. Part 4 Open problems. Part 5 Questions for you.

---

# Part 1: By phase

## Phase 0: reset (no features)

- **Delivered:** cleaner rules, fast test set, the test preset ("Up to Phase 2B" and so on), two safety programs, tool updates. [0.1 to 0.6, 0.8, 0.11, 0.12, 0.14]
- **Status:** done; the preset is in the test version only (removed before release).
- **Open:** one code line for everything (task 0.7) waits for the release; the CI-only timing tests (P-27).

## Phase 1: the frame (new sidebar, top bar, scrolling, update flow)

- **Delivered:** new frame (`foundation.shell`), storage safety notice, new update flow (`update.v2`), security upgrade, fixes F1 to F10 (sign-in stays, sidebar scrolls, Settings search), notices with a ✕ (I1). Settings v3 is no longer part of it; Settings v5 comes later (Phase 1S).
- **Status:** test version only. Your combined test (16 Nov) passed Parts A to D. Not live: waits for the release (P-1).
- **Open:** P-1 going live, P-2 freeze recorder, P-3 desktop-only shell tests red on iPad size, P-4 Settings preview pill over the Format tabs (belongs to Settings v5).

## Phase 2A: writing tools (tool bar v9, page menus)

- **Delivered:** tool bar rebuilt to the approved v9 picture (tasks 2A.4 to 2A.16): Undo and Redo in the top bar, pen row, Feel card, eraser (Highlighter / Text / Pen), Format card, Lasso, ⋯ More, favourites, Edit tool bar, tool names. Page menus on the right (`page.menus`). From your test: eraser on shapes (C2), "Back after one" (C3), Edit tool bar (C6), one header on Arrange sheets (C7), Mic and Record audio in the tray (C9).
- **Status:** test version only. 2A.16 (side-by-side check with v9) was the last task in progress.
- **Open:** P-5 More-tools arrow over Backspace, P-6 eraser lag with highlights only (T10), P-7 Journal month rename on iPad (R20), P-8 two lasso tests red locally (R21), P-9 format bar leaving the screen (BUG-002) and hide-while-writing (BUG-003) wait for your iPad check.

## Phase 2B: text box and Pencil

- **Delivered:** tasks 2B.1 to 2B.11 (no 2B.6): select and type, double-tap, resize, move, object bar, Box card, several boxes and layouts, Pencil on paper. Owner findings C4, C5, C8, C10 to C27 are fixed in the test version; C23, C25, C26, C27 merged on 17 Nov.
- **Status:** test version only, behind `textbox.v2`.
- **Left in the plan:** 2B.12 (prove nothing was lost), 2B.13 (pictures and your test list), T25, T26, R15, R17, R18, the narrow-box line overlap, the wheel test move.
- **Open from your 17 Nov findings:** C28 to C32 (P-10 to P-14). Details in Part 4.

## Phases built but outside this document

Phase 3 Notebooks, 4 Search, 5 Home and Library, 6 Review and Study, 7 Reader, 8 AI are mostly built behind their own switches and have not had their side-by-side check. Phases 9 and 10 have no picture yet. Settings v5 (Phase 1S) is approved as a picture, not built.

---

# Part 2: Features

Each entry: how it works, Good, Weak, Our view.

## Notes and structure

- **F-1 Notebooks, pages, sub-pages (live).** How: a notebook holds pages; pages nest; each notebook has tabs. Good: simple tree; works offline. Weak: very large notebooks rely on search. View: keep.
- **F-2 Editor and blocks (live).** How: type text, headings, lists, to-dos, toggles, quotes, code, callouts; "/" adds more. Good: one calm page for everything. Weak: the block side button can float over words on iPad (P-15). View: keep, fix P-15.
- **F-3 Maths (live).** How: write fractions, roots, Greek letters; LaTeX for experts. Good: loads only when used. Weak: none known. View: keep.
- **F-4 Mind map block (live).** How: a tree of ideas you type and rearrange. Good: real editable content, not a picture. Weak: tight on small screens. View: keep.
- **F-5 Links and tags (live).** How: "[[" links pages and shows "Linked from"; tags can be nested. Good: renaming shows everywhere. Weak: none known. View: keep.
- **F-6 Templates and Journal (live).** How: new page from a layout; one journal page per day under month pages. Good: quick daily habit. Weak: month rename by double-tap failed in a test on iPad (P-7). View: keep, watch.
- **F-7 Pictures, audio, files (live).** How: add pictures, record voice with a page, attach files. Good: stored inside the app. Weak: pictures shrink to 1600 px. View: keep.
- **F-8 Page history (live).** How: earlier copies of a page; bring one back. Good: safety net. Weak: a copy at most every 5 minutes. View: keep.

## Writing by hand

- **F-9 Pen, Highlighter, Eraser, Lasso (live; new look in test).** How: draw with Pencil, finger or mouse over the text. Good: one engine for all pages. Weak: eraser on shapes was buggy (C2, fixed in test only). View: keep.
- **F-10 Scribble: handwriting to typed text (iPadOS feature; our rules in test).** How: with the Text tool, writing in a box becomes typed text. Good: no keyboard needed. Weak: only the real iPad can prove it (P-16); one red test (P-17). View: watch closely.
- **F-11 Shapes and circled numbers (live).** How: draw a line, arrow, circle or box and it becomes clean; circle a digit. Good: tidy notes fast. Weak: handwriting nearby cancels it. View: keep.
- **F-12 Voice: mic strip and Record audio (live; fixed in test, C17).** How: speak to type; or record sound. Good: hands-free. Weak: needs Safari speech and permission; real iPad only. View: improve, watch.

## Text box (test only, switch `textbox.v2`)

- **F-13 Text box v2.** How: a frame on the paper; tap to type; move by the ≡ tab; resize by dots; style in the Box card. Good: calm and exact under Pencil and finger; old pages open unchanged. Weak: many things need the real iPad; C28 to C32 still open. View: improve; top priority.
- **F-14 Box bar, ⋯ list and Box card.** How: bar above the box (Cut, Copy, Duplicate, Delete, Box style, ⋯); card beside the box with looks, fills, layouts. Good: simple for Beginner, full for Professional (each part unlockable). Weak: two ⋯ buttons per box (Q-1). View: keep.
- **F-15 Several boxes, Lasso, Layout Assist.** How: Lasso picks boxes; one group pill; one-tap layouts with a coach line and Done. Good: one Undo for each. Weak: the layout dialog still stacks boxes (Q-5). View: improve.
- **F-16 Pencil on paper, pinch, hover tag, phone gap tap.** How: writing on empty paper makes a box with the ink; two-finger zoom; "+ box" hint on hover. Good: natural. Weak: pinch and hover are iPad-only checks. View: keep.

## Tool bars and menus (test only)

- **F-17 Tool bar v9 (`toolbar.v8`).** How: one bar with favourites; Edit tool bar on the bar; ⋯ More; Undo and Redo in the top bar. Good: you said "smooth and great". Weak: last polish (2A.16) still being checked. View: keep.
- **F-18 Page menus (`page.menus`).** How: page ⋯ opens a panel from the right; folded groups; pinned actions. Good: less clutter. Weak: sidebar menu mixes an emoji lock with line icons (P-18). View: keep.
- **F-19 Device modes (live).** How: Computer, Touch, Pencil change bar place and button size. Good: one app for three ways. Weak: no jump between modes needed fixing (Phase 1). View: keep.

## Studying

- **F-20 Recall cards and Review (live).** How: make cards from notes (also blanks); rate Again, Hard, Good, Easy. Good: notes and study together. Weak: Review screen rebuild is Phase 6. View: keep.
- **F-21 Summary (live).** How: key points beside Notes and Review. Good: three levels, no copying. Weak: manual upkeep. View: keep.
- **F-22 Study tracker, Anki import and export (live).** How: progress per lesson; read or write Anki files. Good: easy switch from Anki. Weak: decks over 300 notes split into pages. View: keep.

## Finding, planning, reading

- **F-23 Search (live).** How: fast on-device search with filters and saved searches. Good: private; any language. Weak: rebuild is Phase 4. View: keep.
- **F-24 Home, tasks, calendar (live).** How: briefing, tasks, Top 3, timer, habits, Day/Week/Month. Good: a whole day in one place. Weak: rebuild is Phase 5. View: keep.
- **F-25 Library and Reader (live).** How: books, PDF, EPUB with highlights, notes; reading mode with themes. Good: calm reading. Weak: Reader rebuild is Phase 7 and parked. View: keep.
- **F-26 Databases, CSV and Notion import (live).** How: tables with views; import a Notion export or CSV. Good: no account, no cost. Weak: heavy on iPad. View: keep.

## Safety and the app itself

- **F-27 Offline and install (live).** How: opens with no internet; installs like an app. Good: notes never wait for the network. Weak: updates could stall (C22, fixed in test only). View: keep.
- **F-28 Update flow (test, `update.v2`).** How: progress, "Restart now" after 5 s, never stuck. Good: no dead end. Weak: not live. View: keep.
- **F-29 Sync and sign-in (live).** How: Google sign-in; the server holds only locked copies. Good: end-to-end encrypted. Weak: only the owner's Gmail now. View: watch.
- **F-30 Backup, export, lock, encrypted files (live).** How: save everything as a file; export PDF, Word, Markdown; lock a page; password-protect a file. Good: you keep control. Weak: the lock is privacy, not encryption. View: keep.
- **F-31 App frame (test, `foundation.shell`).** How: new sidebar, top bar, scrolling, turning the iPad. Good: stays signed in. Weak: P-3. View: keep.
- **F-32 Languages, shortcuts, tips (live).** How: English, Hindi, Spanish; full keyboard; tips you can switch off. Good: global reach. Weak: every new text must exist in all three. View: keep.
- **F-33 AI and Claude connector (live, off by default).** How: Claude Desktop reads and adds notes, never deletes. Good: safe. Weak: needs Node on the PC; AI costs wait for your OK. View: watch.
- **F-34 Speed work (test).** How: page open went from 4.7 s to 0.9 s on WebKit (P1). Good: big gain. Weak: you may still feel lag (P-19). View: improve.

---

# Part 3: User stories

"It works when" lines are checkable. (iPad) = only the real iPad can prove it.

## New box

- **US-1** I want to tap empty paper with the Text tool and get a new box, so that I can start writing anywhere. It works when: the box is as wide as the line and one line tall; it grows down as I write; it sits under the last box, never beside it. [TB-06, C27]
- **US-2** I want new boxes to show no "Type here" and no "Tap here to keep writing", so that the page stays calm. It works when: only the first box of an empty page shows one hint, gone when I start writing. [TB-42, C26, C29]
- **US-3** I want a Pencil tap to keep the keyboard down and a finger tap to open it, so that I can write by hand. It works when: a Pencil tap never opens it; a finger tap that places the cursor does. (iPad) [TB-01]
- **US-4** I want a tap in the gap under a box on a phone to add a box after it. It works when: the new box sits right after. [TB-40]
- **US-5** I want Duplicate to give an exact copy. It works when: it sits just below, same size and look, and is selected. [C20]
- **US-6** I want the first box to behave like all others. It works when: same ≡ tab, same ⋯, same one-line start. [TB-08, C27]

## Typing

- **US-7** I want the cursor to land where I tap and stay there. It works when: it lands within one letter and does not jump while I type. [TB-01]
- **US-8** I want double-tap to select a word, triple a line, four taps the paragraph. It works when: it holds for Pencil and finger; a second tap up to 24 px off or on the same word still counts; no edit menu flashes; the first tap in an inactive box only places the cursor or selects the box. (iPad) [TB-04, C14, C19]
- **US-9** I want a double or triple tap never to delete anything. It works when: only a real scratch-out over text deletes. (iPad) [C14]
- **US-10** I want arrows, commas and ① to be selectable. It works when: a tap puts the cursor beside one; double-tap picks the run of symbols; the Lasso Text pick includes them. [C5]
- **US-11** I want to scratch out a word to delete it. It works when: the whole word under the stroke goes, even with the cursor mid-word; no grey ink stays in the box. (iPad) [C4, C24]
- **US-12** I want handwriting with the Text tool to become typed text, and with the Pen tool to stay a drawing. It works when: the Pen tool never converts. (iPad) [TB-41]
- **US-13** I want typing to pause while I use a bar, card or handle, and come back where I was. It works when: the cursor and selection return after closing. [C10]
- **US-14** I want a box never to grow by itself. It works when: touching ≡ after typing leaves width and height unchanged. [C31, open]
- **US-15** I want typed text never to wrap letter by letter. It works when: a box at the right edge is still the full line wide. [TB-10, S3]

## Selecting a box

- **US-16** I want a tap near the text to place the cursor, and a tap in the box's empty part to select the box. It works when: "near" means up to about 1.5 to 2 letters past the last letter; in an already selected box an empty-part tap keeps it selected. (iPad) [C30, TB-01, TB-05; C30 open]
- **US-17** I want one clear selected look. It works when: a thin solid border with 8 dots, the ≡ tab and the box bar; the frame matches the box's fill and padding. [TB-02, C12]
- **US-18** I want typing to show a thin border and no dots. It works when: one tap outside leaves the box selected; a second tap outside selects nothing. [C11, C18]
- **US-19** I want only one box selected at a time. It works when: tapping box B unselects A; a Lasso round boxes still picks several. [C16, TB-32]
- **US-20** I want a tap on empty paper to deselect. It works when: nothing else happens. [TB-07]
- **US-21** I want Delete or Backspace with a box selected to remove it. It works when: a notice with Undo appears; Delete box removes everything in it; on a page's first box it empties the box. [TB-09, C8]
- **US-22** I want a Lasso to pick boxes with their ink and show Group / Ungroup and a count. It works when: they move together with one Undo. [TB-32, TB-33]

## Moving and sizing

- **US-23** I want to move a box only by its ≡ tab. It works when: a drag on text, border or a dot never moves it; a short hold lifts it. [TB-11]
- **US-24** I want nothing else to react during a drag. It works when: taps, menus, keyboard and ink wait until the drop. [TB-12]
- **US-25** I want other boxes to slide aside and a landing outline to show. It works when: guides snap gently; the drop glides in; one Undo puts it back. [TB-13, TB-14]
- **US-26** I want to drop a box into any free space it fits: up, down or beside. It works when: free paper under the first box and left of a column accepts it, with Pencil and finger. [C21, C28, TB-15; C28 open]
- **US-27** I want Esc or a lost finger-lift to end a drag safely. It works when: Esc returns the box; a stuck drag ends within 4 seconds. [TB-17, TB-18]
- **US-28** I want the page to scroll when I hold a dragged box near the screen edge. [TB-16]
- **US-29** I want every dot and middle handle to resize in its own direction. It works when: top and bottom change height, left and right change width; never below the text; growing down pushes boxes below it. (iPad) [TB-21, C13, C15, C32; C32 open]
- **US-30** I want resizing smooth and hovering harmless. It works when: no shaking; the guide line stays steady; the Pencil hovering over a dot changes nothing. (iPad) [C21, TB-22]
- **US-31** I want to drag the divider between boxes to resize both. [TB-23]
- **US-32** I want handles at least 44 pt. It works when: the nearest handle wins. [TB-20]
- **US-33** I want phone boxes to resize like on the iPad. It works when: dots work and the box stays inside the column. [2B decisions, 15 Nov]

## Menus

- **US-34** I want one ⋯ menu per box with Delete visible. It works when: Delete shows without scrolling and the menu stays inside the page frame. [TB-30, C23, S1]
- **US-35** I want the bar above the box to offer Cut, Copy, Duplicate, Delete, Box style, ⋯. It works when: a failed copy says "Couldn't copy. Try again." [TB-24, TB-31]
- **US-36** I want Move up and Move down in ⋯. [TB-19]
- **US-37** I want the Box card beside the box, never over it. It works when: a tall card scrolls inside; the page behind stays still. [TB-25]
- **US-38** I want Beginner looks (Plain, Sticky, Callout) with six fills, and Professional extras (border, corners, padding, shadow, save my look). It works when: a changed control glows once; one Undo reverses it. [TB-26, TB-27, TB-29]
- **US-39** I want Layout choices (two columns, six boxes, Layout Assist). It works when: a tap on a layout shows it at once; Undo returns the old one; Done ends the mode. [TB-28, TB-34, TB-35]
- **US-40** I want menus above every scroll bar, and help tips hidden while a menu is open. [C25, S5]
- **US-41** I want a locked box to show a small lock and refuse move and resize while a tap still edits text. [TB-30 area]

## Pencil and Scribble

- **US-42** I want to write with the Pencil on empty paper and get a box with my ink under the stroke. [TB-36]
- **US-43** I want clean shapes and circled numbers from the Text tool. It works when: one Undo reverses it. [TB-37]
- **US-44** I want two-finger pinch zoom (100 to 400 percent) and the Pencil never to zoom. (iPad) [TB-38]
- **US-45** I want a quiet "+ box" tag when I hover the Pencil over empty paper. (iPad) [TB-39]
- **US-46** I want a palm on the screen to be ignored. (iPad) [TB-01 rules]
- **US-47** I want the eraser to cut only what it touches on shapes. [C2]

## Tools and toolbars

- **US-48** I want Undo and Redo in the top bar. [2A.4]
- **US-49** I want the Format card to have 3 tabs for Beginner and 4 for Professional, and the pen row to show colour and size as drawn. [2A.6, 2A.9]
- **US-50** I want to edit the tool bar on the bar itself (hold, drag, Done) with locked tools. [2A.15, C6]
- **US-51** I want "Back after one" never cut off. [C3]
- **US-52** I want Mic and Record audio addable to the bar. It works when: the mic strip takes Pencil taps, has a ✕, types as I speak, and a second tap stops it. (iPad) [C9, C17]
- **US-53** I want Arrange sheets with one header, ✕ left and ✓ right, and notices with ✕ left and Undo right. [C7, I1]

## Pages and sidebar

- **US-54** I want a page ⋯ panel from the right, below the top bar, with folded groups and pinned actions. [Phase 1 fixes, 2A.3]
- **US-55** I want the side list with its own bar. [Phase 1 fixes]
- **US-56** I want to stay signed in after reload and turning the iPad, with no jump between Computer and Pencil mode. (iPad) [F1, F8]
- **US-57** I want an update never to get stuck. It works when: "Restart now" appears after 5 seconds; offline the app still opens. [C22]
- **US-58** I want typing in the page title not to jump the page when I start writing. [PR-3]

## Speed

- **US-59** I want tab, page and menu switching to feel instant. It works when: page open stays under 1 second on WebKit. (iPad) [P1]
- **US-60** I want moves and resizes to follow my finger every frame. [C21]

---

# Part 4: Open problems

Status words: **open** (not fixed), **fixed, owner to confirm**, **iPad only** (only the real iPad can prove it), **CI only** (red on the cloud test run, green here).

## Text box (your findings and the sweep)

- **P-10 C28 free space cannot take a box (open).** Under the first box and left of a column the paper is empty, but a dragged or pasted box is refused or joins the first row. Past rule: C21. Planned with the sweep.
- **P-11 C29 "Type here" in new boxes (open).** Only the first box of an empty page should show a hint. The rule is in your 17 Nov decision; a v2-only fix is drafted.
- **P-12 C30 first tap (open).** Tapping just past the last letter selects the box instead of placing the cursor. New rule: near the text means cursor.
- **P-13 C31 box grows when I touch ≡ while typing (open).** Not reproduced in the browser. Needs a try on iPad, with a hand-narrowed box and the first box.
- **P-14 C32 middle handles stuck (open).** Not yet investigated. Suspects: something over the handle, lost pointer on WebKit, a no-op on a full-width box. Related: TB23-DIV (P-20).
- **P-15 S7 block button floats over the words during a Pencil tap run (open).** The editor's "Open block menu" button appears over the text on the 3rd tap.
- **P-17 C4 scribble over "6" also deletes the comma (open, red on iPad size).** Tests c45:430 and c45:508; also red on the base build; likely a side effect of C24.
- **P-16 Scribble and real Pencil rules (iPad only).** C4, C10, C14, C17, C18, C19, C21, C24 and TB-01, 38, 39, 41 pass in tests but need your Pencil: the keyboard staying down, the edit menu not flashing, hover, pressure, real handwriting.
- **P-21 C11 first box keeps its dots while typing (fixed, owner to confirm).** See Q-2.
- **P-22 Grey Pencil ink left in a box (check).** Seen next to "Was artok" on 17 Nov; C4 says never keep it.
- **P-20 TB23-DIV (open).** The divider test may press a dot, so the divider drag itself could be untested.
- **P-23 2B.12 and 2B.13 (not done).** Nothing-lost proof and the pictures with your test list.
- **P-24 Small 2B bugs (open).** T25 Scribble space after "/"; T26 write over a selected word; R15 one redo step red on iPad size about 1 run in 5, stops the 2B release; R17 white-on-white Shadow tile; R18 phone dots lose a resize near the page end; narrow-box line overlap; the phone wheel test move.
- **P-25 BUG-001 "Not saved yet" on a checklist (open).** Cannot be reproduced; a recorder runs on the preview.
- **P-26 TB-24 test red on a clean PC checkout, CI green (open).** Find why before release.

## Tool bars, pages, frame

- **P-5 "More tools" arrow over Backspace (to check).**
- **P-6 Eraser lag with highlights only (T10).**
- **P-7 Journal month rename fails on iPad size (R20, to check).**
- **P-8 Two lasso tests red locally (R21).**
- **P-9 BUG-002 / BUG-003 wait for your iPad check.**
- **P-18 Sidebar page menu mixes an emoji lock with line icons; on a phone the ⋯ list covers the title area (noticed, not changed).**
- **P-2 F7 the screen sometimes freezes (cause unknown; recorder runs on the preview).**
- **P-3 Seven desktop-only shell and left-panel tests fail on iPad size (make them size-aware).**
- **P-4 Settings preview pill covers the Format tabs control on iPad sideways (PP1, with Settings v5).**
- **P-19 Lag on the iPad (P1).** Page open is fixed; you may still feel it when switching.

## Releasing

- **P-1 Nothing is live yet.** Phase 1 and all of 2A and 2B wait for the combined release (task 0.7).
- **P-27 CI-only timing tests.** Tests of timed taps and paint speed fail only on slow cloud runners (c45 timed taps, cBoxesC21:73, eraserShapes:186, lassoWords:206, lazyTapPaint:124, tb2-resize:405, tb2-taps:204, toolbarV8Favs:301; earlier tb2-move TB-11/14/16, TB-37, paperInk rule 9, PM-64). Decision on where they run waits for you (CI-TIMING).

---

# Part 5: Questions for you

- **Q-1 Two ⋯ buttons or one?** The sweep keeps two (on the frame and on the bar) as in the approved picture; TB-08 and your S1 note say one box, one ⋯. Both open the same list now.
- **Q-2 Dots in the first box while typing.** C11 says no dots while typing; the builder kept them for the first box and asks you to confirm.
- **Q-3 Delete on the first box.** TB-09 says a box is deleted; the builder's choice empties the first box (one Undo) so the page always has one box.
- **Q-4 Tap speed.** C14 said taps up to 500 ms; C19 made Relaxed 700 ms the default. Which of Quick, Normal, Relaxed should stay?
- **Q-5 Boxes side by side.** C21 allows them, but the layout dialog still stacks them. Is that OK?
- **Q-6 Going live.** The phase plan says Phase 1 goes live after its test; your 16 Nov answer says release everything together later. Please confirm the second.

## State on 20 Nov (part D0)

Done, so no longer open: P-10, P-11, P-12 (C28 to C30b, merged 17 and 18 Nov); P-17 (C4 comma, 0454ec85); P-19 (page open 4.7 s → 0.9 s); P-21 (C11 / C18, Q-2: decided 17 Nov, built); P-22 (grey Pencil ink, B11 dae84d1c); Q-1 to Q-6 (answered 17 Nov). P-25 / BUG-001: one cause fixed, the owner's own case unconfirmed. Everything still open lives in docs/plans/phases/phase-2-finish.md.
