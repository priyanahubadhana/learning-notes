# Ideas (parked)

- **24 Nov 2026 · The management board (owner; must, phase 1B, a small part):** one page on the docs site that a program makes from the real files (STATE, FEATURES, the GitHub issues): the phase, the parts and their states, the open bugs, what waits for the owner, with diagrams instead of long text. Made by a program, so it never drifts. Older wish of the same kind: a bug and spec dashboard the owner can open from anywhere (DECISIONS, stage-1 talks). Owner rule of the same evening for all pictures: Claude picks by the case (look change → PNG; long text → a diagram on top; drag or movement → an HTML file).
- **24 Nov 2026 · The "Show toolbar" pill becomes a small control (owner; later, stage 3 refinement; pictures and a spec for the owner's yes BEFORE any build):** today, after a tap on "Show toolbar", the tool bar stays and does not hide again when writing goes on. Wanted (owner's words, iPad check of 24 Nov): (1) an arrow that opens the tool bar; (2) an option that typing again hides it directly; (3) an option to pin the tool bar open while typing, inside the same control. Claude designs the best form first (pictures, spec), then the owner checks. Until then the present setting "Hide toolbar while writing" (off by default) is enough.
- **24 Nov 2026 · Use the empty space when the tool bar hides (owner; later, stage 3 refinement, try before deciding):** when the tool bar hides, the space where it was stays empty. Owner: leave it empty now; try moving the page up in the refinement stage. The case against moving it: the page jumps each time the bar hides and shows.

