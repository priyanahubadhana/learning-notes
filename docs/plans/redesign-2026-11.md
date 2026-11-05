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
8. (Round 2) The Apple Pencil can't press-and-drag on the bar's tools to try and see options (as GoodNotes allows: tap and hold to open the tool's options, drag to choose).
9. The short bar is too full, its icons aren't clear, and the owner doesn't know what they do. It needs a full rework, so we'll walk through each item together (teach and redesign). Draw set screenshot: T / pencil / book switch, pin, an odd pen-and-eraser picture (an iPadOS Scribble overlay or our "coming" items?), lasso, All tools, search, ⋯, Done.
11. Editing the short bar is hard to find. The short bar's ⋯ menu should have "Edit bar" as its FIRST item, opening an easy list where you show or hide tools and move them up and down (drag, or ↑↓).
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
7. Layering bug: with the short bar plus the ribbon showing, the ⋯ (More) menu opens BEHIND or under the ribbon. Pop-ups must sit above both bars.

## Approved build order (owner, 5 Nov 2026) — run autonomously, step by step
1. Urgent fixes 3a (resume uncommitted work): Pencil delete, undo with pictures, History snapshot, Pencil taps.
2. New toolbar (tool → options pill that snaps to 4 edges → detail card), 5 pens, highlighter, eraser, lasso, Insert, New line hold, 📖 Read. Our own original look (no copying of GoodNotes art/icons).
3. Shared ink engine (notes, books, PDFs) with layers.
4. 4 spaces (Home, Library, Notebooks, Review) + one Search + left panel (Pages, Outline, Audio).
5. Library + reader (PDF, EPUB, Word; Kindle-style set; highlights as links; annotations; liquid mode).
6. Review decks + pause.
7. Home (Top 3, matrix tasks, carry-over, project timer + Pomodoro, timeline, reports, routines/habits/affirmations, evening journal, Briefing).
8. Fonts (small set + import), then read aloud (Audible-style player).
9. Notebook views (Shelf, Tabs, per-tab views) + Layer gallery (finance etc.).
10. Share and export.
Each step: research its inspirations → build → full tests → push → live check → owner tests anytime. Stop only for money, rules, or owner-only choices; log the rest in DECISIONS "Decisions to review".

## Added 5 Nov: scheduler + memory techniques
- Scheduler: keep FSRS (already the default) with target memory 90% (FSRS docs' recommended start; range 70–97%), user-adjustable in simple words. Validated against FSRS4Anki docs.
- Memory techniques layer in Review (owner request; inspired by memory-championship methods, e.g. as described in "Moonwalking with Einstein" — implement the techniques, not book content):
  - Memory palace (method of loci): a page/template where you place cards at "rooms/spots" of a familiar place; review walks the route.
  - Vivid image helper on cards: a field for your own mnemonic picture/sketch/story (ink or photo).
  - Major system / number-to-word helper for numbers and dates; PAO (person-action-object) table template.
  - Chunking and acronym builder for lists.
  - Linking/story method for ordered lists.
  - All feed normal FSRS review; offered as templates in the Layer gallery + a short "How to use" guide.
  - Research each method's evidence before building; label anything unproven.
