# Inspiration apps research (5 Nov 2026)

Purpose: ideas for our redesign (see docs/plans/redesign-2026-11.md). Everything below is described as functions and interactions. We build our OWN look, icons and wording. No app's art, icons or exact layout is copied.

## How reliable is this?

Live web search this session was thin: mostly SEO comparison posts, little Reddit text. Labels used:
- **[V]** verified on a page fetched today (5 Nov 2026).
- **[S]** seen in a search result today, secondary source.
- **[U]** unverified: from my own background knowledge (cutoff mid-2026). Re-check before relying on it.

Most app descriptions are [U]. They are well-known features, but versions and prices change. Sentiment ("users love/hate") is a pattern from reviews I know of, not a fresh survey.

---

## Part 1. The apps in short

### Notes and ink

**GoodNotes 6** - Unique: the digital paper notebook. Shelf of notebooks with covers, page thumbnails, great Pencil feel, handwriting search, shape snapping by hold-to-draw. [S: [Setapp comparison](https://setapp.com/app-reviews/goodnotes-vs-notability), [Astropad](https://astropad.com/blog/goodnotes-vs-notability/)]
- Key interactions [U]: tap a tool, tap again for its settings; tool options sit in a floating pill; lasso with a small menu; pin favourite pens; pages panel on the left; zoom window for writing big; laser pointer; templates.
- Love: one-time or cheap price, quick feel, organisation by folders [S: one-time price $29.99 per vendor-adjacent post]. Hate [U]: subscription shift and AI upsell, scale and rotate combined in one handle (the owner already noted this), no audio recording in v6 per one source [S, may be outdated].
- Beginner-friendliness: high. A blank page and a pen.

**Notability** - Unique: audio recording synced to handwriting (tap a word, hear what was said). [S] Free tier more generous; subscription cost hated by some [S].
- Interactions [U]: recording plays back with the ink replayed in sync; "Dividers" and "Subjects" for organisation; multi-note view.
- Beginner-friendliness: high.

**Apple Notes and Freeform** [U] - Unique: zero setup, instant, system-wide (Scribble, share sheet, lock notes). Freeform is an infinite board with drawings, sticky notes, connectors. Love: speed, free, no learning. Hate: weak organisation at scale, limited export, Freeform has little structure.

**Notion** - Unique: everything is a block; a page can hold a database; the same database shows as table, board, calendar, gallery, timeline. Templates and sharing pages are the community culture. [U]
- Love: flexibility, templates, linked databases. Hate: blank-page paralysis, slow on big workspaces, weak offline, mobile feel, the "build your own system" burden. Beginners often stall.
- Pattern to copy as a function: one "View" switch per collection, remembered. That matches our plan.

**OneNote** - Unique: notebook > section tabs (coloured) > pages, plus free placement of content anywhere on a page. [U]
- Love: free-form canvas, section tabs feel like a real binder, strong ink. Hate: sync glitches, messy page lists, a heavy ribbon, unclear which notebook is where.
- Beginner-friendliness: medium. The binder idea is easy; the sync and file locations confuse.

**Microsoft Word** (navigation pane, ribbon) - Unique: the Navigation pane lists headings as a tree, click to jump, drag a heading to move the whole section, current heading is highlighted, search results show in the same pane. The ribbon groups commands in tabs. [U]
- Love: headings pane for long documents. Hate: ribbon overwhelm; "where did that command go". The owner already likes the Word-style pane.

**Obsidian** - Unique: your notes are plain files, links between notes (backlinks), graph view, huge plugin library, Canvas (infinite board) and Bases (database-style views, added 2025). [S: [AlternativeTo on Bases](https://alternativeto.net/news/2025/8/obsidian-launches-new-bases-plugin-for-database-workflows-and-property-format-changes)]
- Love: ownership, speed, links. Hate: steep setup, plugin chaos, weak mobile feel, no handwriting. Beginner-friendliness: low.
- Idea to adopt: backlinks panel ("who links here"), links by typing `[[`.

### Reading

**Kindle app (iPad)** - Unique: it feels like a finished book. Whispersync (position and notes follow you), X-Ray (characters, terms), Page Flip (peek ahead or back without losing your place), time left in chapter or book, Vocabulary builder, Notes and highlights list by colour, and the "Aa" sheet with Font, Layout, Themes, More tabs. [U] A reading ruler exists as an accessibility option [S: [BGR](https://bgr.com/2163540/kindle-app-features-not-available-on-ereader/)].
- Love: minimal chrome, trust that your place is kept. Hate: app crashes and sync trouble reported recently [S, low-quality source, unverified]; highlights are hard to export; the Aa sheet is mixed with the reading screen.
- Beginner-friendliness: very high. That is the target.

**Apple Books** [U] - Unique: very polished page turn and themes, simple controls, PDF support, "Reading goals", and a collection system. Hate: weak notes export, highlights not easy to reorganise, limited fonts. An iOS 26 accessibility reader quirk reported that it reads only the first page in both Books and Kindle [S: [Apple Community thread, Jan 2026](https://discussions.apple.com/thread/256216271)], so system reading tools are not reliable for us.

**Google Play Books** [U] - Unique: upload your own PDF/EPUB (up to a few hundred files), cloud sync, "Listen" with Google's voices, night light themes, scroll or pages. Hate: upload friction, clumsy annotations. Interesting as proof that "bring your own DRM-free file" works as a normal feature.

**Adobe Acrobat (Liquid Mode)** [U] - Unique: Liquid Mode reflows a PDF into phone-friendly text with a heading outline and collapsible sections, plus AI summaries (paid). Love: unreadable PDFs become readable on phone. Hate: breaks on complex layouts, tables, maths; sometimes wrong order. For us: do "reflow" only on text-based PDFs and always offer "Show original page" one tap away.

**Readwise Reader** - Unique: one inbox for articles, PDFs, EPUBs, newsletters; highlights are first-class, sync to Notion/Obsidian, Daily Review of old highlights (spaced), "Ghostreader" AI that summarises, defines and makes flashcards. [S: [Readwise update Aug 2026](https://readwise.io/reader/update-aug2026), [DEV review](https://dev.to/pickuma/readwise-reader-review-is-it-worth-it-for-developers-in-2026-33kf)]
- Love: highlights + review in one loop. Hate: price and subscription [S: sources disagree on price], speed on very large libraries [U], keyboard-heavy for new users.
- Closest to our idea: highlight then review. Daily Review of highlights is a good home-screen function (not a Home card for reading, per the plan; put it in Review).

**Audible** (player, sleep timer) [U] - Unique: the player. Big cover, play/pause, back/forward 30 s (configurable), speed control, chapters list, bookmarks with notes, sleep timer (minutes, end of chapter, shake to extend). Love: sleep timer, remembers place, chapter navigation. Hate: bookmarks buried, speed resets sometimes. The owner wants this as the read-aloud panel.

### Review, tasks, time

**Anki** - Unique: the spaced repetition engine, decks, deck options, filtered decks (a temporary deck made from a search, like "tag:exam due in 7 days"), suspend (card stops showing until un-suspended), bury (hide until tomorrow), FSRS scheduler (newer memory model, needs your review history to tune). [V: [Anki manual, filtered decks](https://docs.ankiweb.net/manual/filtered-decks)]
- What the forums show [S]: filtered decks do not pull suspended or buried cards; suspend wins over bury; filtered decks do not refill when you bury or suspend; FSRS only partly counts filtered-deck reviews. See [forum thread on suspend/bury](https://forums.ankiweb.net/t/browse-notes-suspend-bury-how-to-understand-the-logic-of-work/68084) and [FSRS and filtered decks](https://forums.ankiweb.net/t/do-filtered-decks-have-an-effect-on-fsrs/60365).
- Love: power, free, add-ons. Hate: ugly, steep learning curve, too many options, "what is the difference between suspend and bury", deck vs tag confusion. Beginner-friendliness: low.
- Lesson: our "deck = saved filter" is cleaner than Anki's nested decks plus filtered decks. Keep ONE kind of deck.

**Todoist** [U, S: [roundup](https://www.sourceforge.net/software/compare/TickTick-vs-Todoist)] - Unique: natural-language quick add ("pay rent every 1st at 9am #Home p1"), projects, labels, filters, Upcoming view, "Today" with overdue. Love: speed of capture. Hate: Pomodoro/habits absent, premium for key features.

**TickTick** [S: [Digital PM](https://thedigitalprojectmanager.com/ticktick-vs-todoist-2/), [G2](https://www.g2.com/products/ticktick)] - Unique: all-in-one: tasks, calendar, Eisenhower matrix view, built-in Pomodoro with white noise, habit tracker. Love: price, breadth. Hate [S, thin]: crowded, calendar events hard to spot. The matrix in TickTick is auto-sorted by due date and priority [U]; the owner wants MANUAL drag into quadrants. That is a difference we keep.

**Toggl Track** [U, S: [G2 4.6/5, 1,590 reviews](https://www.g2.com/compare/tick)] - Unique: one-tap timer, project (and client) tagging, reports by project, timeline view of the day, "forgot to stop" reminders and idle detection. Love: speed, reports. Hate: forgetting to start; clutter with too many tags. Owner wants project-only: good, it is simpler.

**Sunsama** [S: calm interface, guided planning rituals, ~$20/month, no auto-scheduling] - Unique: a guided daily planning ritual (pull tasks from other tools, pick today's, estimate time, drag onto a timeline), a "shutdown" ritual at the end of day, a daily "workload" meter that warns when the plan is too big. Hate: price, no free tier. This is the model for our Home: morning plan, evening review.

---

## Part 2. Mapping to the build order

### Step 1. Toolbar (tool, options pill, detail card)

Best ideas to adopt
- One-tap select; tap active tool again for the detail card; card has sub-pages with a back arrow (GoodNotes-style interaction, our own look).
- Pill that snaps to four edges; show faint drop zones while dragging so the user sees where it will land.
- "Pin this tool" as a small pin that keeps the tool's current settings as a favourite chip. Limit favourites (about 5) so the row stays calm.
- Press-and-drag from a tool to see options, release to pick. This is the owner's item 8, and it needs pointer events with a hold timer (about 350 ms; separate from the 0.6 s New-line hold).
- Edit bar as first item in the "more" menu: list with show/hide and drag handles, plus up/down buttons for accessibility.
- Word's lesson: group by task, not by feature. Our "All tools" should be searchable.
- Notion's slash menu idea for Insert: type to filter.

Pitfalls
- Too many icons: keep to the approved order (undo/redo, Text, Pen, Highlighter, Eraser, New line, Lasso, Insert).
- Icon-only with no names. Add a long-press tooltip and a "What is this?" label in the Edit bar list.
- Pop-ups behind bars (owner bug 7): one z-index layer scale in code.
- Toggle behaviour (item 18): a tool that is on turns off on second tap and stays on the same tab. Test every toggle.
- Pencil input: GoodNotes-style "finger scrolls, Pencil draws" must be a setting, because users hate when palms or fingers draw.

Quick wins: tooltips; remembered last pill position; haptic-style visual "click" on snapping.

### Step 2. Shared ink engine and layers

Best ideas
- **perfect-freehand** (MIT) makes pressure-shaped strokes from points. [V: [repo](https://github.com/steveruizok/perfect-freehand)]. Store raw points (x, y, pressure, time), render with it, so changing pen type later never loses data.
- Lasso with filters (ink, pictures, text) and SEPARATE scale and rotate handles.
- Hold-at-end-of-stroke to snap to a perfect shape (GoodNotes and Notability do this) [U].
- Notability's audio-synced ink: store a timestamp per stroke now, so the Audio tab can later replay. A cheap hook.
- Layers: each layer can be hidden (eye), locked, renamed. Keep to a short list; Freeform and OneNote have no layers, so beginners may never find them. Show "Layers" as a small stack icon with a count.
- Apple Pencil: use `pointerType === "pen"` and pressure; palm rejection by ignoring touch while a pen is down.

Pitfalls
- Stroke storage size. Compress points (drop near-duplicates) and store per-page chunks, so a 300-page PDF with ink stays fast (see rules/scalability.md).
- Undo for ink must be one action per stroke or per erase gesture, not per point.
- Anchoring ink to reflowable text drifts when fonts change. The plan's "drawn at" memory plus "View as drawn" is the right fix.

Quick wins: stroke smoothing slider; "straighten on hold" switch; eraser that shows a circle at the chosen size.

### Step 3. Four spaces, Search, left panel

Best ideas
- Fixed bottom/side tabs: Home, Library, Notebooks, Review, with one search always at the top. Apple Notes and OneNote both lose users by hiding search.
- Left panel Pages / Outline / Audio: GoodNotes thumbnails; Word's heading pane in Outline (collapsible tree, highlight current heading, drag to reorder sections).
- Search that shows results grouped by space (Notebooks, Library, Cards, Tasks) with a snippet. Readwise and Obsidian both do "search inside highlights" [U].
- Obsidian backlinks: a small "Linked from" list in the Outline tab.

Pitfalls
- Don't build a settings-heavy sidebar (the owner's item 1). Truncated names: give names two lines, not an ellipsis, and show icons only on hover or in edit mode.
- OneNote's "which notebook is this in?" confusion: always show a breadcrumb.

Quick wins: recent pages chip row in Search; keyboard shortcut for search (PC).

### Step 4. Library and reader

Best ideas
- Library as gallery with covers, progress % bar, "Continue" button (Kindle, Apple Books).
- Kindle "Aa" sheet with four tabs. Keep it inside the reader only.
- Page Flip: a draggable slider with a preview pop-up and a "back to where I was" button. Cheap and well loved [U].
- Reading ruler / line focus: already in our options.
- Time left in chapter, time left in book, from a measured per-user reading speed [U].
- Highlights as deep links (an anchor id plus text quote plus offset, so they survive reflow). EPUB has a standard position format (CFI) [V: foliate-js supports CFI]. For PDFs use page number plus rectangles.
- Annotation list with filters by type, colour, chapter, as the owner described. Readwise's tag-on-highlight is a good extra: a 1-tap "tag" row.
- Highlight pop-up: colours first, then Note, Copy, Look up, Pin (as the owner listed). Keep "Save to notebook" as a second step, so the pop-up stays small.
- Acrobat Liquid Mode: reflow text-based PDFs with a switch "Original page / Reflowed".
- Export highlights as Markdown/text (Kindle's weak spot, Readwise's strength).
- Google Play Books: import by "Add file", drag-and-drop on PC, share-sheet "Open in" on iPad.

Pitfalls
- DRM-free only; say so clearly in the import dialog.
- Scanned PDFs have no text layer: highlights must fall back to rectangles. Warn instead of failing silently. OCR is a later, separate decision.
- Large EPUBs: stream and render one chapter at a time.
- EPUB scripts: never run; use a strict Content Security Policy [V: foliate-js notes this].
- Mammoth does NOT sanitise: clean its HTML before display [V: [mammoth README](https://github.com/mwilliamson/mammoth.js)].
- Kindle complaints about crashes and lost sync [S, weak]: save reading position locally at every page turn and on app hide.

Quick wins: "Continue" button on every book card; a progress ring; remember per-book font settings; a chapter-end "Next chapter" toast.

### Step 5. Review decks and pause

Best ideas
- Deck = saved filter (notebooks, chapters, tags, collections, card state), made in a 2-3 step picker. Anki's filtered deck proves the idea; its pain is two deck systems and confusing flags. [V: [Anki manual](https://docs.ankiweb.net/manual/filtered-decks)]
- Show counts on every deck card: New, Learning, Due, as three small numbers (Anki's best screen).
- One "Pause" concept in plain words (Anki has suspend AND bury). Offer "Pause until I un-pause" and an optional "Skip today" later. Paused cards should be listed in one place, with a "Resume" button.
- FSRS: a free open algorithm (MIT; the `ts-fsrs` library) [U]. Cheap to adopt, better intervals than old SM-2. Verify licence and fit before choosing; it is a stack choice, so ask the owner.
- Readwise Daily Review: a mixed set of highlights to re-read, no grading. A "Re-read" mode beside "Test" mode.
- Rating buttons: four (Again, Hard, Good, Easy) with the next interval printed on each, like Anki [U].

Pitfalls
- Anki's learning curve: don't expose "ease", "leeches", "learn steps" in the main flow. Put Deck options on a card with sensible defaults.
- Filtered decks that do not refill, or that hide paused cards [S]: if a deck is a saved filter that recomputes live, these problems vanish. Say so in the help.
- Decks that drift: show a "N cards match" preview before saving.

Quick wins: deck preview count; "Review 10 now" button; streak without nagging notifications.

### Step 6. Home (cockpit)

Best ideas
- Sunsama: morning "plan the day" step and evening "shut down" step. Keep both optional, one screen each. [S]
- Top 3 priorities (like Sunsama's focus and Todoist's p1): show as big, tickable lines, with a counter "2 of 3".
- Todoist-style quick add with plain-words date parsing ("tomorrow", "every Monday"). Start with a small set of words; local, no AI cost.
- TickTick: Pomodoro that is part of the task screen (start from a task), and white noise as a later idea. [S] Habit streak chips.
- Manual Eisenhower: inbox list, drag into four boxes; keep the quadrant on the task as a plain field. (Matches owner's workflow, not TickTick's auto sort.)
- Toggl: timer with project only, a single big Start/Stop, a running-timer chip visible everywhere, daily timeline planned vs actual, weekly hours by project. Toggl's "forgot to stop" prompt is useful: after 2 hours ask "still working?" in-app (no push needed).
- Evening journal: day record that keeps unfinished tasks, with "carry forward / move / leave". Matches owner flow.
- Habits: red mark for missed day, no notifications (the owner's rule). Show a 7-day strip, not a heavy chart.
- Tasks from checklist lines in any note: a task has a "source" link back to the note (Notion/Todoist do this as database rows).

Pitfalls
- TickTick feels crowded [S]. One scroll, big cards, collapsible sections; hide empty ones.
- Overdue pile-up shame (Todoist). Carry-over should be calm, with "Plan again" rather than a red list.
- Timers in a browser tab: browsers slow background timers. Store the start time and compute elapsed time from it, never count ticks. Add a Wake Lock only while the timer is visible.
- Health data later; don't promise it on web.

Quick wins: "start timer" from any task; drag a task onto the timeline to block time; "Plan tomorrow" button in the evening step.

### Step 7. Fonts and read aloud

Best ideas
- Fonts: see Part 3. Show each font in a live preview tile with the user's own sentence; cap the list.
- Audible player layout: cover/title, big play, back/forward (10, 15, 30 s or one sentence), speed chips (0.8 to 2.0), chapter/next page, sleep timer (minutes or end of chapter), bookmark. [U]
- Mini player: a floating pill with title, play/pause, and a stop button, visible in every space (owner item 24). Audible and Spotify both keep it above the tab bar. It must stop when the user presses stop, and it should stop automatically when the page that owns it is deleted.
- Read from a tapped sentence ("Read from here").
- Highlight the sentence being read (like Google Play Books and Kindle's Immersion style) [U].
- Affirmations: play a saved recording or read bullets aloud, as the plan says.

Pitfalls
- Repeated words bug: usually from restarting `speechSynthesis` per chunk with overlapping utterances, or from the `onboundary` event firing more than once. Fix by queueing one utterance per sentence, cancelling once, and keeping a single "current index".
- Paid neural voices need the owner's approval. Do not add.
- Robotic voice: do not call per-word; sentence-level pacing with a short pause after full stops and longer after paragraphs.

Quick wins: sleep timer; "end of chapter" option; remember speed per user.

### Step 8. Notebook views and Layer gallery

Best ideas
- Notion: one collection, many views (list, gallery, board, table, calendar), remembered per tab. Show the view switcher as a small segmented control.
- GoodNotes shelf with covers; OneNote coloured section tabs: these are just two "view" settings on the same data.
- Obsidian Bases: filter + sort + columns saved as a "view" [S]. This is the right mental model for the "per-tab view" feature.
- Layer gallery = Notion template gallery: a card with preview, "Add to my app", and a "what it adds" line. Shareable as a file first, links later (Sync).
- Show 3 starter layers only; others behind "More layers". Blank-page paralysis is Notion's big beginner problem.

Pitfalls
- Notion slows with huge databases; page and virtualise lists (rules/scalability.md).
- Too many view types at once. Ship list, gallery, board first; table next; calendar after.
- A template that edits core data can break user notes; layers should only ADD views and fields, and be removable.

Quick wins: "Duplicate view"; remember last view per tab; a "Reset to default" button.

### Step 9. Share and export

Best ideas
- Web Share API (`navigator.share({files})`) opens the system sheet; check `navigator.canShare` first. Works on iPad Safari over HTTPS. [U; MDN says check support]
- Export: PDF (print stylesheet or a PDF library), DOCX (the `docx` library, MIT [U]), Markdown, plain text. Obsidian and Readwise prove that Markdown export is loved.
- Readwise-style highlight export to Markdown with a quote, note and location.
- Share-as-link is a Sync-phase feature; for now offer a "Copy as file" bundle that another user opens via Import.

Pitfalls
- Share sheet must be called from a user tap; otherwise Safari blocks it.
- Large images in DOCX; downsize first.
- Do not leak locked pages or private notebooks into exports; ask first.

Quick wins: "Export this page / this notebook"; filename uses the page title; success toast with Share button.

---

## Part 3. Fonts (free, open licence)

All are on Google Fonts under the SIL Open Font License 1.1 unless noted. Licence for each should be re-read in its OFL.txt before bundling; ship the licence text with the app. Self-host the files (no Google CDN) so it works offline and avoids tracking.

Long reading
1. **Literata** - made for Google Play Books reading; book serif. OFL [U; the Google Fonts page fetch returned no details]. https://fonts.google.com/specimen/Literata
2. **Source Serif 4** (Adobe) - clear book serif with optical sizes. OFL [U]. https://fonts.google.com/specimen/Source+Serif+4
3. **Atkinson Hyperlegible** (Braille Institute) - calm sans with very distinct letters; OFL. [S: [Font Squirrel](https://www.fontsquirrel.com/fonts/atkinson-hyperlegible), [Debian review of "Next" version](https://dfsg-new-queue.debian.org/reviews/fonts-atkinson-hyperlegible-next/0.0~git20250221.7925f50-2)]. Also serves as the readability pick.
4. **Lexend** - designed to speed reading; also the "easier reading" option; OFL [S: listed as strong dyslexia option in [WebAbility guide](https://www.webability.io/blog/font-for-dyslexia)]. https://fonts.google.com/specimen/Lexend

Honesty note: one article argues "dyslexia fonts" help less than size and spacing [S: [raindrop collection link](https://raindrop.io/a11ycat/designers-36013897/embed/sort=-created&perpage=30&page=0&search=%23Dyslexia)]. So label this font "Easier reading" not "for dyslexia", and keep spacing sliders. OpenDyslexic is OFL too [U] but looks heavy; Lexend plus Atkinson already cover it.

Natural handwriting (for notes, headings)
5. **Caveat** - flowing, quick pen; OFL 1.1. [S: [Font Squirrel](https://www.fontsquirrel.com/fonts/caveat)]
6. **Kalam** - neat Latin and Devanagari handwriting; OFL [S: listed in a roundup; [U] for Devanagari]. Valuable for Hindi users (our i18n has hi). https://fonts.google.com/specimen/Kalam
7. **Patrick Hand** - tidy, very readable print-hand; OFL, single weight [S: roundup]. https://fonts.google.com/specimen/Patrick+Hand
8. **Shantell Sans** - marker-pen look with adjustable "bounce" and "informality"; OFL [U; search did not confirm]. https://fonts.google.com/specimen/Shantell+Sans

Reserve: Nanum Pen Script (OFL, Korean-focused, [S: [Fontsource](https://fontsource.org/fonts/nanum-pen-script/about)]); Gaegu (licence unconfirmed).

Practical points [U]
- Use WOFF2 files and subsets (Latin plus Devanagari for the fonts that have it) to keep the download small; check the OFL "reserved font name" rule if we subset (renaming may be required for modified files; plain subsetting for web is generally accepted but confirm in the OFL FAQ).
- "Import your own font": use the `FontFace` API with a file from the file picker, store the blob in IndexedDB. Warn that the user is responsible for the licence. Fonts embedded in exports (PDF/DOCX) can raise licence questions, so fall back to a standard font on export unless the font is one of ours.
- Do not auto-load all 8 fonts: load a font only when chosen or previewed.

---

## Part 4. Free natural-sounding read aloud

Order of preference (all ₹0):
1. **Device voices via the Web Speech API** (`speechSynthesis`). On Apple devices the Premium and Enhanced voices sound far better than Compact ones, but they are not on by default. The user downloads them in Settings, Accessibility, Spoken Content, Voices; each is over 100 MB [S: [Ben Dodson on iOS 16](https://bendodson.com/weblog/2024/04/03/using-your-personal-voice-in-an-ios-app/), about the native API].
2. Our app can call `getVoices()` and rank: names containing "Premium" or "Enhanced" first, then "Siri"-style names, then default. Whether Safari exposes the Premium voices to web pages depends on the iOS version and must be tested on the owner's iPad [U].
3. **Offline neural voices in the browser** (open source, runs on-device): Piper voices (MIT code; each voice model has its own licence, check) through a WebAssembly build, or Kokoro-82M (Apache 2.0) via transformers.js/WebGPU [U, newer projects; both unverified]. Cost: a 50-100 MB first download and slower start on old iPads. Park until the owner agrees; it is free in money terms but adds weight and risk.

Web Speech quirks to plan for
- `getVoices()` may be empty at first; wait for the `voiceschanged` event and retry [S: [StackOverflow report](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/72027048/speechsynthesis-getvoices-returns-an-empty-array-on-safari)].
- A page cannot see voices that are available but not yet downloaded [S: [Apple forum](https://developer.apple.com/forums/thread/758460)]. So show a "Get better voices" help card with the Settings path, and re-check when the app regains focus.
- Older Safari let you pick only one voice per language [S, iOS 11 era, possibly outdated]; test.
- Speech starts only after a user tap (autoplay rules).
- Long text can cut off (Chrome stops after about 15 s; a long-known bug) [U]. Use one utterance per sentence.
- Pause/resume is unreliable on some browsers; implement pause as cancel plus resume from the current sentence index [U].
- `onboundary` events are not always fired on iOS [U]; track by sentence start, not word.
- Speech may stop when the page is in the background or the screen locks [U]. Tell the user honestly.
- Media Session API (lock-screen controls) works with real audio elements, not with speechSynthesis alone [U]. Another reason an offline neural voice (real audio) is attractive later.

**Paid options (need owner approval, not used now):** cloud neural voices (Azure, Google, Amazon Polly, ElevenLabs, OpenAI). Costs scale with users; this conflicts with the Budget-₹0 rule, so parked.

---

## Part 5. Free libraries

| Job | Library | Licence | Notes |
| --- | --- | --- | --- |
| PDF | **pdf.js** (Mozilla) | Apache 2.0 [S: named in [foliate-js](https://github.com/johnfactotum/foliate-js)] | Renders pages to canvas, gives a text layer for selection and highlights. Run in a worker; render only visible pages. |
| EPUB (option A) | **foliate-js** | MIT [V]; bundles zip.js (BSD-3), fflate (MIT) | Supports EPUB, MOBI/KF8, FB2, CBZ; CFI positions; search; text-to-speech SSML output; annotation overlays; pagination. But its own README says the API may change and there is no formal release, so pin a commit. |
| EPUB (option B) | **epub.js** | BSD (Free BSD, per README) [V, licence text not seen] | Older and widely used, 7k stars, many open issues, repository points the reader to a separate repo; maintenance level unclear [V]. |
| DOCX import | **mammoth.js** | BSD-2-Clause [V] | Word to clean HTML (headings, lists, tables, images, footnotes). No sanitising: clean the output. Ignores table borders and underline by default. |
| Ink | **perfect-freehand** | MIT [V] | Points to smooth pressure-shaped outlines. Tiny. Sponsorship asked for commercial use (not required). |
| DOCX export | **docx** | MIT [U] | For step 9. |
| Scheduling | **ts-fsrs** | MIT [U] | For step 5, ask owner first. |

Recommendation: foliate-js for EPUB (more complete: CFI, search, annotations, TTS hooks) behind our own thin wrapper so a swap to epub.js is possible if it breaks. Check each licence file again when adding the dependency (rules/security.md).

---

## Part 6. Top ten lessons across all apps

1. Kindle: minimal chrome; the book comes first; settings live in one sheet inside the reader.
2. GoodNotes: tool, then its options, then a detail card; keep it consistent everywhere.
3. Notion: one data layer with many views; templates are the growth engine; avoid the blank page.
4. OneNote: binder structure is intuitive; avoid its sync confusion with clear status text.
5. Word: heading tree beside the document is the best long-text navigation.
6. Anki: power comes from filters; beginners suffer from jargon (suspend, bury, ease). Use plain words.
7. Readwise: highlights are only valuable if you see them again; the review loop makes them stick.
8. Sunsama/Todoist/TickTick: a calm daily ritual beats a big dashboard; capture must be one step.
9. Toggl: one big button, projects only; timers must survive reloads.
10. Audible: the sleep timer and the mini player earn their place; make them reachable everywhere.

## Things not found (open items)

- Fresh Reddit sentiment was not retrievable (search tool returned aggregators). Sentiment above is mostly [U].
- Not verified today: Literata, Source Serif 4, Lexend, Kalam, Patrick Hand and Shantell Sans licence pages; Piper/Kokoro/ts-fsrs/docx licences; whether iPad Safari exposes Premium/Enhanced voices to `speechSynthesis` on the owner's iOS version.
- Pricing figures from search results disagree; do not quote them to users.