- **24 Nov 2026 · Spelling pop-up at the cursor (owner; later, stage 3 refinement):** when the typing cursor rests in a misspelled word, a small pop-up shows the suggestion (as Google Docs does; the owner's two screenshots of 24 Nov); nothing shows when the cursor is elsewhere. Right-click stays the Hold menu everywhere (HM-OPEN-4). Not in stages 1 and 2.

- **22 Nov 2026 · Tool previews on hold (owner; later, stage 2 polish):** press-and-hold on a tool bar icon plays a small preview of what the tool does, like Photoshop's tool tips; for new users; a setting to turn it off; hover keeps showing the name. Source: principles.md Q12.

New ideas that come up mid-build are parked here, not added to the current phase.

- 2026-10-25 — AI learning companion: watches the screen and listens to the voice while learning; writes detailed notes, a keyword summary and flashcards; adds spoken insights to both the notes and the summary _(Likely phase: 7)_
- 2026-10-25 — Handwriting (iPad, GoodNotes-style): an ink block storing pen strokes; AI "Convert to text" creates linked normal blocks and keeps the handwriting (`source: 'handwriting'`); works with the AI learning companion _(Likely phase: 7)_
- 2026-10-25 — Anki import/export (.apkg) for users with existing decks _(Likely phase: Done (Phase 6 step 4); later: import schedules, tags, pictures)_
- 2026-10-25 — Multiple languages: translations for all app text (Intl-based dates, e.g. journal titles) _(Likely phase: 6–7)_
- 2026-10-25 — Convert Phase 1–2 hard-coded text to `t()` translation keys _(Likely phase: 6–7 (with languages))_
- 2026-10-25 — Full phone/tablet layout for the whole app (sidebar as drawer, etc.) — its own step _(Likely phase: Before hosting)_
- 2026-10-25 — Installable app (PWA: home-screen install, offline cache; stops Safari deleting data) _(Likely phase: Before hosting)_
- 2026-10-25 — Health/personal data privacy: encryption, GDPR/HIPAA review before sync or hosting _(Likely phase: 6)_
- 2026-10-25 — Wrong device clocks: detect/handle clock skew when syncing schedules _(Likely phase: 6)_
- 2026-10-26 — Phone: the selection toolbar (bold, Blank, Card…) is wider than a phone screen; needs a compact/mobile toolbar _(Likely phase: Before hosting (with phone layout))_
- 2026-10-26 — Off-computer backup (e.g. private GitHub repo); decide after the app is fully built _(Likely phase: Later)_
- 2026-10-26 — Tags on cards _(Likely phase: In Phase 4 plan (approved 2026-10-26))_
- 2026-10-26 — Cards table view (database-style) _(Likely phase: Phase 5A (Cards tab + Table view))_
- 2026-10-26 — Bulk actions on cards (suspend, move, tag, delete) _(Likely phase: 4–5)_
- 2026-10-26 — Stats and streaks _(Likely phase: Phase 5A (Study tracker dashboard, heatmap); more stats later)_
- 2026-10-26 — FSRS personal training: tune the FSRS weights to your own review history (needs a few hundred reviews; optimizer package) _(Likely phase: 4–5)_
- 2026-10-26 — Moving a page to another notebook must also update its cards' `notebookId`/`pageId` (copies kept for fast lookups; search entries now follow automatically, Step 2) — no "move to another notebook" exists yet; guard note in `movePage` _(Likely phase: With "move page to another notebook")_
- 2026-10-26 — Optional daily review cap also counts FSRS short-step repeats; decide if they should count _(Likely phase: 4–5 (with stats))_
- 2026-10-26 — Upgrade to TypeScript 7 (@types/node 26 done 2026-10-27). Blocked: typescript-eslint supports only TS < 6.1 and TS 7 has no JS API for it; official side-by-side package @typescript/typescript6 exists. Gain small (type check ~3 s → ~1 s) _(Likely phase: When typescript-eslint supports TS 7 (check at each phase start))_
- 2026-10-26 — Backfill LEARNING.md for Phases 1–2 _(Likely phase: Any time (owner's call))_
- 2026-10-26 — Unlinked mentions: "Linked from" also lists pages that mention this page's title without a link, with a one-click "Link" button _(Likely phase: After Phase 4 (uses the search index))_
- 2026-10-26 — Create a page from [[ when no page has that name (asks which notebook) _(Likely phase: After Phase 4)_
- 2026-10-26 — Typo-tolerant search ("mitrel" finds mitral) as a pluggable matcher on the word index; "Did you mean…?" is its first part _(Likely phase: 5 or later)_
- 2026-10-26 — Search: Chinese/Japanese words are split by the browser's dictionary, so a search for part of a compound word (e.g. 京都 inside 東京都) may miss; add character-pair matching for these scripts _(Likely phase: 5 or later)_
- 2026-10-26 — Reorder saved searches by dragging (the order is already stored) _(Likely phase: 4–5)_
- 2026-10-26 — A line with several blanks is one search result (status = its most urgent card); a per-card view could come with the Cards table view _(Likely phase: 5 (with Cards table view))_
- 2026-10-26 — Link labels in search snippets / card lists can show an old title after a rename; refresh stored labels in the background (e.g. when the linking page is opened) _(Likely phase: 5 or later)_
- 2026-10-26 — Link picker: very fast typing right after "[[" (under ~20 ms) can put the first letters in the note instead of the picker _(Likely phase: Polish (any time))_
- 2026-10-26 — Links inside a page (to its own headings) could be listed separately ("On this page") _(Likely phase: 5 or later)_
- 2026-10-27 — "#" tag menu: very fast typing then Enter (before the list updates) can pick the previous match, like the [[ picker _(Likely phase: Polish (any time))_
- 2026-10-27 — Tags typed in notes of a page in the Trash are not updated by Merge/Delete tag (deleted notes have no tag rows); after Restore they show as deleted tags. Update them on restore or include Trash in the rewrite _(Likely phase: Done (Phase 4 Step 6, 2026-10-27))_
- 2026-10-27 — Drag a tag onto another in the sidebar to move or merge it _(Likely phase: 5 or later)_
- 2026-10-27 — "Create #…" in Move under… (move into a brand-new parent tag) _(Likely phase: Polish (any time))_
- 2026-10-27 — Most failed: optional time window (e.g. last 30 days) and "Wrong N×" also in Review and Card lists _(Likely phase: 4–5 (with stats))_
- 2026-10-27 — Remove a single empty card from its search row (today: open the note, or remove all listed) _(Likely phase: Polish (any time))_
- 2026-10-27 — Undo of "Remove empty cards" writes back the old blocks; edits made to those same lines in between (within the toast's few seconds) would be undone too _(Likely phase: Polish (any time))_
- 2026-10-27 — Publish databases so others can use them (public library); needs hosting and accounts. Phase 5B gives file export/import meanwhile _(Likely phase: 6–7)_
- 2026-10-27 — AI that watches the screen while learning and compiles it into notes and databases (extends the AI learning companion) _(Likely phase: 7)_
- 2026-10-27 — Custom notebook tab templates (choose which tabs a new notebook gets) _(Likely phase: After Phase 5)_
- 2026-10-27 — Search inside database cell values (today search finds row titles and row notes, not cells) _(Likely phase: 5B or later)_
- 2026-10-27 — Change a Relation column into another type (and back) without losing its links _(Likely phase: Polish (any time))_
- 2026-10-27 — Flaky e2e: Tags screenshot (Day 1280×800) failed once in a full run, passed on rerun _(Likely phase: Polish (any time))_
- 2026-10-27 — Table: arrow keys move between cells (spreadsheet-style), Enter edits _(Likely phase: 5A-8 or later)_
- 2026-10-27 — Table: sort by several columns and "match any" filters (the engine already supports both; only the menus are missing) _(Likely phase: 5B)_
- 2026-10-27 — Table: drag columns to reorder (service `moveColumn` exists) and change column widths _(Likely phase: 5B)_
- 2026-10-27 — Table: row menu (delete, duplicate) for rows of normal databases; Study tracker rows are notes and are deleted from the sidebar _(Likely phase: 5A-7)_
- 2026-10-27 — Dashboard: drag charts to reorder and resize them freely (today: Move earlier/later, sizes Small/Medium/Wide) _(Likely phase: 5B or later)_
- 2026-10-27 — Dashboard: one filter row above all charts (date range presets like last 7/30/90 days) _(Likely phase: 5B)_
- 2026-10-27 — Calendar heatmap: weekday labels and bigger squares on wide screens _(Likely phase: Polish)_
- 2026-10-27 — Study tracker charts say "from 3 rows"; could say "from 3 lessons" _(Likely phase: Done (5A-6))_
- 2026-10-27 — Flaky e2e: "search in All finds settings" timed out once in a full run, passed on rerun _(Likely phase: Testing)_
- 2026-10-27 — Board: reorder cards inside a column (drag up/down); today cards keep row order _(Likely phase: Done (5A-5 fixes))_
- 2026-10-27 — Board: group by Checkbox (Done / Not done), Tag or Choices columns too (a row with several values shows in several columns) _(Likely phase: 5B)_
- 2026-10-27 — Board: sort and filter menus for the board itself (the engine already applies a view's saved sorts/filters), "+ Add group" at the end, collapse a column _(Likely phase: 5B)_
- 2026-10-27 — "+ View": add more views of any type with their own names (e.g. two Boards grouped differently); `addView` exists _(Likely phase: 5A-7 or 5B)_
- 2026-10-27 — Flaky e2e: 5 card tests (cards.spec Duplicate, cardTools Most failed / empty cards / 2 screenshots) failed together once in a full run, all passed alone and in the next full run; probably load with 4 workers _(Likely phase: Testing)_
- 2026-10-27 — Make databases and views behave as blocks, Notion-style (a database or one of its views can be placed, moved and nested like any other block in a page) _(Likely phase: 5B or later)_
- 2026-10-27 — Board: auto-scroll the page up/down while dragging a card near the top or bottom edge (sideways auto-scroll exists) _(Likely phase: Polish)_
- 2026-10-27 — Board: "Move up / Move down" in a card's ⋯ menu, so keyboard users can reorder inside a column _(Likely phase: Polish)_
- 2026-10-27 — Restore from the backup (browser copy or file) with a button, before import arrives _(Likely phase: 5B)_
- 2026-10-27 — Tracker dashboard: choose the period of the history charts (4/12/26 weeks) and add "% correct per lesson" _(Likely phase: 5B)_
- 2026-10-27 — Study streak and heatmap by the "Day starts at" setting instead of midnight _(Likely phase: Polish)_
- 2026-10-27 — Tooltips with pictures (the `image` slot exists in `helpRegistry.ts`) _(Likely phase: After 5A-6b)_
- 2026-10-27 — Cards due by Lesson bar chart is flat when nothing is due; suggest a better starter chart (e.g. lessons by Confidence) _(Likely phase: Polish)_
- 2026-10-27 — Card levels cell: click a level to open that lesson's cards of that level _(Likely phase: 5A-7 or later)_
- 2026-10-27 — Rename card levels so they differ from lesson statuses (e.g. New · Shaky · Good · Strong), if the shared names confuse _(Likely phase: Owner decides)_
- 2026-10-27 — Flaky e2e (pass on rerun): Tags screenshots (a different one each run, tag picker finds 2 options), lesson Night screenshot (slow start) _(Likely phase: Testing)_
- 2026-10-27 — Sidebar that slides away on phones, so pages are not squeezed _(Likely phase: Done (Phase 6, 2026-10-28))_
- 2026-10-27 — Add the review-history charts to dashboards that were already changed (upgrade) _(Likely phase: Polish)_
- 2026-10-27 — Own Revise labels (add, rename, colour) in Settings; mark whole lines from the ⠿ menu _(Likely phase: Done (Phase 6 step 7, 2026-10-28))_
- 2026-10-27 — Notebook files that also carry journal days, templates and tag colours; a whole-workspace file _(Likely phase: Journal, templates, colours done (2026-10-28); whole-workspace file: Phase 6)_
- 2026-10-27 — Import: ask for the date order (day-first / month-first) and merge into existing rows by a key column _(Likely phase: Polish)_
- 2026-10-27 — Local image upload for Gallery tiles and notes _(Likely phase: Phase 6)_
- 2026-10-28 — Spanish texts are AI-translated: needs native review of key screens before real users rely on them (Hindi: owner checks it) _(Likely phase: Phase 6 end, then owner / native speaker)_
- 2026-10-28 — Sync, accounts and hosting (moved out of Phase 6 by the owner; health-data privacy review and clock skew go with it) _(Likely phase: 7)_
- 2026-10-28 — Browser back/forward and a URL per screen (pages, tabs, Revise sheet, Backup & files, databases and views); refresh keeps the screen _(Likely phase: Done (Phase 6 step 1, 2026-10-28))_
- 2026-10-28 — Flaky e2e: links "Esc leaves [[ as text" failed once in a full run (fixed 100 ms wait), passed on rerun _(Likely phase: Testing)_
- 2026-10-28 — Speed on very large pages: `syncCardRecords` took ~13 s for 10,000 notes and deleting blocks ~4 ms each in the test database; measure in real Chrome and make both incremental if slow _(Likely phase: Polish / Phase 6 end checks)_
- 2026-10-28 — Flaky e2e: blanks "Ctrl+Z undoes Make blank" failed once in a full run, passed alone _(Likely phase: Testing)_
- 2026-10-28 — History: drawn preview (pictures, tables), compare with current page, name/pin a copy _(Likely phase: After Phase 6)_
- 2026-10-28 — Translate dates (month names) per app language; create starter templates and the sample notebook in the chosen language; Hindi editor menus (BlockNote has none: contribute or write our own dictionary) _(Likely phase: After Phase 6)_
- 2026-10-28 — Native-speaker review of Spanish (and Hindi) texts, key screens: sidebar, Settings, Review, Backup & files, notebook screen _(Likely phase: Phase 6 end / owner)_
- 2026-10-28 — Clean up unused pictures (not referenced by any note or cell) and show how much space pictures use _(Likely phase: Polish)_
- 2026-10-28 — Pictures in Gallery tiles: upload from the tile itself; pictures in the sample notebook without internet _(Likely phase: Polish)_
- 2026-10-28 — **Phase 7 plan (owner, not built yet; when Phase 7 starts, ask the owner questions one by one with options + a recommendation).** (1) Page "⋯" menu, top-right, Notion-style: replaces the top-bar buttons; hover shows "More options"; items Review, History, Save as template, Restore backup, Import, Export; Import and Export greyed out with "Coming soon"; shortcut Alt+R opens Review, shown in the menu (like Alt+T for Today), also working on Mac; fully keyboard-usable (arrows, Enter, Esc); tap targets big enough for iPad; translated to Hindi and Spanish. (2) Three tabs Summary · Notes · Review (Summary = short key points, Notes = full notes, Review = spaced-repetition cards) at page level and notebook level. (3) Three connected levels: Page (own Summary/Notes/Review); Notebook (same tabs, everything from its pages); whole app (All cards, Review, Databases show everything, filterable by notebook). Each note and card is stored once; every level is a view, so nothing is copied or out of sync. (4) Filling the Summary: type in it directly, or select a line in Notes → "Add to Summary" (stays linked; editing the note updates the Summary). (5) New page start: opens blank and ready to type; below the cursor a template list with "Study (Recommended)" first, then the other templates; the list disappears once typing starts; setting "Always start new pages as Study". (6) Math formulas: fractions, Greek letters, symbols (e.g. statistics formulas).
- 2026-10-28 — Later, not Phase 7: AI that auto-organises notes (parked because of internet, cost and privacy)
- 2026-10-28 — **Build after the Phase 6 checks (owner, from check 3):** Password box: on a wrong password show a red border and a bold red message with a warning icon under the box ("Wrong password. Try again."), clear the box and put the cursor back in it; add an eye icon to show/hide the password; add a "Forgot password?" link explaining the password can't be recovered. Backup & files: "Save everything" and "Restore backup" as two equal buttons at the top; add "Restore backup" to the planned page "⋯" menu; rename backup import to "Restore backup" (so it isn't confused with the future "Import file"); when saving a backup show "This file only opens in Learning Notes. Use Restore backup to open it."
- 2026-10-28 — Testing on a real phone: on iPhone Safari the certificate warning of the dev server (self-signed HTTPS) sometimes has no "visit this website" link, so the app can't be opened. Find an easier way to test on a real phone (e.g. a trusted local certificate, a tunnel, or later the hosted/installable app). Likely phase: before Phase 7 phone work
- 2026-10-28 — **Build after the Phase 6 checks (owner, from check 6):** replace every plain "Choose File" button with a clear, labelled button. In the Anki section show "Import from Anki" and "Save for Anki" side by side, with a short hint like "Pick an .apkg file". Translate into Hindi and Spanish.
- 2026-10-28 — **Build after the Phase 6 checks (owner, from check 7):** (1) Translate the date next to "Today" ("Wed 28 Oct"). (2) Translate the app-made sample notebook and its page names ("Sample notebook", "Heart sounds", "Lung volumes"), for display only; never translate names the user typed. (3) Bug: Anki sub-decks show as "Share::Tables (1)"; show "::" as nesting, like "Share › Tables". (4) Hindi wording, more everyday: उपकरण → डिवाइस, समीक्षा → रिवीज़न, स्वतः → अपने-आप, प्रतिदिन → रोज़.
- 2026-10-28 — CSV import: "skip duplicates" option (match rows already in the database) — after the Add / Replace / New database choice exists
- 2026-10-28 — Menus: let the user pin, reorder and hide menu items (not "customise everything"). Likely Phase 7
- 2026-10-28 — Calendar (Phase 7 plan): Day / Week / Month switch; Day = a full-page card with swipe left/right for previous/next day; same features on every device; open on the view the user used last. Year view parked
- 2026-11-01 — Small tidy-ups found while writing specs: CSV size check compares bytes with a character limit; a test title says "Table and Dashboard views" but three views are made _(Likely phase: Polish)_
- 2026-11-01 — Star a page with a Favourites list in the sidebar, and a Share button (Share needs collaboration, which is a "no" for now). Owner saw both in Notion and chose to keep them for later _(Likely phase: After Phase 10)_
- 2026-11-02 — Pictures in recall cards (question and answer), stored the same way as note pictures _(Likely phase: After Phase 10 sync; pictures go to Google Drive there)_
- 2026-11-02 — Video in recall cards: links or embeds, not uploaded files, because video would fill free storage _(Likely phase: After pictures in cards)_
- 2026-11-02 — Mind maps in cards or as their own block (owner wrote "mind app"; meaning to confirm when planned) _(Likely phase: To plan)_
- 2026-11-03 — Owner brainstorm, guiding principles: everything is a block; Pencil-first comfort; handwriting is a block type; one shared core with switchable feature modules in one familiar frame _(Likely phase: Shapes every batch; see ROADMAP Phase 9 batches)_
- 2026-11-03 — Full hands-free voice use of the whole app, including voice navigation offline _(Likely phase: Later; offline control relies on the iPad's Voice Control for now)_
- 2026-11-03 — Premium AI voice plugged into the voice interface _(Likely phase: After AI cost approval)_
- 2026-11-03 — AI agents that write notes, mind maps and whole notebooks from speech or writing; handwritten-style output _(Likely phase: 14)_
- 2026-11-03 — Reader extras: summarise, bullet points and diagrams from highlights _(Likely phase: 14)_
- 2026-11-03 — Kindle, Apple Books, Google Play Books, Audible connections _(Likely phase: Parked)_
- 2026-11-03 — Restore that streams straight into the database, so a very big file needs no full copy in memory _(Likely phase: before sync)_
- 2026-11-03 — Replace from older zip files through the upgrade steps (temp database at the old version); build with database version 13 _(Likely phase: next database change)_
- 2026-11-05 — Reading: "Story so far" and "Ask this book" (Kindle-style recaps and questions about a page or notebook) _(Likely phase: 14, AI, after the owner approves the cost)_
- 2026-11-05 — Reading: daily highlight resurfacing and a highlights review (Readwise-style): show a few old highlights each day, link back to the page _(Likely phase: 13)_
- 2026-11-05 — Reading: nicer voices (HD or offline neural voices), voice from a photo of a page (Speechify-style OCR), reading goals and a streak that syncs between devices _(Likely phase: 13–14)_
- 2026-11-05 — Reading: an offline dictionary and translation of a tapped word (today Look up opens Wiktionary for that word) _(Likely phase: 13)_
- 2026-11-05 — Lock: real encryption of locked items (needs the Phase 10 key design: spare key, passphrase, new-device flow) and a recovery code for the privacy lock _(Likely phase: 10)_
- 2026-11-06 — Decks: keep the search words of a saved search as a fifth deck filter, and a Books collection row in the deck Where step _(Likely phase: C1/E2)_
- 2026-11-06 — Fonts: variable fonts and more weights (500/600) if the nine-font set needs them; a font picker for ink labels _(Likely phase: G3/O)_
- 2026-11-06 — Reader: swap the margin ribbon CSS for a ProseMirror decoration when bookmarks move to annotations; show suspended single cards in the Paused list _(Likely phase: C1)_
- 2026-11-07 — Maths: inline formulas inside a line of text, a ribbon Insert button for Formula, a true type-in-the-picture editor (MathLive) if the palette feels slow, formula to picture for PDF export, chemistry (mhchem) _(Likely phase: O)_
- 2026-11-07 — Calendar: Year view (parked by the owner), a sliding animation when the Day card changes, Day on the database Calendar view _(Likely phase: O)_
- 2026-11-07 — Sync live updates via Supabase Realtime (about 1 s instead of the 10 s poll), later; owner-approved idea _(Likely phase: Q)_
- 2026-11-07 — Pencil: a screen double-tap while drawing could switch to typing mode. Not built on purpose: the owner is designing a "write-into-text pad", which may change it _(Likely phase: after that design)_
- **AI learning companion** (Phase P, later work): a tutor that quizzes from your notes and cards, with the same caps and per-notebook switches.
- **Local MCP server** (Phase P, later work): lets a desktop AI app read and write notebooks on this device, with the Permissions screen as the gate.

- **Wispr Flow (owner, 9 Nov):** use Wispr Flow for talking notes. It types into any text box itself, so it already works in our pages; it has no public API to plug into our mic. Free tier is word-limited per week; Pro is paid. Revisit if they publish an API.

- **NotebookLM-style studio (owner, 9 Nov):** per notebook, turn your sources into outputs as new skills: Ask this notebook with citations, study guide/report, quiz, data table, flashcards and mind map (mostly exist via skills), slide deck (own viewer + .pptx export), infographic (AI fills an SVG template), audio overview (two-voice script + free device voices, or paid TTS with cost shown), video overview (slides + narration recorded in the browser). Google Flow-style video generation is paid per clip; only on owner approval. To discuss and order before building.

- **Claude connector (MCP) (owner, 9 Nov):** Claude writes into notebooks directly instead of the user copying a result. Needs a server, sign-in and an end-to-end-encryption design; plan as its own phase. Until then the free Claude Skill (features/claude-skill.md) makes the import format. _(Likely phase: its own, after Sync)_

- **Make notes from a PDF page/selection (owner likes it, later, 9 Nov):** in the PDF reader, rebuild headings, lists and tables from pdf.js text positions and font sizes into a page (no AI). Also PDF-copied plain text cleanup (join wrapped lines, bullets, page footers, aligned columns to a Table) for pastes that carry no structure.

- **Named AI assistant in the tool bar (owner, 9 Nov):** a Copilot-style AI button/panel in the tool bar and everywhere (selection, page, notebook, reader), with its own name and personality. Discuss before building.

- **Scroll bar: a more premium look (owner, 14 Nov, Phase 1 first look):** the shared scroll bar from task 0.5 works really well (no problem with how it behaves), but its look feels out of step with the rest of the app's design. Make it calmer and more premium, matching the app's style. Owner: not now ("I am only looking for a working app right now"); discuss with the other first-look notes at the end. _(Likely phase: 1 polish, or the release-bar polish)_

- **iPad keyboard opens only in floating mode (owner, 14 Nov, Phase 1 first look):** on the owner's iPad the on-screen keyboard always opens as the small floating keyboard; there is no way to get the full-width keyboard, even in touch mode. Owner: park it, no fix now; the owner writes with the Apple Pencil, not the keyboard, and builds the app for their own use first. Check later whether the app causes it (for example a page or text-box setting) or whether it is the iPad's own keyboard setting. _(Likely phase: 2B text box and Pencil, or later)_

- **Scroll bar fades when idle (P1.4 builder, 14 Nov):** Apple-style: the bar fades out after a moment without scrolling and comes back on scroll or touch near the edge. Not built; weigh against the owner's wish to see where they are (F3). _(Likely phase: polish, ask the owner)_

- **Tap beside a box = a new box side by side (owner, 14 Nov, Phase 2B planning):** today and in Phase 2B a tap makes the new box under the first, and you drag it beside to make columns. Idea: a tap on the empty paper right beside a box, at the same height, makes the new box next to it at once. Not built: the owner chose the simple rule first. _(Likely phase: after the Phase 2B first look, ask the owner)_

- **From P1.5 (Fable, 15 Nov night):** guard a palm resting on the page's scroll bar while writing; move the ~30 e2e specs still using made-up pen events to `e2e/realPen.ts`; a gentle glide after a Pencil scroll.

## Settings, later (owner, 15 Nov 2026)

- Saved setups (named layouts like "Pencil notes" and "Study", switch with one tap): later, after the basic Settings is final and tested on the iPad. Too much testing for now.
- Share or back up a setup as a file, with a tick list on import that merges: later.
- Settings file for experts: later; maybe a read-only "copy my settings" first.
- App suggestions ("add the Highlighter to the tool bar?"): later, only as quiet suggestions the user accepts; the app never moves things by itself.
- **Your layouts (up to 3 tool bars), owner 15 Nov:** later. For now everyone has one fully changeable tool bar. Once the Settings v5 / tool bar work passes the owner's test, discuss and add the 3 layouts, with create, edit, rename, delete and remove. Comes together with saved setups.

- **Toast close ✕ (owner, 16 Nov, I1):** small ✕ on every notice with Undo, on the opposite side from Undo; drawn small, still easy to hit with the Pencil. Owner chose A (16 Nov): looks small, finger-size tap area, premium, by the design rules.
- 15 Nov (reviewer, red1): a small e2e for the docked side list with a narrowed tool bar ("More options (N)" label; one scroll bar per edge). No test covers it today.

- **Page options: add any action (owner, 16 Nov):** in Page options › Arrange pinned actions, a "+ Add" like the tool bar's + favourite, so the user can pin any action and customise the row fully. Later; parked for tokens.

- **Mic in the text box (owner, 16 Nov):** a mic option in the text box with a choice: "Type my words" (speech to text) or "Record audio" (keeps the recording). Needs a picture first. Voice is faster than typing.

- **Full "knowledge pack" from any video or page (owner, 16 Nov):** owner wrote a 15-part prompt (overview, notes, quick notes, cards, mind maps, pictures, tables, highlights, sticky notes, code, uses, links, glossary, quiz, explore next) with a zip of JSON files. Today the app reads only ln-notes/1 Markdown and ln-skill/1 JSON, so the zip as written would not import. Parts with no home yet: sticky notes, quiz (beyond cards), a separate glossary, Mermaid diagrams. Discuss after the owner's answers; needs a picture and a plan before any build.
- **Auto-tags on import (owner, 16 Nov):** the YouTube preset asks Gemini for a "## Tags" line (#word #word); today Paste notes keeps it as text, so the owner tags the page by hand. Later: Paste notes turns that line into real page tags, so the video library sorts by tag with no taps. Small; needs a plan line.
- **Connector gaps found in "ai TEST 1a" (owner, 16 Nov):** the connector cannot: make a mind map block, set page tags, add pictures/screenshots, create a database or rows, switch on page tabs (Mind map, Slides, Audio & video, Database), add clickable video timestamps (needs the link), make hover previews of linked pages. Owner's target shape: notebook → database of pages (one per video) sortable by tags, with formulas; each page uses tabs Notes · Summary · Mind map · Slides · Audio & video · Review. Also: shorter paragraphs; timestamps only on key moments. Needs a picture and a plan before any build.
- **Page-aware notes (owner, 16 Nov):** notes must fit the paper page: the connector should know the page size, keep each section (with its pictures) on one page, split long lists (e.g. "8 rules" → 2 pages of 4 with visuals), and push a block that doesn't fit to the next page. More icons and visuals in the body, not only in headings. Research: YouTube transcript connectors (TranscriptAPI, BulkTranscripts, youtube-transcript.ai) and remio for screenshots; check cost/privacy before use.
- **Start questionnaire (owner, 16 Nov):** before making notes, Claude asks a few quick questions (goal, level, depth, focus, layout, cards) to get clarity. Draft questions in chat 16 Nov; needs owner picks, then a picture.
- **Connector must reach the app's full block set (owner, 16 Nov):** the app already has toggles, text colours, pictures, mind map blocks, databases, tags and page tabs; the connector cannot write them yet. Add them to the connector (and the same shared action list for in-app AI and API keys). Until then, keep every Gemini answer and its frames folder (docs/recipes/gemini-youtube-prompt-v3.md markers) so each test notebook can be rebuilt in full later.

- **Circle in the Text tool = Lasso (owner, 19 Nov 2026).** The Lasso tool selects words and lines perfectly on the iPad. Idea: a Pencil circle in the Text tool acts like the Lasso (same selection, same bar), and one more tap on the selection puts the typing cursor there to delete / write over. Why it may work: the Lasso does not fight Scribble. Open question: telling a "circle to select" from handwriting in the Text tool. For the Pencil-select plan with Fable (from 20 Nov), using the circle recorder's traces.
  - Owner check (19 Nov): Lasso a word, then tap on it: the selection goes and no typing cursor comes. Owner's wider idea: give ALL Pencil selection in the Text tool (circle, double tap, triple tap) the Lasso's behaviour, i.e. our own selection that Apple's bar and Scribble cannot take over, and one tap on the selection = typing cursor there (to delete / write over). Main question for the Fable plan.

- **Clean up with AI in Paste ▾ › More (owner, 19 Nov 2026):** hidden for now; add back once AI is approved.

- **For Fable (owner, 19 Nov 2026): the Goodnotes approach.** A tap on text could switch to the Lasso by default, so all the Lasso's selection features work on text; the Lasso itself does not type, so a further tap returns to the Text tool with the cursor. Discuss with the owner and Fable before building. Evidence: docs/archive/plans/pencil-select-plan.md (traces), refs/goodnotes-lasso-text-*.png.

- **Box ⋯ where people tap (Opus, 20 Nov 2026):** when the page tabs are close above the first box, its tab and ⋯ sit under the box at the right (Polish 2B); a tap there to make a new box opens the menu instead. Ask the owner whether to move it.

- **From the Goodnotes screenshots (Fable, 20 Nov 2026; owner to say if any is a must now):** (1) resize and turn a text box together with the ink on it, as one piece (needs box turning, parked with layers); (2) Front / Back for overlapping things (needs layers); (3) "Create Element": save a selection as a reusable sticker.

- **Try GitHub Spec Kit in the next planning phase (owner, 21 Nov 2026):** our METHOD.md already borrows its idea (spec, then plan, then tasks; tests named after spec lines), but not the tool (`specify` command, `.specify` templates). Look at it with Fable when planning the next phase; adopt only what our own format lacks. Link: https://github.com/github/spec-kit

- **Notion as a read-only window on the project (owner, 21 Nov 2026):** the owner is often away from the PC and cannot look up B0, C0 etc. Wanted in Notion: (1) the plan and the specs (spec-based development), (2) the bugs and checks as a database with views (by state, by part, by check), (3) visual study notes like the app makes, readable in Notion (Notion has databases, toggles, pictures; no Pencil). The repo stays the source of truth; Notion is a mirror, nothing changes in how we work. First step: reconnect Notion (tools did not load in the 20 Nov chat; a new chat should load them), then owner answers the questions of 21 Nov.
  - **Owner answers (21 Nov):** (1) update Notion only when the owner says so (cost); at that time Claude may ask what to update; (2) Notion is the owner's own copy and the owner writes in it too; Claude never reads it back as instructions or as the source; (3) bug row: plain name, what was seen, state, part, date, screenshot link; (4) visual notes = visually rich, interactive study notes (symbols, infographics, toggles) that are easy to understand at a glance; (5) style: like good biology / medical notes made in Goodnotes and OneNote; build a similar template in Notion. Check every cost with the owner first.
  - **Owner answers 2 (21 Nov):** order: (1) the method first: spec-based development, testing, the owner's philosophy and guidelines; (2) then the bugs; (3) then the ongoing work. Visual notes are about THIS project (the owner's field); biology notes are only a style reference to look up. Chapter by chapter, small pieces, to keep cost low. Pictures: Claude draws its own diagrams and icons; for a great web image, share the link as a reference (the owner adds it) or draw an own version of the idea (not a copy). Adobe is connected on the account: may be used to make pictures after a cost check with the owner.
