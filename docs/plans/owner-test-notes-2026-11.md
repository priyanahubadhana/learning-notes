# Owner iPad test notes (5 Nov 2026), collect, don't build yet

## Round 1

1. Sidebar looks messy when open (screenshot 1). Truncated notebook names ("Claud…", "New n…", "Un…"), lots of row icons, uneven spacing. Clean it up.
2. Full-screen reader / reading mode: the top bar is blurry (frosted line across the top). Make it crisp.
3. Orientation lock option (screen keeps rotating).
4. Fonts: allow importing your own font. Find the best long-reading fonts (natural, comfortable), plus some natural handwriting-ish ones, for reading and note-making. The owner disliked all current options except the default.
5. Share:
   - Export as PDF and as Word (.docx).
   - Share as a link that another user can paste into the app to open or import.
   - Universal system share sheet (like WhatsApp: the contacts circle row, Mail and so on) through the Web Share API, while keeping our own share-as-link.
6. Short (compact) bar: "New line" should be there by default (it's missing in the Read set screenshot).
7. (Round 2) The Apple Pencil can't press-and-drag on the bar's tools to try and see options (as GoodNotes allows: tap and hold to open the tool's options, drag to choose).
8. The short bar is too full, its icons aren't clear, and the owner doesn't know what they do. It needs a full rework, so we'll walk through each item together (teach and redesign). Draw set screenshot: T / pencil / book switch, pin, an odd pen-and-eraser picture (an iPadOS Scribble overlay or our "coming" items?), lasso, All tools, search, ⋯, Done.
9. Editing the short bar is hard to find. The short bar's ⋯ menu should have "Edit bar" as its FIRST item, opening an easy list where you show or hide tools and move them up and down (drag, or ↑↓).

## Round 3

12. CRITICAL: selecting with the Apple Pencil still DELETES content, even with the 2f guard. GoodNotes selects fine. It must work reliably.
13. CRITICAL: Undo and Redo are sometimes unavailable. After deleting blocks that contain pictures, neither could bring them back, and History had no version to recover either. We need fully reliable undo and redo, plus History snapshots before any big deletion.
14. The "3-line" item (Contents / outline?) works only from the big ribbon. Add it to the short bar too (confirm with the owner which one is meant).
15. Page address ▸ and Device mode ▸: working well, don't change them.
16. Lock screen works, but the PIN field is hard to see. Add a placeholder ("Type your PIN here"), a clear border or outline around the input and the Unlock button, and better contrast. Face ID ("Unlock with this device") failed with "The device lock did not confirm" (check the WebAuthn flow on iPad Safari or the PWA).
17. Lock as a feature works well (only the visibility in item 16 needs fixing).
18. Toggle behaviour: tapping Reading mode in the ribbon turns it on, but tapping it AGAIN jumps the ribbon to the Home tab. It should just turn off and stay on the same tab. Check EVERY toggle in the ribbon and short bar for this, and test it.
19. Full-screen reader: when scrolled down, the top bar with ✕ isn't reachable, so you have to scroll back to the top to exit. Options to offer:
    - a sticky top bar;
    - a small minimised ✕ (or pill) that always stays;
    - the bar appearing on a scroll up or tap near the top;
    - the full bar only at the top of the page.
      Make it a choice in Settings, with the minimised ✕ plus show-on-scroll-up as the default.
20. "Contents and bookmarks" should be a Word-style Navigation pane: a right-side panel that can be docked and kept open, with a collapsible heading tree (H1 › H2 › H3, ▸/▾), the current heading highlighted as you scroll, and a calmer look (the current pop-up feels confusing).
21. Reading workflow (books and notes). Overlaps batch 7 (Reader), so decide whether to pull it forward.
    - While reading: highlight in colours, then "Add note" on a highlight, and "Save to notebook" with a choice of destination (any notebook or page, a new "Highlights" page, or the page's summary or subnotes). The user chooses the path.
    - Each saved highlight or note links back to the exact spot (a deep link that scrolls and flashes it).
    - A highlights and notes list to re-read later, with a tap to jump.
    - Bookmark and Add note are reachable right in the reader.
22. Read aloud: the owner likes it overall.
    - Player layout should be like Audible: a proper player panel with play/pause, back and forward 15 s or one sentence, speed, voice, the sleep timer (moon icon) and chapter or next page.
    - The voice is robotic and monotonous, and it REPEATS some words (a bug, likely the chunk or restart handling).
    - Wanted: a natural, calm, soothing voice at a good pace. Free route: auto-pick the device's Enhanced or Premium voices and guide the user to download them (Settings › Accessibility › Spoken Content › Voices), plus a sentence-level flow with natural pauses. A paid neural voice would cost money (owner approval needed; parked).
23. Screenshot glitch: the ribbon in Sepia sits on a grey or dark band wider than itself (the docked bar background doesn't match the theme).
24. While read aloud plays, an always-VISIBLE "now playing" control (a mini player in the top bar or a floating pill) on every screen, so it can be stopped from anywhere. Today it kept reading after the owner navigated away, and there was no way to stop it.
25. A big rework: Reading mode as a dedicated, professional reader (Kindle-like app within the app). The "Look and reading" panel options (theme, font, size, spacing, margin, width, scroll or pages, line focus, blanks) are liked, but they should live inside the reader as its own clean controls, not mixed into the editing ribbon or text tools, which is confusing. Plan in depth with the owner: objectives first, then research.

## Owner's vision (answers, 5 Nov)

- Main use: reading BOOKS and PDFs on iPad and phone (PC last), not web articles. Own notes come second.
- Flow is like Kindle:
  - A library with books and % progress, and a book opens where you left it.
  - A Contents panel with page numbers.
  - An Annotations side panel with filters by type (favourite, note, highlight, bookmark), colour and chapter.
  - An Aa sheet with tabs Font, Layout, Themes, More: font tiles, a size slider, spacing, page colour, continuous scrolling, alignment, margins, saved custom themes (Compact, Standard, Large, Low vision), and a brightness slider.
  - A page-turn animation.
  - A selection pop-up with Highlight colour, Look up, Note, Copy and Pin.
- Read aloud like Audible: human-like, play/pause, speed, sleep timer. Lower priority.
- Highlights are hyperlinks back to the exact spot.
- Later, AI (Claude) makes notes, summaries and recall cards from the highlights, so build the hooks for this now.
- Structure:
  - A "Books" notebook with a gallery view of book titles.
  - Each book is a page with the book file (PDF, EPUB, docs), a ▶ Continue or Read again button, progress, a highlights and summaries section, and an AI notes and cards section.
- One space, not a split view: read and make the best notes while reading. As a notebook: Notion power plus GoodNotes Pencil.
- Loves Kindle (minimal but complete reading), Audible (audio, sleep timer, speed), GoodNotes (Pencil, shelf and organisation), Notion (complex notes), OneNote (notebook organisation), Word (customisation, top bar, heading navigation pane).
- Budget ₹0 now, AI later.
- Pain point: no app combines all of these.
- Asked for:
  - a list of every current feature, with visuals, so the owner can reorganise it;
  - research on organisation methods and on what's missing;
  - questions ONE AT A TIME.

## Agreed structure (5 Nov)

- 4 spaces plus Search: Home (Today), Library, Notebooks, Review. Settings and the rest go to a quiet corner.
- Home is a productivity cockpit:
  - Top 3 priorities.
  - Tasks with carry-over, Upcoming, and projects.
  - Time blocks.
  - A Pomodoro focus timer with a time log.
  - An evening journal.
  - A Briefing (the app-made summary now, AI later).
  - Health data later (needs native or Shortcuts).
  - NO continue reading, NO favourites.
- Tasks also come from checklist lines inside any note (Notion/Todoist style), linked to notebooks.
- PRINCIPLE: one core layer (notebooks, pages, blocks, databases). Home, Library, Review, Finance and so on are LAYERS or VIEWS on top of the core, built like Notion templates. The user picks what they need, with no flood of settings.
- Future layers: a finance tracker and others, with template-level flexibility.
- Layers: option A by default (fixed Home, Library, Notebooks and Review, plus a Layer gallery), built so users can change anything later. A finance setup the owner builds should be shareable as a template.
- The owner's current Notion system: a to-do list sorted by the Eisenhower matrix (urgent/important), Pomodoro, and Toggl-style project time tracking. Home must cover all of this; research is running.
- Matrix workflow:
  - Add tasks to a to-do list (an inbox) first, then DRAG each into a quadrant by hand, so the quadrant is manual and never auto-derived.
  - Ticking a task moves it to a Completed list.
  - Box-4 and unfinished tasks are never deleted: they stay in that day's record (journal) for later checks.
  - Options: carry forward to tomorrow or any chosen day, or move to a new list.
  - The owner usually leaves them alone and completes about 99%.
- Time tracking: the timer picks a PROJECT only (for example the app, or office). Reports: hours per project, plus a daily timeline of planned vs actual.
- Routines and habits on Home:
  - Morning and night routines: affirmations (goals and vision), meditation, exercise, daily checks such as brushing before sleep.
  - A habit tracker with missed-day warnings.
  - Priorities shown as completed or missed.
- Affirmations:
  - A bullet-point page that is read aloud, OR plays the owner's own saved audio recording.
  - No timer, no cards.
  - A missed routine or habit shows a red ✕ mark on Home.
  - No notifications.
- Library formats: PDF, EPUB and Word (.docx), all DRM-free books the owner bought. No Kindle import.
- Reader decision: ONE reading view, no switching.
  - Layer 1 is the text (all the Kindle features).
  - Layers 2+ are Pencil ink (all the GoodNotes and Notability features). There can be MULTIPLE ink layers from the start, each hideable or minimisable with 👁.
  - Ink anchors to paragraphs, with a "drawn at" settings memory and View as drawn.
  - PDFs use the same layers on their real pages.
- UNIFORMITY RULE: the reader's ink tools are the SAME tools, bar and behaviour as Draw in notebooks (one shared ink engine and toolbar), so nothing has to be learned twice. This applies to every layer and feature.
- Library is a gallery view of a "Books" notebook, and each book is a page (file, Continue, progress, highlights, summary, cards, AI-later). Highlights land on the book page AUTOMATICALLY.
- Tags, search, sub-notebooks and every other notebook feature work the same in Library. It's just a different view or template; full power, easy use, uniform everywhere.
- Review rework (Anki-like decks):
  - A Review home with "All cards" as the default deck, plus the user's saved DECKS.
  - A deck is a saved filter: notebooks, sub-pages or chapters chosen in a 2–3 step tree picker with ▾ arrows, tags, collections (for example "Books"), card state.
  - Create a deck in seconds, come back and tap it.
  - Irrelevant old material is simply left out of decks. Clicking a notebook or the Books notebook reviews everything in it.
  - Today's Saved searches/reviews feel messy, so they merge into Decks.
  - A centralised, organised panel, learning from Anki.
- Pause/suspend: YES, for a notebook, chapter or card (stops scheduling, kept, un-pause anytime).
- AFTER all the questions: deep research on each inspiration app (Kindle, Audible, GoodNotes, Notability, Notion, OneNote, Word, Anki, Todoist, TickTick, Toggl, Sunsama, Apple Books, Readwise): what makes each unique, its key features, and how to combine them into our layers. Build our own original design, not copies.
- Notebooks: KEEP the current default (the notebook home page, review, databases and so on are loved). Add optional VIEWS: OneNote-style coloured section tabs, and a GoodNotes-style shelf with covers and page thumbnails, used where they fit (for example Books). All cards works great, so carry its strengths into Review.
- Views: every notebook gets a "View ▾" switch (Default, Shelf, Tabs). Also, EACH tab inside the notebook home (Pages, Review, Summary, Databases and so on) can have its own view: list, gallery or shelf with thumbnails, board, table, calendar. Per-tab, remembered.
- Toolbar redesign, following the INTERACTION model the owner showed (an original look, not a copy):
  - Row 1 is the main tools: panel, search, read-only, lasso, text, pen, eraser, shapes, tape, picture, more, mic.
  - Selecting a tool opens Row 2, that tool's own options (types, thickness, colours, +).
  - Tapping the active tool again opens a detail card (e.g. pen tip sharpness, pressure, flatness, stabilisation; eraser Precision/Standard/Stroke; shapes snap/fill).
  - Undo and redo sit apart in their own pill.
  - A left panel with tabs Pages (thumbnails), Outline and Audio.
  - Extras wanted: Shapes, Tape (hide, can become a card), Picture, Magnifier, Ruler, plus our ↵ New line.
- Short bar priority (main row, in order): ↶↷ · Aa Text · Pen · Highlighter · Eraser · ↵ New line · Lasso · Insert. Shape and Tape are OFF the main row for now (in All tools).
- The left panel with Pages thumbnails, Outline and Audio is APPROVED, and Contents and bookmarks move there.
- The big ribbon window look is liked. The SHORT bar should feel as calm and simple as the owner's GoodNotes screenshots: icon-only, a tidy row, the tool's options in a second floating pill. Our own original design, not a copy.
- The owner wants a picture (an image, NOT an artifact) of the short bar, but only after the questions are settled.
- Toolbar feel the owner wants (from GoodNotes examples):
  - Icon-only, that size, a solid full-width bar at the top, strong contrast.
  - MOST important is the way it operates: tool → its types → each type's own settings (detail card with sub-pages and ‹ back). Centralised and organised.
  - The tool-options pill can be dragged and SNAPS smoothly to the top, left (vertical), right (vertical) or bottom edge.
  - A small pin ("pin this tool") is easy to understand.
  - Ours feels complex, unorganised and laggy, so redo it simply.
- Toolbar Q2 answers:
  - A single 📖 Read button on the main bar: one tap enters reading, and its options (Kindle-style settings) open with the same tool → options → detail-card pattern.
  - Write and Draw work by tool selection.
  - Device modes stay exactly where they are now (top-bar button plus Settings).
  - DESIGN RULE from now on: the GoodNotes-learned interaction pattern (tool → options pill → detail card with sub-pages, snapping pill), optimised for iPad first.
- NEW BUG: the Apple Pencil sometimes doesn't register taps (possibly a stale app or update in the background). Check the service-worker update state, pointer handling, and the tap-vs-drag threshold for the pen.
- PENDING (resume after planning): batch 3a, the urgent fixes (Pencil delete, undo with pictures, History snapshot, plus the Pencil taps not registering). The helper was stopped mid-way; its uncommitted changes are in the working tree (penGuard, pageSync, DockedBar, PageEditor, editorCommands, ReadingSelection, i18n, e2e/undoPictures.spec.ts, penSelect.spec.ts). Resume them, don't discard.
- Aa pill approved: Style▾ · B · I · U · text colour · HIGHLIGHT colour (in the pill) · list▾ · align▾ · ★ key point · 📌. Code and link go to the card/All tools.
- Direct manipulation everywhere on iPad (and on PC where it's easy): drag to resize pictures, text boxes, shapes and sizes, slider handles, drag-to-snap pills. Try it; revert if it doesn't work.
- Pen pill plan approved (type▾, 3 thicknesses, colours, 📌, pen card with sliders, Pen settings and Pen gestures sub-pages, draw-and-hold for perfect shapes).
- Highlighter is its OWN tool with its own card (different from the pen card): thickness, colours, snap-to-text switch.
- All 5 pen types from the start.
- Eraser: Precise, Standard and Whole-stroke modes, a size choice, and an "Erase highlights only" switch.
- Lasso approved:
  - Free-hand or rectangle; filter by ink, pictures or text.
  - Menu: copy, cut, duplicate, delete, colour, move, ★ key point, Make card, Save to notes, Convert handwriting → text (beta).
  - Added after research: SCREENSHOT of the selection (copy, paste or save to Photos), SEPARATE scale and rotate handles (GoodNotes users complain they're combined), convert to MATH (later, beta).
- Insert order: ▦ Table · ◯ Shape first, then Picture, Camera, File/PDF, Callout, Audio, Recall card, Tape, Magnifier, Ruler.
- New line: a tap adds a line; press-and-hold opens the extras (heading, checklist, divider…).
  - The hold time must be long enough to avoid mis-taps (about 0.6 s default).
  - Settings: hold duration, or "double-tap for extras" instead, or extras off.
- Read set approved, using all the Kindle items from the owner's screenshots. Extras to include (from common reader features, partly unverified):
  - Page Flip / peek without losing place; time left in chapter and in book; a reading ruler.
  - Look up: dictionary, translation, Wikipedia.
  - Vocabulary builder (looked-up words become cards).
  - Reading goals and streak; page-curl animation; a custom saved theme.
  - "Liquid mode" for PDFs (reflow the PDF text, Acrobat-style), which fits our text-layer plan.
  - Export highlights (to notes, Markdown, PDF).
  - Bubble zoom for comics/images (later).
  - Sync progress across devices (needs Sync, Phase 10).
- Fonts:
  - A SMALL PERFECT SET of free, open-licensed fonts (6–8): book serif, calm sans, a readability font, a dyslexia-friendly font, 2–3 natural handwriting fonts, each with a live preview.
  - PLUS import your own font file in the first version (.ttf/.otf/.woff2, stored locally, included in Everything backups).
  - Research the exact picks (licence OFL) before building.
- Share/export approved: PDF, Word, Markdown, text, the iPad share sheet now; share links with Sync. Build it LAST in the order.
- Audience is friends and online communities, so shareable templates and pages matter (ties to the Layer gallery).

10. Note for the owner: the bottom bar (↶ keyboard, B I U, ^ v, mic, ↵) is iPadOS's own shortcut bar, NOT our app's.
11. Layering bug: with the short bar plus the ribbon showing, the ⋯ (More) menu opens BEHIND or under the ribbon. Pop-ups must sit above both bars.

## Round 4 notes (6 Nov, owner iPad) — collect, fix later in one go

R4-1 Options pill docked LEFT/RIGHT becomes a square box (thicknesses + colours in a grid). It must stay a LONG THIN BAR: vertical strip when on left/right, same as the horizontal strip top/bottom (one column, scrollable if long).
R4-2 (spotted in screenshot) Main bar shows two similar highlighter icons and indent/outdent icons; check main-bar defaults for duplicates and stray items after the migration.
R4-3 Reading mode: the normal top toolbar must be hidden while reading (only the Read pill/reader controls).
R4-4 Read-mode Find (🔍) must open an in-document find bar (Ctrl+F style), NOT the global Search panel: default scope "This page", highlights all matches, ↑/↓ to step through with "3 of 12", then continues to previous/next pages of the notebook/book; a scope filter chip (This page · This notebook/book · Everything) lets you widen to the global search with the same look. Discuss details later.
R4-4 CORRECTED (owner's words, replaces my version above): "I like the current menu, just a filter is added there, which will be first open, by default open while we search. Click on this particular one and it will search what is on current page and all other things." Refers to the search icon on the reader side bar in reading mode (not just Ctrl+F). Discuss in depth later; don't assume.
R4-5 Owner: "The contents menu and the bookmark menu should be separate, as they are two different things. It should not be mixed in one, making it easier to understand." (Reading mode, Contents and bookmarks panel.)
R4-6 Bookmarks (owner's words, summarised): adding a bookmark gave no animation or feedback, so it's unclear what got bookmarked; the new bookmark at the bottom of the list is hardly visible. Wants a clear (slower) animation or pop-up confirming "bookmark added". Within the page, bookmarks should be visible (e.g. a small bookmark mark in the margin or sidebar). Research the best bookmark methods first, then discuss and choose. Current version: "complexity not worth it, not working the way I want."
R4-7 Opening a bookmark: it jumps to the page but doesn't show WHICH spot was bookmarked. When opened, highlight or flash that spot for a few seconds (a visual signal).
R4-8 Jumping from Contents (and bookmarks): the move is too fast and gives no sense of where it landed. Use a smooth scroll animation of the SAME duration whatever the distance (about 1–1.5 s, not 3 s), then a visual signal on the target (like the glow the side-bar button gets when tapped, as in the owner's screenshot of the Read aloud icon) so the user knows "this is the section you picked."
R4-9 Dragging the reading pill (to the left, right, top or bottom):
(a) the PAGE scrolls while dragging the pill, so the drag must not scroll the page (pointer capture plus touch-action none on the grip);
(b) the keyboard pops up during the drag, so no keyboard while dragging the pill or in reading mode;
(c) after a while a blank/grey area appeared over the lower page (a render bug) that fixed itself after scrolling or restarting;
(d) the drop-zone outlines show while dragging (OK) but the pill also floated mid-screen.
Investigate and fix all; discuss later.
R4-10 Tool names on hover or Pencil hover (as in GoodNotes): hovering (Apple Pencil hover or mouse) or long-pressing a bar icon shows a one-word label ("Pen", "Text", "Lasso"…), using the labels we already have.
R4-11 Double-tap selects a word and triple-tap selects a line, but the selection DISAPPEARS after about 1 second, before the user can act (a bug; observed in text mode). The selection must stay until the user acts or dismisses it.
R4-12 The selection needs a ✕ to deselect (on screen or in the mini toolbar); tapping elsewhere also deselects.
R4-13 With a selection, the iOS system bar (Cut · Copy · Paste · Select All · ›) still shows. Replace it with OUR OWN selection bar (like GoodNotes' bar in the screenshot: AI, colour, size, Aa, B/I, align, list, highlight, link, cut, copy, ⋯), which is sufficient for the work. Add ✕ Deselect (and Delete) to it, also as a toolbar option. Users can customise it later in the central settings/control panel. If the browser can't fully hide the iOS bar, handle it (deselect option). Discuss later.
R4-14 Add a ⌫ Backspace/Delete key on the main bar right beside ↵ New line: one tap deletes the previous character (hold = repeat; maybe long-press = delete previous word), so Pencil users can fix mistyped or mis-scribbled text without the keyboard.
TEST RESULTS (6 Nov): T1 Scribble under Text works, no keyboard ✅. T2 two-tap on a written block (outline, then caret at the exact spot) ✅; one tap on an empty line ✅.
T3 (hold 0.5 s) PARTIAL: the caret lands right ~80%; otherwise at word start, or not at all because the hold turns into Scribble ink/text on the line when the hand moves slightly. Needs research: larger movement tolerance during the hold, snapping to the nearest character boundary, and keeping Scribble from claiming a held stroke.
R4-15 Page JUMPS up/down once on first tap or focus after opening or after tapping outside (likely scroll-into-view/focus scrolling), so the tap lands in the wrong place. After that first jump it stays stable. Fix: no scroll on focus (preventScroll), no layout shift.
R4-16 BUG: Undo/Redo re-open the keyboard after it was closed (they focus the editor). They must not focus or open the keyboard.
R4-17 BUG: Pencil taps on the toolbar (Lasso button / selection bar) didn't register; they acted as Scribble and wrote a comma into the text line. Bar taps must never reach the page or Scribble.
R4-18 The lasso selection bar (palette, AA, Aa, B, I, align, list, highlight, link, cut, copy, ⋯, ✕) is good; the same features should be available when selecting with the lasso in all cases. The outline/handles didn't show on a lasso drag in one case.
R4-19 Word select works smoothly, but the animation and its end ("the end part") don't work well, plus the earlier glitch (the selection disappears).
R4-15 CLARIFIED: the jump happens when the KEYBOARD opens: the bar moves to sit above the keyboard, then jumps back to the top when it closes, and the page shifts. Wants a FIXED bar position and a page that doesn't move when the keyboard opens/closes, like GoodNotes/Notability. Deep research needed (visualViewport, interactive-widget, scroll anchoring).
R4-19 CLARIFIED: (a) the selection disappears after ~1 s; (b) the selection handles are hard to drag; (c) the selection animation isn't smooth; (d) sometimes the text IS selected but the highlight isn't drawn (invisible selection).
R4-20 BUG (critical): with the Pen tool selected (pen pill open, colour chosen), drawing with the Pencil on the page draws NOTHING on the real iPad. Possible causes: an old app version (no Update); the ink overlay not covering the area (blank space below the content / empty lines); Pencil events taken by Scribble or the editor; the canvas sitting behind the content. Investigate with priority.
R4-20 DETAIL (after Update):

- Pen/Brush over TEXT lines doesn't draw. It acts as selection/Scribble (wrote "@" into the text, selected the text behind it), and in one case removed text.
- In EMPTY space below the content it draws fine.
- On a NEW page (nothing on it), pen strokes didn't draw at all (once it worked); the finger didn't draw either (expected, palm rejection).
  ROOT REQUIREMENT (owner restating the original plan): Pen, Highlighter and Eraser (plus Shapes, Lasso-on-ink and similar) work on a transparent INK LAYER ON TOP of the whole page (text, images, everything, and empty space). They must NEVER select, edit or Scribble the content below. The Notion-style content stays below; the GoodNotes-style layer sits on top. Selecting a different tool (Text) returns to the content.
  R4-21 Bigger hit area for small ✕/close icons (and other small bar icons): a generous radius so near-miss taps count, without overlapping neighbours, and never letting a near-miss fall through to the page as Scribble.
  R4-22 All non-page UI (bars, pills, ✕, menus, panels) must capture Pencil taps fully, so they never reach the page or Scribble (relates to R4-17).
  R4-23 Layer tools: Pen, Highlighter, Eraser, Shapes, Ruler and Tape work only on the top ink layer. LASSO is UNIVERSAL: it selects both ink and page content in one gesture.
  Study Photoshop's Layers panel (👁 visibility, lock, opacity, order, active-layer highlight) as the model for our layers UI.
  R4-24 Layers (decided): max 2 per page ("Layer 1", "Layer 2"); 👁 eye, lock, Merge into one; Photoshop-like: the top layer is drawn over the lower one and tools act only on the active layer; the pen pill shows "Layer 1 ▾" (the word Layer, not "label"), last used by default.
  NEXT (owner-approved process): 1) full understanding of everything (plan, decisions, notes R1–R4, what's done, what's pending) → 2) deep research (GoodNotes, Notability, Notion, Photoshop, OneNote + every good online source) → 3) ONE reorganised master plan, step by step → 4) owner approval → 5) autonomous build.

## Owner workflow and capture vision (6 Nov, for the audit)

- Today's YouTube flow:
  1. Watch the video.
  2. Paste the link into Gemini with a custom prompt to get notes.
  3. Paste the notes into Notion or GoodNotes (or rewrite them by hand).
  4. Rewatch and add screenshots manually.
  5. Draw small mind maps with the Pencil.
- Pain: forgets visual details (e.g. a Photoshop tool ICON and the workflow), keyword notes are incomplete without the icon, and must rewatch.
- Wanted: ONE TAP → automatic visual notes from a YouTube video or a website, via the user's own AI (Gemini, Claude, Claude Code), including:
  - key frames and screenshots at the right moments;
  - small CROPPED icons with their names (icon + word for recall);
  - the workflow steps;
  - a mind map;
  - recall cards.
    Then the owner edits by hand.
- Picture editing priority: crop and resize with corner handles, zoom in/out, adjust the shape; then draw arrows and ink over it; rotate; cut out a part (e.g. just one icon). Blur not needed.
- Note-making stays first priority; automation second; both together ideal.
- Human intervention principle (owner): AI-made output (notes, summary, database rows, mind maps, recall cards) must land as NORMAL, fully editable content, identical to hand-made content (no locked "AI blocks"). Users edit freely: add or remove lines, add pictures, edit the AI's mind map, add more. If the AI did a bad job, the user can delete it in one go and build the same quality by hand. Editing AI output must be as easy as editing your own notes in GoodNotes/Notion.

## Round 5 (6 Nov, after Phase A part 1)

R5-1 Side-docked pill still shows a 2-column grid; it must be ONE thin vertical strip (= R4-1).
R5-2 BUG (critical): FINGER taps mostly don't register on the toolbar, pills, Settings and sidebar page rows (a sub-page doesn't open), in Touch mode with the Pencil paired, intermittently. The ⋯ menus and text taps work. Suspect penTap.ts treating finger touches as stylus.
R5-3 Owner found no other issues in part 1.
R5-4 Selection mini bar: tapping its colour (palette) button doesn't open the colour panel.
R5-5 The selection mini bar needs a 📌 pin, and must be DRAGGABLE out of the way.
R5-6 Layering: with a selection, the Aa pill's Text style card opened UNDER the selection mini bar, so the owner couldn't use either. Fix: menus/cards from the main bar always open ABOVE the mini bar (correct z-order), AND the mini bar can be moved (R5-5). Discuss later.
R5-7 BUG: the mini bar's Align (≡) and List (•≡) buttons change the format but ALSO move the mini toolbar itself (it re-positions to follow the reflowed selection). The bar should stay put; only the text changes. (Pairs with R5-5: draggable or pinned position.)

## Phase A part 1 gate results (6 Nov, owner iPad)

PASS: T-A1 ink only over text/pictures/title/blank/new page; T-A2 20 Pencil taps on bar/✕ write nothing; T-A3 keyboard open/close ×10, no jump; Undo/Redo keep the keyboard closed; Layers: chip, add, hide, lock, Merge + Undo all work.
R5-8 KEEP the iPadOS keyboard shortcut bar at the bottom (mic, B/I/U etc.); it's useful, so don't suppress it. Our ⌨ toggle (show/hide keyboard) works great; keep it.
R5-9 A mini bar for the Pencil (like GoodNotes / other apps): a small floating, draggable "input strip" with 🎤 Mic (dictation into the caret), ↵ Enter and ⌫ Backspace, so no Apple keyboard is needed. Owner says these three cover most of the work. Note: the web can't trigger iOS dictation directly; options are the Web Speech API (SpeechRecognition, Safari support to verify) or focusing a field with the keyboard's mic. Research.
R5-10 Paper backgrounds (lined, dotted, grid): line spacing should match the text line height, so text sits on the lines (best effort; big text may cross them).
R5-11 BUG: after drawing on a LOCKED layer, switching to the unlocked layer, then Merge and Unlock, the merged strokes still can't be erased (merge or unlock doesn't carry editability, or strokes keep the old layer id/lock).
Pending: owner will send the Pencil lab results.
R5-12 Eraser on highlights: the erase isn't shown live. The highlight disappears only after the Pencil lifts (sometimes no visual while erasing). Make the erase preview live while erasing.
PENCIL LAB (6 Nov 07:18Z, iPad, Safari 27.0.1): Scribble text events 0 ✅; pen down 70 / up 67 / cancel 3 / lostcapture 35 (investigate lostcapture); touch cancel 5; bar taps handled 402, late clicks swallowed 0; ink pointercancel kept 0 / dropped 0; viewport stable (offsetTop 0); canvas 6.6 MB. Owner: all Pencil tests passed apart from the noted items.
R5 decisions (6 Nov): all round-5 fixes approved as noted.
MIC (owner): build it like GoodNotes:
(1) AUDIO RECORDING saved into notes (record while writing, playback, timeline linked to ink/text, listed in the left panel's Audio tab);
(2) a draggable MINI KEYBOARD strip (🎤 speech-to-text into the caret, ↵, ⌫) that the owner moves around like in GoodNotes. Speech-to-text: try Safari SpeechRecognition, falling back to the keyboard mic.
Then waves 2–5 continue automatically.
R5-13 Sidebar scroll affordance: (1) a soft fade at the top/bottom edge when more content is hidden; (2) a slim scroll indicator that appears while scrolling or on touch and fades after ~1 s (theme colours, 44 px-friendly); (3) optionally, the first time only, a gentle 'peek' bounce. Apply the same pattern to other long lists (pills, menus, Settings). Approved direction; owner to confirm the peek.
R5-13 DECIDED: edge fade + slim auto-hiding scroll indicator on all scrollable lists, with a Settings switch 'Scroll hints' (on by default, can turn off). No peek bounce.

## Round 6 (owner iPad, 7 Nov 2026) — collecting, discuss when owner says "now"

- R6-1 Mini keyboard strip (⠿ 🎤 ↵ ⌫) drag with Apple Pencil: while dragging the strip by its grip, the Pencil still acts on the page underneath (a pen line is drawn across the page, and text input/caret stays active). Dragging any floating bar/strip must be drag-only: no ink, no text input, and the page should leave the text layer for the length of the drag. Holding still is fine.
- R6-2 AI keys don't sync: a key pasted on the PC is not on the iPad. Owner wants keys entered once and available on all their signed-in devices. (Today keys are device-only by design; candidate: sync keys end-to-end encrypted with the sync key, opt-in.)
- R6-3 Rectangle lasso doesn't work: choosing the rectangle shape still draws a freeform loop; no rectangle appears while selecting.
- R6-4 iOS edit callout (Cut / Copy / Paste / AutoFill / Look Up …) keeps popping up on selections and gets in the way; owner wants it gone in our app where possible, using our own menu instead (it also appears over our own selections).
- R6-5 (seen in the same screenshot) In the Write pad, the iPadOS bottom shortcut bar (Writing Tools: Proofread / Rewrite, keyboard, mic, ↵) floats over the pad's bottom row and hides Space/⌫/Replace/Insert. Pad buttons must stay reachable above it.
- R6-6 In the Write pad (and generally), deselecting needs a finger; owner wants a Pencil-friendly way: e.g. a visible ⓧ Deselect button on our own bar/side bar, so selections can be cleared without touching with a finger, and the iOS selection/callout stops getting in the way.
- R6-7 Undo/Redo (the main bar buttons) do not work inside the Write pad; they should undo/redo the pad's own writing too, like a notepad.
- R6-OK Name it sheet: works, writing names with the Pencil is comfortable. ⋯ rows feel great. Write pad overall: great experience. Insert/Replace + Undo after inserting work.
- R6-7 (clarified) It is the main bar ↶ ↷ Undo/Redo arrows that do nothing while working inside the Write pad (before inserting). They should undo/redo inside the pad too.
- R6-8 Choosing a tool jumps the page: e.g. in the Text tool, tapping Lasso scrolls the page up, causing a stutter mid-selection. Picking a tool must never move the page.
- R6-9 Write pad ↵ (Enter) presses don't appear in the pad's text area, only in the preview line as ↵ marks; owner can't see or remove accidental Enters. The pad should show them where you write and let you edit/delete them.
- R6-10 Owner's idea: use the toolbar with a finger (left hand) and write/draw with the Pencil (right hand); may fix many issues (finger = UI, Pencil = content). Discuss.
- R6-11 App lags and gets stuck fairly often; sometimes needs a restart. Some features lag. Needs a performance/freeze investigation on the iPad.
- R6-12 Tapping a notebook should reopen the last page you were on in it (default), with the sidebar tree opened to that page; changeable via ⋯ / a setting.
- R6-13 Sync test 7 FAILED: same line edited on iPad and PC (PC "pp" edit, iPad "O" edits + Enter a minute later). Neither open page updated for a long time; only after a reload/restart did both devices show the merged result. Owner wants Google-Docs-like real-time updates on open pages across devices. Likely: pulled changes reach the database but the open editor doesn't refresh from them (O1 live refresh only covers a window that is "watching", not one being edited), plus 10 s polling. Needs: live apply of remote edits into the open editor (per-block, keeping the caret), and Supabase Realtime push (~1 s). The IDEAS "Realtime later" row becomes needed now.
- R6-8 decision (owner, 7 Nov): keep the options pill floating over the page (option 2, like GoodNotes); the page never moves.
- R6-15 DATA LOSS: in the Write pad, switching "Read with" from Scribble to AI wipes all the text written in the pad, with no warning. Must never lose text: keep it (or ask first).
- R6-16 Idea: live writing — as you write in the pad, the text appears at the page cursor in real time (instead of only on Insert), so you see it in context.
- R6-OK Lasso ink selection, handles, rectangle shape: all good. No tiny dots. Magnifier + ruler: all good.
- R6-17 Lasso with the T (text) filter, freeform and rectangle: selecting a lone line works, but looping part of a paragraph selects nothing. Owner sending screenshots.
- R6-18 Pencil double-tap in typing mode selects the word, then it deselects almost at once, before the owner can act.
- R6-19 Pencil triple-tap selects the whole paragraph; owner wants only the line(s) being tapped, not the paragraph.
- R6-20 Owner: "the pencil tool double tap doesn't work" (meaning to be confirmed: double-tap while the Pen tool is on?).
- R6-OK Real-time sync: all steps passed (live updates, caret kept, both directions, same-line typing, background).
- R6-17 (screenshot) Lasso, T filter only, small freeform loop around "in Claude" inside a paragraph: nothing is selected. Cause: the "most of the line inside" rule selects whole lines only, so a small loop in a long line never qualifies. Owner expects the words inside the loop to be selected (a text range, word-level), for both freeform and rectangle.
- R6-17..R6-20 decision (owner, 7 Nov): the double-tap selection must stay (fixed: the tap's own late click collapsed it); double = word, triple = the visual line on screen, four taps = paragraph (450 ms, 12 px); the Lasso T filter selects just the words inside the loop, freeform or rectangle, whole lines still as blocks. Built; see CHANGELOG.
- R6-21 (found by CI fixer) The page shifts ~62 px up after the layer lock toast appears. Possibly the same family as R6-8 (page jumps); check on iPad and fix if real.

## Round 7 (owner iPad, 8 Nov 2026) — collecting; discuss at the end, then fix

- R7-1 After tapping Update, Pen, Lasso and most ink tools don't work (only text and a few tools do) until the app is closed/reset. The update must leave every tool working without a restart (likely stale old code/chunks mixed with new after the update, or ink set-up not re-run).
- R7-2 After many updates the app keeps asking to save a backup ("save to Drive / settings so data isn't lost"). Owner doesn't want that prompt again and again, and must never lose data on any update. Updates must be data-safe by design (upgrade backup automatic and silent, prompt only when truly needed).
- R7-3 Tools stop working on their own after a while of mixed use: e.g. draw with Pen, use Lasso, later the Eraser can't erase the pen ink; after restarting the app the same erase works. Some state gets stuck (likely the same family as R7-1: ink controller/tool state not reset, a stuck pointer capture, a stale layer lock, or the Lasso pad left owning input).
- R7-4 NOT FIXED (R6-18/19): with the Text tool on, tapping a word then double-tapping still selects and then deselects within a few seconds. Triple-tap (line) and four-tap (paragraph) selections also vanish the same way. The 1.5 s keepSelection guard is not enough on the real iPad — something later (a few seconds) clears it.
- R7-5 Strong lead for R7-1/R7-3: switching away from the app (to another tab/app, e.g. Claude) and coming back leaves the ink tools dead until restart. Suspect visibilitychange/pagehide/pageshow (bfcache) handling: pointer capture or the Lasso pad not released, ink controller/listeners torn down on hide and not re-attached on show, or the realtime/sync pause path.
- R7-6 Pencil multi-tap works at first, then after the "glitch" (tab switch / tools dying) it stops: double-tap sometimes, triple and four-tap not at all. Same root as R7-5. Also: double/triple/four-tap must also work while the Text (Aa) tool is on.
- R7-7 The selection mini bar (with ⓧ Deselect) can sit at/over the screen edge. Keep its contents and order, but clamp the bar's position so it always stays fully inside the page area.
- R7-8 Lasso freeform/rectangle worked at first, then stopped after the glitch; Pen works only after restarting the app. Same root as R7-5.
- R7-9 Big idea: a real "page" like GoodNotes / Notability / GoodNotes for PC — a fixed page (paper) surface you write on, instead of only a flowing stack of blocks where each line is a block and Enter extends it. Research how they do it; consider a page/canvas mode alongside blocks.
- R7-10 Toolbar customisation is lost after updates: e.g. owner added Read / Write pad to the bar, and after an update it reverted to defaults. The owner's bar layout must persist across updates (and ideally sync).
- R7-11 Editing the toolbar should open a clear, dedicated "Edit toolbar" screen/sheet (just the bar + available tools, drag to arrange), then close with ✕/Done to commit — like the reader-mode style. Today it's hard (e.g. hard to bring the Write pad back to the top bar). Apply the same easy-edit pattern to other customisable things. Owner: rest of the UI is "awesome".
- R7-12 Pinned tools: pinning added the Write pad at the END of the pinned list, so the owner had to scroll to reach it. Pinned items need ordering: drag-and-drop anywhere (top/bottom/middle) plus ↑/↓ one-step arrows, like the main bar has today — for the pinned list and the whole bar. Same smooth drag-and-drop, modern feel; today's options feel outdated and complex.
- R7-13 Tool search: show fixed sections when the search opens — Recent (last searched/used, e.g. Write pad, one tap to add/edit), Favourites, Recommended — above the search results.
- R7-14 Discoverability: a new user won't know the pinned row/bar scrolls and that more tools (e.g. Write pad) sit off the end. Show a clear 'more this way' cue on scrollable bars (edge fade + chevron or a count badge), consistent with the R5-13 scroll hints.
- R7-15 Write pad AI mode: with the Eraser chosen on the main bar, rubbing the pad's writing does not erase it (only Clear works). Eraser (and Undo) must work on the AI pad's strokes. Sequence before it: Pen → Text tool → selected a region → Eraser on the pad (nothing was inserted). In the same screenshot, blob-like marks appeared on the page above the pad — check whether the eraser drew ink on the page instead of erasing.
- R7-16 Write pad layout bug (screenshot): the "Insert automatically when I pause (2 s)" checkbox row overlaps the Size buttons (text drawn over 100%/125%); the Weight row is cut off at the right edge. The pad's control rows must wrap cleanly and never overlap.
- R7-17 Scrolling the toolbar with the Pencil often mis-taps a tool. Add a dedicated thin scroll handle/track under (or beside) a scrollable bar that the Pencil can drag to move the bar sideways (only shown when the bar overflows); dragging it never activates a tool. Pairs with R7-14 (show that more tools exist).
- R7-18 Write pad AI mode: add an Eraser button in the pad's own row (next to ␣ ↵ ⌫), defaulting to a precise/small eraser for single words, with the same options as the main Eraser (size, stroke vs. area). It is the SAME tool as the main Eraser (one shared setting), just a second place to reach it. Keep it simple if the shared settings add too much complexity.
- R7-19 (seen in screenshot) With the Lasso tool active on the main bar, a lasso loop drawn in the AI pad was left as an ink stroke in the pad. Main-bar tools (Lasso, Eraser) must act sensibly inside the AI pad (select/erase pad strokes) or the pad should use its own Pen and ignore them — never leave stray marks.
- R7-20 Undo after Insert removes the text from the page but does not put it back into the Write pad (it used to). Owner wants one universal Undo/Redo that reverses every action in order across page, pad, ink and tools as far as possible (e.g. Undo of Insert restores the pad text; Redo re-inserts).
- R7-21 Undo/Redo don't cover the Write pad mode switch: after writing with Scribble and switching to AI, Undo can't go back (to Scribble/the text state). Mode switches and AI 'Read' results should be undoable steps in the universal history (R7-20).
- R7-22 Write pad Scribble mode needs a Clear button too (clear all text in the pad), like AI mode has. Clear must be undoable.
- R7-OK Close and reopen the Write pad: the text is kept. Auto-insert on pause works.
- R7-23 Switching Scribble → AI needs an explanation: a one-time pop-up (with "Don't show again") saying what happens to the text, because a user won't understand it.
- R7-24 The dashed ghost preview at the page cursor did not appear (screenshot: text was in the pad, nothing ghosted on the page).
- R7-25 Auto-insert on pause clears the pad text after inserting. Owner wants the pad text kept (for review/editing; they clear it themselves, or via an optional "clear after insert" setting). Reword and rethink: something like "Copy to the page as I pause (keep editing here)", where the page copy follows the pad until you clear or confirm, so the owner can audit before it lands for good.
- R7-26 (screenshot) The iPadOS dock/shortcut bar overlaps the pad's bottom rows again; the Size/Weight row is still covered and overlapping (see R7-16).

## Round 8 (owner, 8 Nov 2026, GoodNotes reference screenshots)

- R8-1 Toolbar/pill layout like GoodNotes: a fixed band under the main bar, always reserved, just tall enough for the tool's options row (the pill), then a small margin, then the page. The page never shifts when the pill opens/closes (the band is always there). When the page scrolls up it slides under the floating band. A pill docked left/right/bottom floats over the page by default (as today, user can drag it).
- R8-2 Pencil mode: offer once when the app first sees an Apple Pencil (owner: yes).
- R8-3 Idea: a Reading mode with no editing allowed (locked, like Notion's lock page).
- R8-4 Ideas (handwritten): a prompt library (like Notion); notebook options like OneNote / a database of notebooks; templates chooser at start (like Notion); a learning daily journal (web app); ability to transfer/export for recovery; encryption "like Telegram".
