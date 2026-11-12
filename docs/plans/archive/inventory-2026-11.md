# Inventory, 6 Nov 2026 (read-only audit)

Sources: redesign-2026-11.md, owner-test-notes-2026-11.md (rounds 1-4, R4-1..R4-24), ROADMAP, DECISIONS (review rows), HANDOFF, LIMITATIONS, IDEAS, CHANGELOG, features/*, git log. Note: the redesign plan has no R3/R4 text; the test-notes file is the superset (it is still untracked in git). Round-1 numbering in the notes is jumbled (items 7, 10, 11 sit at the end; 8 and 9 appear twice with different numbers in the two files). No commit after 302d6a0 touches any R4 item.

## 1. DONE and live (built; tests pass in Chrome/WebKit with simulated events)

- **Batch 1 Backup:** restore in place (zip, safety copy, Undo restore), "Everything" and "Notes only".
- **2c/2d/2e/2f/2g (4 Nov to 5 Nov):** Toolbar menu, Auto switch, copy/paste options; old short bar with sets, control panel, device picker, Recent, Favourites, Calendar; full ribbon (6 tabs, Ctrl+F1); pop-up rule, ribbon fit, floating bar, Slim ribbon, sidebar groups, page path styles; the "bar always reachable" repair and Pencil delete guard v1; page menu tidy (Page address ▸, Device mode ▸) plus Device mode button in the top bar.
- **Batch 3 (5 Nov):** privacy lock (page/notebook/database; PIN, password, WebAuthn device lock; Settings › Lock; blanking on hide) and Reading mode (themes, font incl. OpenDyslexic, size, spacing, margin, width, scroll/pages, line focus, ruler, blanks/self-test, in-place and full-screen reader, progress, resume, per-page bookmarks, contents panel, highlight-while-reading, Look up via Wiktionary, read aloud with word marks and sleep timer, streak, wake lock).
- **3a (5 Nov):** Pencil drag only selects (penSelect, filterTransaction guard, Scribble opt-in setting), Undo/Redo safe with pictures, forced History copy before deleting 3+ blocks or any picture, pen-tap tests. (R1 12, 13 addressed in code; real-iPad result below.)
- **Step 2 new toolbar (5 Nov):** one icon-only main bar (Undo/Redo pill, Text, Pen, Highlighter, Eraser, New line, Lasso, Insert, Read, keyboard, more), options pill snapping to 4 edges, detail cards with sub-pages, press-and-slide on a tool, pin, Edit bar (first item of the more menu), migration of old bars, New line hold (0.6 s default, setting), Aa pill, mini toolbar, Pencil-follows-tool rules, keyboard policy, hold-to-select.
- **Step 3 shared ink engine (6 Nov):** 5 pen types, highlighter (behind ink, snap to text), eraser (3 modes, highlights only), shapes on hold, scribble/circle gestures, lasso on ink (move, resize, separate rotate, duplicate, colour, PNG copy, delete), layers (up to 12), paper styles, block anchoring, single Undo for text+ink, Dexie 13, backups/History include ink.
- **Step 4a four spaces (6 Nov):** strip (phone bottom tab bar), Home/Library as placeholders, Notebooks, Review; quiet corner; ONE Search with chips and a Features group; hide Home/Library/Review; last space remembered.
- **Owner-approved "do not change":** Page address ▸ and Device mode ▸ (R1 15), lock feature itself (R1 17).
- Housekeeping: CI limit raised to 60 min; Prettier pass.

## 2. BUILT but failing or unverified on the real iPad

Nothing below has a fix commit. All R4 items are "collect, fix later in one go".

**Critical ink/selection (R4-20, R4-22/17, R4-23 root requirement)**

- **R4-20** Pen/Brush over text lines does not draw: acts as selection/Scribble (wrote "@", selected text, once removed text). Empty space below content draws; a new empty page often draws nothing. Root requirement: ink tools live on a transparent layer above everything and must never touch content below.
- **R4-17 / R4-22** Pencil taps on toolbar (Lasso button, selection bar) acted as Scribble and wrote a comma. All non-page UI must capture Pencil taps fully.
- **R1 12 (3a)** Pencil selection still deleting: unverified after 3a/2; R4-20 reports text removed once, so not closed.
- **R1 13** Undo/Redo with pictures: fix built, not re-confirmed by owner. **R4-16** Undo/Redo re-open the keyboard (they focus the editor).

**Selection (text)**

- **R4-11 / R4-19a** word/line selection disappears after about 1 s. **R4-19b-d** handles hard to drag, animation not smooth, sometimes selected but not drawn.
- **R4-12** no ✕ to deselect. **R4-13** iOS Cut/Copy/Paste bar still shows (our selection bar wanted). **R4-18** lasso selection bar good, but not available in all lasso cases; outline/handles missing on one lasso drag.
- **T3 hold 0.5 s** caret placement about 80% right; Scribble claims the held stroke when the hand moves.
- **R4-15 (clarified)** page jumps when the keyboard opens/closes; the bar moves above the keyboard and back. Wants fixed bar and a still page (visualViewport, interactive-widget, scroll anchoring).

**Toolbar / pills**

- **R4-1** pill docked left/right turns into a square grid; must stay a long thin bar.
- **R4-2** duplicate highlighter icons, indent/outdent icons after migration; check defaults.
- **R4-9a-d** dragging the reading pill scrolls the page, opens the keyboard, leaves a blank grey area, pill floats mid-screen.
- **R4-21** small close/icon targets need a bigger hit area.
- **R1 7/11 (layering)** more menu behind bars: fixed in 2e, not re-reported.

**Reading / contents / bookmarks**

- **R4-3** normal top toolbar must hide in reading mode. **R4-4 (corrected)** reader search icon shows the current menu with a new "this page" filter first. **R4-5** Contents and Bookmarks must be separate. **R4-6** no bookmark feedback, new bookmark barely visible, no marker in the page. **R4-7** opened bookmark does not show which spot. **R4-8** jumps too fast, no landing cue (fixed 1-1.5 s smooth scroll plus glow).
- **R1 2** reader top bar blur (unconfirmed). **R1 16** Face ID failed ("device lock did not confirm"), PIN field contrast: not re-reported. **R1 18** toggle jumps to Home tab: not re-reported. **R1 19** reader bar unreachable when scrolled: not re-reported. **R1 22** read-aloud repeating words, robotic voice: no fix.
- Unverified checklist in HANDOFF: step 2, 3, 4a owner checks (Pencil latency, finger scroll beside Pencil, snapping, Scribble, tab bar on iPhone, Face ID, app-switcher snapshot).

## 3. REQUESTED but NOT built

**Pencil and selection:** hover/long-press label on bar icons (R4-10); ⌫ Backspace key beside ↵ (R4-14); own selection bar replacing iOS bar, with ✕ and Delete, customisable (R4-13); bigger hit areas (R4-21); Scribble-proof held stroke (T3); selection screenshot, convert handwriting to text/math (listed "coming"); direct manipulation drag-resize for pictures/text boxes/shapes.

**Ink and layers:** layer model "max 2 layers, Layer 1/2, eye, lock, Merge, Photoshop-like, pill shows Layer 1 ▾" (R4-24; built is up to 12 and no Merge); Pen/Highlighter/Eraser/Shapes/Ruler/Tape on the top layer only, Lasso universal across ink and content (R4-23); Shape, Tape (hide/become a card), Magnifier, Ruler; ink in shared files/"Add as copies"; lazy ink loading; ink layers inside books/PDFs ("drawn at", View as drawn).

**Toolbar and pills:** none beyond R4 above; Read pill options as Kindle-style card set; Insert items Table, Camera, File/PDF, Audio, Callout, Toggle list are "coming".

**Reading mode and reader (Kindle-like app):** dedicated professional reader with own controls separate from the ribbon (R1 25); Aa sheet tabs Font/Layout/Themes/More, saved custom themes (Compact, Standard, Large, Low vision), brightness slider, alignment; page-turn/curl animation; selection pop-up (colour, Look up, Note, Copy, Pin); Annotations panel with filters (type, colour, chapter); Contents with page numbers; Page Flip peek; time left in chapter/book; reading goals; Look up (dictionary, translation, Wikipedia); vocabulary builder; Liquid mode for PDFs; export highlights; bubble zoom; sticky/minimised reader bar Settings choice (R1 19); orientation lock (R1 3); sepia ribbon band (R1 23).

**Bookmarks and contents:** Word-style Navigation pane docked on the right with H1›H2›H3 tree and current-heading highlight (R1 20); Pages thumbnails/Outline/Audio left panel (4b; Contents and bookmarks move there); separate Bookmarks; margin marker; landing cue (R4-5..8).

**Search:** reader in-document find with "This page" default and scope filter, "3 of 12", stepping to other pages (R4-4, discuss); Books, Highlights, Tasks chips are empty shells until Library/Home.

**Read aloud:** Audible-style player panel (play, back/forward 15 s or sentence, speed, voice, moon sleep timer, next chapter); natural voice via auto-picking Enhanced/Premium voices plus guidance; word-repeat bug; always-visible now-playing pill on every screen (R1 24); affirmations read aloud or own recording. Paid neural voice parked.

**Home/productivity:** Top 3, matrix tasks (inbox, drag to quadrant, completed list, carry forward, never deleted), tasks from checklist lines in notes, Upcoming, projects, time blocks, Pomodoro and project-only timer, hours-per-project and planned-vs-actual timeline, evening journal, Briefing, routines/habits (red ✕ for missed, no notifications), affirmations, health data later. No "continue reading", no favourites on Home.

**Library/books:** "Books" notebook in gallery view; book page (file, Continue/Read again, progress, highlights, summary, AI notes/cards); PDF, EPUB, docx, DRM-free; highlights land on book page automatically, deep links back, flash on arrival; highlight colours, Add note, Save to notebook destination choice; notes/highlights list; open at last place; % progress; AI hooks.

**Review/decks and memory techniques:** Review home with "All cards" plus saved Decks (saved filter, 2-3 step tree picker, tags, collections, card state); merge Saved searches into Decks; pause/suspend for notebook/chapter/card; FSRS target 90% in simple words; memory palace, vivid-image field, Major system/PAO helper, chunking/acronym builder, linking story method, each as Layer-gallery templates plus a how-to; label unproven methods.

**Fonts:** 6-8 free OFL fonts (book serif, calm sans, readability, dyslexia-friendly, 2-3 handwriting) with live preview; import own .ttf/.otf/.woff2, stored locally, in Everything backups (R1 4); English and Hindi handwriting fonts (ROADMAP batch 4).

**Sidebar and spaces:** clean sidebar, no truncated names, fewer icons (R1 1, status unclear); notebook "View ▾" (Default, Shelf, Tabs) and per-tab views (list/gallery/shelf/board/table/calendar); Layer gallery (finance etc., shareable templates); real Library and Home.

**Share/export:** PDF, Word, Markdown, text; Web Share sheet; share-as-link (needs Sync); templates/pages shareable. Built last (step 10).

**Settings:** reader top-bar choice; orientation lock; Pencil tuning; selection bar customisation in control panel; lock visibility (placeholder, outline) per R1 16 if not already.

**Performance:** owner says toolbar "laggy"; no measured work beyond ink 60 fps target; lazy ink chunks; startup size 320 KB.

**Roadmap items not in the redesign:** Phase 10 Sync, 11 Summary/Notes/Review tabs, 12 Maths/Calendar, 13 polish, 14 AI (permissions, MCP), 15 launch/App Store; Fonts and Voice batch 4, Pictures/mind maps batch 5, Reader batch 7 (PDF then EPUB, split view; now replaced by step 5).

## 4. Owner decisions made, and helper-only decisions to review

**Owner decisions (quotes)**

- Four spaces plus Search: "Home (Today), Library, Notebooks, Review"; settings in a quiet corner.
- "ONE reading view, no switching"; text layer 1, Pencil ink layers 2+; reader ink tools "the SAME tools" as Draw (uniformity rule).
- Home: no continue reading, no favourites; matrix quadrant "manual and never auto-derived"; "No notifications".
- Layers option A (fixed spaces + Layer gallery). Notebooks: "KEEP the current default"; views are optional.
- Library formats PDF, EPUB, docx; no Kindle import. Budget "₹0 now, AI later". Read aloud "Lower priority"; paid voice parked.
- Short bar order: "Undo/Redo, Aa Text, Pen, Highlighter, Eraser, New line, Lasso, Insert"; Shape and Tape off main row. Left panel Pages/Outline/Audio approved.
- Pencil (5 Nov, final): "Pencil mode starts on Lasso"; Text tap marks, second tap places caret; no double-tap word select under Text; hold 0.5 s; finger always scrolls; "Pencil picks the Pen tool" OFF.
- Layers (R4-24): "max 2 per page ... the word Layer".
- Build order 1-10 (urgent, toolbar, ink, spaces, Library/reader, decks, Home, fonts+aloud, views+gallery, share last). Process: understand, deep research, ONE master plan, approval, autonomous build.
- Reader bar default: "minimised ✕ plus show-on-scroll-up". Pause/suspend YES. Share built last. Questions one at a time. Short-bar picture an image, not an artifact, after questions settle.

**Helper decisions to review (DECISIONS "Decisions to review", all unreviewed)**

- 4a: Review/All cards/Saved searches stay in Notebooks list as well as Review; Notebooks cannot be hidden; hidden remembered space falls back.
- Step 3: Dexie v13 tables; Notes-only backups include ink; Replace accepts v12; History copies hold ink (30 max); ink anchored to first-point block; Undo history for open page only; Finger can draw = Automatic; options pill stays open while drawing; snap-to-text maps to six BlockNote colours, no stroke made; snapped shapes use pen colour; 12 layers, created at first stroke; whole-page stroke load; 60% page room; perfect-freehand dependency.
- Step 2: pill stays open after a choice; Title/H1 sizes; Toggle list "coming"; display-only font settings; old bars migrated; per-tool ink settings; pen-over-picture CSS passthrough; "Not verified against GoodNotes/Notability help pages".
- 3a/3: Scribble opt-in; History forced copies; CI 60 min, push once per step; lock design (no DB change, PBKDF2 210k, WebAuthn without signature check, idle 5 min, blanking); paged mode only in full-screen reader; Read set default list; read aloud chunking and stop-restart pause; Read extras (streak, Look up, wake lock); OpenDyslexic; Atkinson not added.
- 2f/2g: Computer mode preset Top; one-time repair; submenu behaviour; Import/Export greyed.

## 5. Conflicts and contradictions (latest wins)

- **R4-4 vs R4-4 CORRECTED:** corrected version wins: keep the current reader search menu, add a filter shown first, default "this page"; do not assume an in-document Ctrl+F bar (scope chip text partly overlaps; discuss).
- **Pencil rules:** (a) early 3a "drag only selects"; (b) Step 2 final "tap marks, second tap caret, no double-tap word select (Text)", Lasso has double/triple tap; (c) R4-11/19 treat double/triple tap select as a desired feature (selection must persist); (d) Round-3 12 "GoodNotes selects fine". Latest owner version: step-2 final rules for Text, double/triple tap under Lasso, with R4 persistence fixes.
- **R4-20 vs step-2/3 design:** ink tools must be a layer above all content; built engine still lets Pencil reach text. Owner "ROOT REQUIREMENT" wins; R4-23 refines it (Lasso universal).
- **Layers: R4-24 (max 2, Merge, "Layer 1 ▾") vs built 12 layers and the earlier "multiple ink layers from the start".** R4-24 wins. Also layer 1 in the reader is "text", ink layers 2+ (reader plan) versus per-page Layer 1/2 ink naming: needs one scheme.
- **Reading:** "ONE reading view, no switching" and "dedicated reader" vs built two views (in place + full-screen) and Settings choice "The Read button opens". R4-3 (hide top toolbar while reading) conflicts with in-place Read keeping the Read set bar. Latest: single reader, own controls.
- **Contents and Bookmarks:** R1 20 (one Word-style Navigation pane "Contents and bookmarks") vs R4-5 (separate). R4-5 wins; left-panel plan also moves Contents there.
- **Toolbar defaults:** plan says Read button on main bar and no set switch; ROADMAP/HANDOFF still describe the old Write/Draw/Read switch in older lines.
- **R4-13/R4-12 vs earlier "no iOS callout / mini toolbar":** same direction (own bar); consolidate with R4-18.
- **R4-15 original vs clarified:** clarified (keyboard open/close) wins.
- **R4-14 Backspace** vs "New line hold for extras": no conflict, both on main bar; space on bar needs Edit bar.
- **Read aloud priority:** "Lower priority" vs R1 22/24 (stop control, repeats bug) which are bug-class and urgent.
- **Home vs Journal:** plan says evening journal and also existing journal feature; keep one.
- **Roadmap order:** redesign sits before Phase 10 Sync and Phase 14 AI; ROADMAP batch 4-7 (Fonts, Voice, Pictures, Ink, Reader) are superseded by steps 5-8. Batch 5 (pictures resize, mind maps) has no step.
- **Step 4a:** spaces doc says Review inside Notebooks list too (helper), plan says Settings etc. move; fine but note.

## 6. Gaps (asked, nowhere in plan or docs, or only partly)

- Owner-asked deliverables not produced: "a list of every current feature, with visuals"; research on organisation methods and "what is missing"; per-app research on Kindle, Audible, GoodNotes, Notability, Notion, OneNote, Word, Anki, Todoist, TickTick, Toggl, Sunsama, Apple Books, Readwise; the short-bar picture; deep research for R4-15 and Photoshop-style layers.
- No R-number tracker: R4 items are only in the notes file (not in ROADMAP/HANDOFF/DECISIONS), so a new session reading INDEX.md will miss them.
- R1 1 (sidebar mess, truncated names): no later "done" entry. R1 3 (orientation lock), R1 5 (share) only plan-level. R1 19 reader bar Settings choice: not in features/reading-mode.md.
- Round-3 14 ("3-line" short bar item): never confirmed with the owner which item.
- R1 8 (hold-and-drag on bar to see options): done (350 ms press-and-slide), but unconfirmed on Pencil.
- R1 16 Face ID failure root cause: no fix recorded.
- Pencil "sometimes doesn't register taps" (stale service worker?): only a 10-tap test, no root cause, no "update state" check.
- Debounce between R4-9c blank-grey render bug and anything in docs: none.
- Hindi/Spanish strings for new UI: marked as needing review; handwriting fonts (Hindi) unresolved.
- Customisable selection bar "later in central settings": no home in any spec.
- Affirmations audio recording storage, Pomodoro/time-log data model, task data model across notebooks: not designed.
- Sync for reading progress (Phase 10) vs "Books and audio stay on the device until sync": Drive plan only in ROADMAP.
- Anything touching AI hooks ("build the hooks now"): no hook design recorded.
