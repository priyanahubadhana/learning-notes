# Owner decisions and approved designs (reference)

Moved word for word from the old pending list on 14 Nov 2026. This is what the owner decided, approved and reported: text box decisions, the bug register, the toolbar and settings decisions, the reader plans and every APPROVED mock-up with its conditions. It is reference for planning and building. Open work is tracked by phase in [../PENDING.md](../PENDING.md) and [../plans/phase-plan.md](../plans/phase-plan.md); lines here that say "waiting" or "next" are history.

## Priority 1: text box (built 11 Nov, waiting for the owner iPad checks)

Detail: plans/owner-bug-batch-3-2026-11-11.md (B3) and plans/owner-ideas-batch-2-2026-11-10.md item 4.

## Priority 2: live, waiting for the owner test

- Double-tap no longer erases a word (600 ms grace) and sign-in is kept; see owner-checks-pending.md. Delete this line after the owner checks it.

## Priority 1 leftovers (text box)

- Owner checks for the whole text box v2 list (steps 1 to 7, 12 Nov) are at the top of plans/owner-checks-pending.md. Not built from that list: the glide into place after a drop, minimum width = longest word, rotation, a box wrapping ahead of a neighbour at the same height (see Questions).

- [ ] Minimum width = longest word (now the column minimum).
- [ ] Leftover worktree folders the owner can delete: ln-textbox, ln-textbox-base, ln-auth.

## Text box v2 (owner, 11 Nov 7:32; references Notability + GoodNotes)

- [ ] Rotation is new (text box rotate). Layer order (forward/back) ties into the parked layers idea.

- [ ] Owner 11 Nov 7:40 decisions for Text box v2 (polish the existing box only, no new features):
  - Grab handle: bigger and clearer, Notability-style ≡ tab on top of the box.
  - Drag is exclusive: while a box is dragged nothing else in the app reacts (no taps, toolbars, new boxes, menus) until it is dropped. Owner asked about a ✓ confirm after the drop (see question).
  - Dropped from the list: layers, front/back, hide/show, recall card from a box, send to Summary, handwriting into a box, fold a box.

  - Selected box border clear by default like GoodNotes/Notability: a solid 1.5 px accent line with clear corner dots, visible on dark and light paper (ours is too faint). Line highlight/selection is fine, leave it.

## Priority 4: other bugs

- Built 11 Nov, waiting for the owner iPad checks (top of plans/owner-checks-pending.md). Delete this line after the owner checks them.
- BUG (14 Nov, seen in scroll-fix pictures rotation-1..4, iPad landscape, Professional): two writing hints overlap on the page, "Tap here to keep writing" over "Type, or tap anywhere…". Show one hint at a time. Owner: text box v2 slice (with a test).
- Scroll-fix follow-ups (small, not blocking): (1) a Card or CommandList gets 20 px narrower once it starts to scroll (the bar's gutter appears), keep the width steady; (2) the scroll bar over a pop-up card has no e2e test yet, add one; (3) touch-size pictures are shot on chromium with touch, because WebKit on Windows draws no blur, so check the blur on the real iPad; (4) the phone has no page bar, on purpose (PaperFrame hides it on narrow screens), confirm with the owner at re-test.

## Text tool + Pencil (built 12 Nov, waiting for the owner iPad check)

Safer shape detection, Undo fix (one press = one step with several boxes), Sticky/Callout/own presets and last style were already in. Check list: top of plans/owner-checks-pending.md. Not verifiable here: real Scribble on the iPad.

## Owner tests waiting

See plans/owner-checks-pending.md (top) and the 7-item list from 10 Nov: grid, hold menu, Pencil taps, clash bar, Layout Assist, Text tool, ribbon and History.

## After Friday (ideas, not bugs)

plans/owner-ideas-batch-2-2026-11-10.md: update bar, customizable bars, layers, shrink a box to scale its text. Also: book annotations, Views, snapshot Lasso. Fri 13 Nov: review the HANDOFF carry-overs.

## Housekeeping

- Empty worktree folders the owner can delete by hand: ln-l, ln-base2, ln-ci2, ln-g, ln-g2, ln-a, ln-base, dist-rb.

- CI fix pushed 11 Nov for Text box v2 (deploy pending green CI); check the deploy ran, then delete this line.

## Owner answers 11 Nov (top priority: text box, typing, Pencil)

- BUG: the cursor lands in the wrong place or jumps.
- BUG: a Pencil double-tap to select doesn't work at all in a text box (the owner expects a paragraph selection; confirm word vs paragraph).
- BUG: too many highlights. Tapping a line draws a border or highlight around that single line or block. Instead only the WHOLE box shows as selected (GoodNotes): no per-line or per-block outline inside a box.
- Progress: a short note per live part, with a 2–3 line test.

## Questions for owner

- Two taps at the same height: the second box goes just UNDER the first (every free box is its own row; others slide down). Do you want boxes side by side at the same height from a tap? That needs a different layout model (overlap checks per box). Safest option taken: stacked.

## Owner bug register (PDF, 11 Nov): plan first, questions pending

- BUG-001: turning a block into a checklist shows "Not saved yet" (src/i18n/en.ts:1282 save-failed bar). "Try again" does nothing, and typing feels laggy. NOT fixed yet (string still live; needs a repro).
- BUG-002: the floating format toolbar extends or moves beyond its bounds. Keep it at its size and position.
- BUG-003: toolbar turned off in Settings. After "Show" plus using a tool it should auto-hide again, with a very visible "Show toolbar" control.
- BUG-004: replace the black "Updating…" overlay (update.splash) with one full-screen MANDATORY update flow:
  - a short countdown, then auto download;
  - the download can be cancelled, but the app stays blocked until it updates;
  - progress, then a full-screen "installing" state with interactions blocked;
  - restore with all data kept;
  - handle failures and interruptions.
- BUG-006 (owner, 13 Nov, iPad Safari portrait, preview): the ⚙ Settings gear at the bottom of the left strip is not reachable; the strip does not scroll and the gear falls off screen (keyboard and format bar open). **Must be fixed before the live release**, also for the installed app: pin the gear inside the visible area or let the strip scroll; test on a short iPad Safari viewport. Screenshot: owner upload 13 Nov 20:29.
- BUG-005: settings need visual previews (e.g. toolbar on/off) plus a guided walkthrough highlighting Compact view, Ribbon and Toolbar.
- Standing instruction: ask until fully understood; no assumptions.
- OWNER answers for the register:
  - BUG-004: forced only when needed (storage change or data fix); other updates stay optional with the pill. 5 s countdown.
  - BUG-003: the bar hides when you start writing or typing; a small "Show toolbar" pill stays at the top edge.
  - BUG-005: the walkthrough shows on first launch, with replay in Help and Settings.
  - Still need: the BUG-001/002/003 screenshots resent as images (the PDF images couldn't be read).
- BUG-005 plan addition (owner, do NOT build yet): on first launch a small pop-up asks "New to the app / Used it a little / Experienced".
  - New → the full guided walkthrough, a few steps at a time (never too much at once).
  - Used a little / Experienced → no walkthrough (maybe a "Replay tour" in Help).

- Settle animation after a drop (the dropped box glides into place) is NOT built yet.

- Circled number / shape Undo: one Undo may also take back the typing of the same box if it was just before (page history groups text steps). Handwriting to text rests on iPadOS Scribble, not verified on the iPad.

## Lane C: toolbar + settings redesign (planning; nothing built until the mock-up is approved)

- Owner 11 Nov:
  - default = hybrid (minimal, with show-all on demand);
  - the confusion is the toolbar, Ribbon and Compact view (Pencil-writes-text and device mode are fine);
  - wants it organised like GoodNotes;
  - saved layouts: built-in "Beginner" and "Professional speed", plus several (up to 3) user layouts that save the whole toolbar arrangement and its preferences.
- Step 1 (running): Fable maps every toolbar surface and setting from the code and proposes the organisation. Then an artifact map for the owner to mark, then a tappable mock-up.
- Step 1 done: map in docs/plans/toolbar-map-2026-11-11.md (Fable). Decision page for the owner: https://claude.ai/artifact/Xquz4AAJC2vssFFa5dGRxX (13 changes + 8 questions). Waiting for the owner's pasted choices, then the tappable mock-up.
- OWNER answers (11 Nov):
  1. Ribbon/All tools hidden in Beginner, available in Professional only.
  2. Compact view merges into the layouts (Beginner = compact); no separate setting.
  3. Switch layouts in BOTH Settings and the toolbar ⋯.
  4. Own layouts: yes (sync, each device picks its active one; assumed, confirm).
  5. NO names under icons in Beginner; icons only, names on hover or long-press.
- OWNER decision page (11 Nov):
  - Changes agreed: C1–C8, C10, C12, C13. C9 (one Keyboard button, hold for Pencil keys) and C11 (picture/table "More" expands in place) left blank.
  - Q1 fixed strip under the bar. Q2 keep the micro bar separate (conflicts with C8 "one Selection bar"; ask). Q3 Read moves under ⋯ as "Reading mode". Q4 no names in Beginner. Q5 Professional = toolbar + one slim All-tools row. Q6 switch everyone to Beginner. Q7 switch layouts in Settings + ⋯. Q8 layouts sync, each device picks its active one.
- OWNER notes (11 Nov, more coming):
  - Pen = one tool with pen types inside (Apple Notes style): pen, pencil, marker, highlighter… Highlighter moves inside Pen (no separate button).
  - Backspace stays on the Beginner/simple bar, next to New line.
- OWNER artifact comments (11 Nov, discuss at the end):
  - Layout model: built-ins Beginner and Professional (each customisable), plus 3 optional own layouts.
  - Per-device copies: customising a layout on a device creates that device's copy (unlimited device copies, e.g. iPhone/PC/iPad versions of Professional).
  - Layouts can be renamed. "New layout" starts from Blank, Beginner or Professional.
  - The owner wants C9 (one Keyboard button) and C11 (picture "More") explained.
- OWNER FINAL toolbar (11 Nov discussion):
  - C9: the problem is that several keyboard buttons/bars appear by themselves whenever you type or tap. Show only ONE (ours) and stop our extra keyboard bars popping up on their own. The iPadOS system shortcut bar can't be removed from a web app (explain).
  - C11: bug fix (picture "More" expands in place).
  - C8/Q2: (a) merge 3 bars into one Selection bar, keep the micro bar.
  - Layouts: as understood (built-in Beginner/Professional, customisable; per-device copies; 3 own layouts from Blank/Beginner/Professional; rename). Own layouts get device copies too. Every layout has "Reset to original", plus a "Reset all layouts" in Settings. A new device copies the closest device type's version.
- OWNER OK: a "Keyboard stays hidden" toggle (toolbar icon + Settings, saved per layout). While on, our keyboard/mini/micro bars never auto-pop and the iPad keyboard stays down (inputmode none) until the Keyboard button is tapped. Check on the iPad that Scribble still works while it's on. Next: the tappable mock-up.
- OWNER OK (11 Nov): an Opus quality review (strict Apple-style) after each feature passes CI, before the owner's iPad test. Toyota-style reliability as a working standard (rule text proposed to the owner).
- Mock-up (https://claude.ai/artifact/6urqSfFnkCVsvLynEUL54N) owner decisions:
  - the real system keyboard (no mock keys);
  - distinct Pen/Pencil/Marker/Highlighter icons;
  - the All tools row fixed in place, one line with sideways scroll; tools show only after a tab tap and tuck away after use; tabs with icon + label;
  - the full Lasso: text + ink, loose catch, Cut/Copy/Paste/Duplicate/Colour/Resize/Delete/Convert/Screenshot;
  - the Text tool pill is BOX-first (styles, border, fill, corners, padding, layout), with text formatting in one "Aa";
  - "Last tool" becomes "Back to <tool>" showing the target tool's icon, Professional only.
- OWNER: the eraser. Beginner keeps the simple eraser; Professional brings back the app's CURRENT eraser (its options + size preview, which the owner likes), best of both. The owner will share a reference. Mock pen tray redesigned (Fable, Apple-style matched set).
- OWNER rule (11 Nov): every change must be applied everywhere the thing is used (toolbar, All tools, menus, pills, settings), so nothing is left half-updated. Real-app check: the tool icons are picked by name, so add a missing-icon fallback + warning and a test that every registered tool's icon exists.
- Mock: Professional eraser + Lasso ported from the real app and merged with the new ones (in progress).
- OWNER (11 Nov): Beginner = few, simple options (keep as is). Professional = ALL existing features kept (nothing lost), each purpose-driven: grouped by task, shown in context, advanced behind ▾. Complexity only where it serves a clear purpose.
- OWNER design north star: like Apple, deep capability that feels effortless. Smart defaults, progressive disclosure, consistent patterns across iPad/PC/phone, no setting needed to get started.

## Audits 11 Nov (read-only, waiting for owner choices)

- Open items planner: https://claude.ai/artifact/Dx2mjXxwovbm3PjtGESgDr
- Security (Opus spot-check): no Critical/High. Medium:
  - the lock is a privacy screen only (PIN brute-forceable offline): add attempt delays and a longer password;
  - the session is in localStorage: refresh-token rotation, clear the PKCE verifier;
  - the drive-token function allows any CORS origin: restrict it;
  - confirm the OTP rate limits in the Supabase dashboard;
  - remote images in imported notes leak IP: proxy or ask.
    Low: style-src unsafe-inline, HSTS includeSubDomains, pencil-test.html shipped, SW cache checks, npm audit, import paths not yet checked.
- Root causes of UI bugs (Opus):
  1. One editor per box, each adding global listeners (161 global listeners) → multi-Undo, save races, stray boxes, perf. Fix: one page-level event router.
  2. Competing Pencil/tap handlers settled by timers. Fix: inputMachine as the single gesture router.
  3. No single owner of selection/focus (window CustomEvents). Fix: one selection store.
  4. Five floating bars/toasts. Fix: one overlay manager (part of the toolbar redesign).
  5. WebKit can't be tested locally. Fix: WebKit as a required CI check / Docker.
  6. The 320 KB budget forces lazy workarounds. Fix: a critical-path budget + preload.
  7. Builders colliding. Fix: one branch per builder, a conflict-marker pre-commit check.
  8. Session renewal triggers. Fix: a single auth refresher (mostly done today).
  9. slowMoments writes per long task. Fix: throttle.
     Latent: duplicate save flushes on exit, a stale timer caretIn, a stale closure in the usePaperBoxes keydown, an unguarded window Delete handler, the listenerCount undercount, seeded RNG in driveServer tests.

## OWNER open-items choices (11 Nov)

- BUILD: Magnifier in reader; Book annotations; AI-off card; Prompts on note pages; Make notes from a PDF; Claude connector; Cost estimate; Default paper style; Settings previews & tour; Reduce glass check; Table rows across sheet gap; Database page filter; Search checkboxes & formulas; Custom Views; All/Starred/Recent tabs; Picture border/wrap/draw-on; Delete forever removes pictures; Labels & tape on pictures; Required-update marker; Shorten HANDOFF; CHANGELOG stray text; Old copies (3 unsaved files done 11 Nov); Undo gaps (47); Old flaky tests; Spanish & Hindi; First-download size; Replace emoji icons; Premium design 3–6.
- LATER: Shapes/ruler/tape in reader pen; Open sync to everyone; Per-notebook presets; Video timestamps beyond YouTube; Update bar at top.
- DROP: Update pill vs bar.
- Rule: anything that touches the UI being redesigned in the mock-up (toolbar, text box, Lasso, ink, layout, settings layout) waits until the owner signs off the mock-up. Everything else goes ahead under the Apple + Toyota + premium-design rules.
- OWNER answers (wave 2 questions): Q1 (a) the redesign-touching items (settings previews & tour, emoji icons, premium design 3–6, labels & tape on pictures, reader magnifier) WAIT and get added to the mock-up artifact to be designed there first. Q2 (a) a short Book annotations plan for approval, then build. Q3–Q10: waiting.
- Book annotations short plan ready (3 slices, 6 questions); waiting for owner approval. Summary in chat 11 Nov; detail in docs/plans/book-annotations-plan.md (existing) + this plan.
- OWNER answers (wave 2):
  - Q4 (a) Notes from a PDF with a cost estimate before each run. PLUS a full audit of every AI/cost setting so no two settings double-enable a paid feature or charge twice (severity: high).
  - Q5 (b) the Claude connector reads AND writes from the start.
  - Q6 unclear ("A. B."), ask.
  - Q9 handle the 3 unsaved files as I judge best, safely (no consequences).
  - Q10 reliability first, then features.
  - Book annotations Q1–6: waiting.
- Builder H done (11 Nov): DB page filter, search finds checkboxes/formulas, All/Starred/Recent, Delete forever erases pictures, picture Border, video start/size, slowMoments throttled, seeded driveServer tests, first load 319.9 → 301.8 KB. Waiting for the redesign: text wrap around pictures (src/paper) and Draw on picture (src/ink + tools).

## OWNER TO-DO (answer in one go later)

Questions:

1. Q6 Custom Views: (a) short plan first or (b) build straight away? (owner wrote "A. B.")
2. Book annotations Q1–6 (my picks used in the mock-up): scroll-only drawing; a phrase = 3 s; sticky notes yes; Beginner shows everything; user-named colours; sync strokes only.
3. Toyota-style rules into rules/building.md: yes/no?
4. Mock-up renames: keep "Pen"/"Sticky note" names (Fable is reviewing).
5. What was the rest of "And make…"?
   Tasks only the owner can do:

- ~~Supabase dashboard~~ DONE 12 Nov: Email OTP expiry 600 s (owner); rotation = Supabase default; rate limits default. (CAPTCHA later.)
- ~~Redeploy drive-token~~ DONE 12 Nov (owner).
- ~~Delete leftover folders~~ DONE 12 Nov (checked: plain build output, no links).
- iPad checks at the top of docs/plans/owner-checks-pending.md once the build is live.
- Review the mock-ups: toolbar v2/v3, book annotations.
- BUG-002 (format bar moves/extends beyond its bounds): no screenshot needed (owner, 12 Nov). The build adds an automatic test (bar stays inside the screen on iPad sizes) AND puts it in the owner's iPad test checklist.
- Claude connector plan: docs/plans/claude-connector-plan.md. Questions:
  - (1) write access ON from the start (the owner said read+write) vs off until allowed in Settings;
  - (2) the key in Windows Credential Manager;
  - (3) run from the local repo (not npm) at first;
  - (4) Claude edits existing text only via the Inbox, while appends and new pages go straight in;
  - (5) reads logged locally only;
  - (6) no delete ever.
    Note: PC only, not iPad. Slices 1–4 are built (docs/features/claude-connector.md); the Inbox, audit screen and rate limits (5–6) are next.

    Note: PC only, not iPad. Connector A slices 1–2 are built; connector B (online) slices 1–8 are built on main and not deployed (docs/features/claude-connector.md has the owner steps).
- OWNER (11 Nov): the Claude connector is the app's MAIN USP.
  - PRIMARY: from the Claude UI, Claude builds whole notebooks for the user using ALL app features (notes, summary, recall cards, databases, layouts, styles, books/highlights…), so the user gets the best notebook with ultimate customisation, then refines by chatting.
  - SECONDARY: refine AI mid-work inside the app (a Claude chat in the notebook).
  - Open decision: A local (PC, private) vs B online (claude.ai everywhere, opt-in server access) vs both. Recommended: both, with B as the main path for regular users.
- OWNER: connector = BOTH (B online main path, opt-in; A local for privacy). Quality standard written: docs/design/quality-standard.md (+ rules/building.md pointer), owner-approved.
- Connector B plan in docs/plans/claude-connector-plan.md. Questions: Supabase hosting? escrow 30-day expiry? Inbox thresholds? notebooks scope? B first? (picks: yes / yes / >30% or cards / default all / B first). Deploying needs the owner's OK.
- Toolbar mock v3 (Fable, the reorganised Professional): https://claude.ai/artifact/ (v3 link in chat). Questions for the owner:
  1. Pen/Ballpoint/Sticky note labels in Beginner too.
  2. "Callout" appears 3 times; rename the Box look to "Accent"?
  3. Layers in both Pen and Lasso, or Pen only?
  4. The layer chip on the Pen pill only with 2 layers.
  5. Lasso Move/Scale/Rotate on text: does "no rotate on boxes" cover it?
  6. Favourites in Pen ▾ Colour vs at the pill end.
  7. The Layout icon and the Professional ▾ chip open the same menu; "Show names" is still in Settings.
- Claude connector A (local, now with writes + device list) is built; setup and the SQL to run are in docs/plans/owner-checks-pending.md. Google setup needs the Supabase redirect http://127.0.0.1:53682/callback.
- Account gate open question: also freeze cards review, tasks, habits, database cells and ink while signed out? (now only pages/notebooks are frozen)
- Mock feedback (24 comments) in docs/plans/mock-feedback-2026-11-11.md. Building the final toolbar mock (T1–T14) and annotations v2 (A1, A3–A7). A2 (reader lock modes) needs research + owner questions.
- A2 reader lock: research + 5 questions in docs/plans/mock-feedback-2026-11-11.md (picks: 3 modes / Select with a tool / tap to unlock / per book / notes open read-only).

## Complete reader mode revamp (owner, 11 Nov night)

Three ways of using the reader, as presets:

1. **Read**: pure reading, nothing to disturb.
2. **Light study**: highlight, notes and basic tools.
3. **Deep study**: full knowledge capture.
   Highlights flow automatically into a notebook per book, and a cross-book Highlights database (10 books → one DB) has one-tap jump-to-context. The lock modes are part of the presets. Goal: a lifelong personal knowledge bank (Obsidian/researcher style).
   Next: deep research (Obsidian, Readwise, Zotero, LiquidText, MarginNote, Kindle, Apple Books, zettelkasten/PKM), then questions to the owner, then a "Complete reader mode" mock-up.

- Reader revamp plan: docs/plans/reader-revamp-plan.md. 10 owner questions (picks: Read preset uses Reading mode; Light study default; Deep study for everyone; virtual DB rows; Light-study highlights in the DB too; merge duplicates; keep cards marked 'source deleted'; renamable colour meanings; 5 Daily Highlights; Markdown+CSV now, Obsidian later). Mock-up being built with these picks.
- OWNER reader answers (11 Nov night):
  - Read preset keeps quick highlights; the Full/Frozen lock board stays separate.
  - A new book opens in the LAST used preset; the first-ever default is the full "editing" mode (Everything works), not Light study.
  - A full-screen option.
  - FIX the reader top bar always looking blurry.
  - Professional toolbar: a separate tab gathering audio + formats.
  - LIBRARY revamp: a knowledge database tab (all books + per book), notes filterable, highlights+notes in one place with a side preview, the knowledge bank alongside.
  - Deep-study extras: research and explain the best ideas with examples; complex ones go in Professional.
  - ORDER: Library first → then reading mode → then the study modes. Ask questions before each mock-up.
- Library questions (docs/plans/library-revamp-plan.md A5, 10 questions; picks marked there) + which deep-study ideas 1–5 go with the Library.
- REAL-BUILD requirement (owner): box resize/move handles must be easy with the Apple Pencil: ≥44 pt hit area, pointer capture, touch-action none, no switch to ink mid-drag, a small dead-zone, grow-on-grab feedback, live resize.
- REAL-BUILD fix (owner): the main bar's 'more tools' scroll arrow overlaps the last icon (Backspace). Give it its own slot at the right end, never over a tool.
- OWNER (11 Nov night): apply the toolbar mock-up approach to the OTHER areas too (Search, Home, Review/cards, Notebooks/sidebar, Settings), but NOT Reader/Library (in progress). Learned patterns are in docs/design/owner-ui-patterns.md. Mock-ups are being built per area.
- REAL-BUILD requirement (owner): resize handles pick the NEAREST handle, side vs corner zones don't overlap, and a short hold with feedback before the drag commits. The text box must never wrap letter by letter (one line until near the right margin).
- Home mock: published. Questions (picks): Beginner 4 cards; a Daily Highlight from saved highlights; Continue as a sideways row; glance widgets as counts only; Tasks/Plan/Routines/Reports as tabs.
- Notebooks mock: published. Questions (picks): Trash in the quiet corner + a More tab; a star only on pinned covers; add Duplicate/Reset look/Start on; tree grip in Professional only; Lock & Allow AI in a Privacy tab only.
- Search mock: published. Questions (picks): a side panel (not a popup); scope starts at Notebook; Beginner chips All/Pages/Notes/Cards; Books & Highlights shown as 'Soon'; keep Pencil scribble search; no save-search in Beginner.
- Review mock: published. Questions (picks): add reverse + true/false card types first; undo last rating yes; card editor inside Review yes; forecast chart yes; the Coverage tab is mock only.
- Settings mock: published. Questions (picks): the experience picker sets the view (New/Little → Beginner, Experienced → Professional); Pencil gets its own category; merge AI/Permissions/Connections/Claude; a 7-step tour; the scheduler visible in Beginner; small 'Pro' tags.
- Home dashboard plan: docs/plans/home-dashboard-plan.md, 11 questions (picks in bold there).
- REAL-BUILD requirement (owner): resize dots sit OUTSIDE the box; their hit area extends outward only, never over the text, so caret taps near the edge never grab a handle.
- REAL-BUILD requirement (owner): pressing a box's grip drops the typing cursor (blur + collapse the selection) and blocks typing until the move/menu ends.
- REAL-BUILD requirement (owner): cards/sheets are a layer — taps/scroll inside never reach the page; the first outside tap only closes the card (swallowed; pills/strips excepted); card controls keep the text selection; fields return focus to the previous caret.
- Shared app shell spec: docs/design/shell-spec.md (23 contradictions found between mocks; all mocks are being moved onto the shell). Rail icon picks: Library = books on a shelf, Notebooks = notebook + pencil, Review = flashcards + tick (B options in the mock). Shell decisions to confirm: the More sheet docks right at full height (full screen on phone); the phone tab bar is attached full width; breakpoints 640/1180.
- OWNER: Beginner toolbar also gets a small Shapes & drawing aids icon (simple card).
- REMIND OWNER: test the right-docked full-height More sheet on the iPad (real use) once built.
- PAUSED 12 Nov (owner at 93% of the limit): shell adoption for search/review/settings/annotations mocks (restart after the reset), the CI WebKit debug watcher (TEMP logging 84e0e9b still on main; read the [tapdbg]/[rddbg] logs, fix, then revert). Only planning continues.

## Review mock: owner note (12 Nov), apply only in the real build

- Search and Review mock-ups are approved ("okay to pass").
- Review › More: "Again comes back after…" row has image and text overlapping; fix the layout in the real app.
- BUG (iPad): the sidebar covers the reader bar's ✕ (Exit reading). Found by CI 12 Nov; fix in a real-build slice.
- Real build (reader): the reader bar and the drawing bar must minimise/restore independently (each edge handle restores only its own bar). Owner, 12 Nov.
- Real build (reader): Listen long-press = hold only (release must not also start read-aloud); no selection/callout on long-press. Owner, 12 Nov.

## Book annotations / Reader mock: APPROVED by owner (12 Nov 2026), build with these conditions

Mock: claude.ai/artifact/UQuji6cLjk9PNuuF9vsGEB (all owner comments on it are build requirements).

1. "Highlight where I land" switch: the jump/scroll glow is ON for new users and can be turned off (remembered).
2. The reader bar and the drawing bar minimise/restore independently.
3. Sticky note: tapping opens a READ view that looks like a real sticky note (paper colour, text, ✕, ✏️). Only ✏️ opens the edit dialog; a new note opens in edit.
4. Listen: tap = read aloud; hold = settings only (release must not start playback); no selection/callout on long-press.
5. Pages-grid edits change the real book (Undo + Restore original); no dimming behind the panel; Minimise hides the whole strip; edge-tap page turns with a slide; voices by type with pins; Style "Full" by default; ✕ on every dialog; customisable tabs Pages/Outline/Annotations/+.
6. The top-bar AI button needs a rework: do it together with the AI mode build (not in this mock).

- Real build (Home): widget drag uses live reflow preview; a wide widget dropped between small ones lands there (small ones wrap); impossible spots snap to nearest fit. Owner, 12 Nov.

## Home dashboard mock: APPROVED by owner (12 Nov 2026), build with these conditions

Mock: claude.ai/artifact/NqQG7z5SGyLv5YxnkArK9e (all owner comments on it are build requirements).

1. Remove the leftover top-bar Done button (the edit bar has its own Done/Cancel/Reset).
2. Drag uses a live reflow preview: other widgets slide out of the way while dragging (app-wide rule).
3. A wide widget dropped between small ones lands there (small ones wrap); impossible spots snap to the nearest fit.
4. Widget size S/M/L applies visibly (short animation, selected size shown); a widget can never vanish.
5. "Where this comes from" (was "Built from") opens a separate pop-up with ✕/Esc/tap-outside; the widget never swaps its content (app-wide rule).
6. Plain words: "Period" → "Time range" ("Edit time range", "Show: Today / This week…"); help lines in everyday words, one idea per line, identical in Beginner and Professional (app-wide rule).
7. Optional gap: a "Pending items" widget (overdue + open tasks); ask the owner when building.

## Settings mock v3: APPROVED by owner (12 Nov 2026), build with this condition

Mock: claude.ai/artifact/RqQwq5CgT1srfExuQPnP46 (incl. Professional features switches, 169 items in scratchpad pro-features.md; re-check the Home/Library counts).

1. The "Bold · Pen · Read" preview illustration (a setting preview) pops out too much: redo it in calm theme colours/style, matching the design rules.

## Toolbar mock v6: APPROVED by owner (12 Nov 2026), build with these conditions

Mock: claude.ai/artifact/UNS1UzPv4wb6errBrtpv4h (v6; sources and mapping in scratchpad v6\; old → new map in v6\mapping.md, 878 probes).

1. Visible feedback for every setting change: the changed part glows briefly, new items slide/fade in, a toast with Undo, a tiny live preview per row (app-wide rule).
2. Professional: "+" at the end of each tool row to pin any setting (reorder, rename, remove, group); overflow goes into "⋯ more pinned ▾", never sideways scroll; Beginner unchanged.
3. The Box card opens beside the selected box, never over it.
4. Remove the second minimise on the text box's own mini-bar; remove the top-bar Done if it has no purpose.

- Real build (AI): a tool framework, where every catalog tool is a defined action (inputs, outputs, where it writes) the AI can chain into plans; Studio multi-select builds one plan. Owner, 12 Nov.

## AI mode mock v4: APPROVED by owner (12 Nov 2026), build with the owner's comments

Mock: claude.ai/artifact/7rKh3JHCSZwHcPZQ2DdSTD (all owner comments on it are build requirements). Framework: docs/design/ai-tool-framework.md (8e3ff82). Explainer: docs/design/ai-flow-explained.pdf.

- Jobs tab still uses the v3 run flow: switch it to the framework executor in the build.
- The "Plan ready" toast must not cover the plan title.

## Library mock v2: APPROVED by owner (12 Nov 2026)

Mock: claude.ai/artifact/Ffc86ofYpqurWGnMvsXS3L (Fable v2; study in scratchpad library-v2\study.md). Owner said yes to: Continue-reading first + covers, one "+ Add", shelves only in the side panel, filters in More with active-filter chip, universal Tag picker, Knowledge highlights-first + Export "What to include", Professional = one extra row.

- Build: the universal Tag picker everywhere (notebooks, AI bar, highlights); fix the Professional 820-portrait filter row wrap; re-probe all 34 inventory features; cover tap keeps opening the notes page (Continue reading first in ⋯).

## LATER (owner, 12 Nov 2026): design together when the owner says

- Study modes: summary layers, theme pages, links between notes, reading journal, chapter recap, Quiz/Teach-back (AI), focus session (ideas in docs/plans/library-revamp-plan.md B6–B10). Open questions: which modes, where they live (Study tab vs own space vs Review), Beginner vs Professional.
- First-launch welcome + tours (New / Used it a little / Experienced).

## Toolbar mock v8: APPROVED by owner (12 Nov 2026)

Mock: claude.ai/artifact/UNS1UzPv4wb6errBrtpv4h; sources docs/mockups/toolbar-v8/ (Fable design-study.md = card system for the whole app). Last change: Favourites on the Text row too (same as Pen). Earlier v6 conditions are built in.

## Carry-over review (owner, 12 Nov 2026; done a day early)

- Root causes (one event router, one gesture router, one selection store, one overlay manager) = FIRST slice of the real build.
- Security mediums (PIN attempt delays + longer PIN, ask before loading remote pictures, headers) = fix in the build.
- Custom Views = skipped for now (parked).
- Home: ADD the "Pending items" card (overdue + open tasks).
- BUG-003 (auto-hide toolbar while writing + small "Show toolbar" pill) and BUG-004 (forced full-screen update only when needed, 5 s countdown) = build's first slices. Check: BUG-003 must sit with toolbar v8's Minimise (an optional setting "Hide toolbar while writing", same pill style); BUG-004 keeps the optional update pill for normal updates (no contradiction).
- Text box v2 (half-built): Fable decides reuse vs restart, following the approved toolbar/Box design and rules/quality.md.
- Old ideas: layers, shrink a box to scale its text, snapshot Lasso → mock-up batch 3; update bar → batch 6.
- BUG-001 / BUG-002 = fix within the build (no work on the current app now; saves tokens).
- Owner: PLANNING ONLY now; execution later in auto mode (owner sleeps).

## Favourites row + Organise + long-press strip + Paste: APPROVED (owner, 12 Nov 2026)

Pictures and mock: docs/mockups/favourites/. Favourites live inside the tool row on every tab, with "+" (Add form: tool → Current setup / Any preset → ticks → preview → name) and "☰" (Organise sheet: live preview, big rows, drag handle + ▲▼ + Move to start/end, remove with Undo, Reset, Add, Done; full-height on phone). The ★ custom tool is removed. Long-press = right-click = a horizontal GoodNotes-style strip above the selection; paste keeps the original by default, Paste ▾ offers formats, and Settings has a default paste format. Fix in the build: the B/I/U bar covering the selection handles; phone "More favourites" items must be tappable.

## Tool bar mock v9: APPROVED by owner (15 Nov 2026)

Mock: claude.ai/artifact/PBcn8WrYWcfAzCrXfDZ9HS (copy: docs/mockups/toolbar-v9/toolbar-v9.html). Replaces v8 as the 2A reference: v8 plus the owner's 15 Nov answers (docs/plans/contradictions-2026-11-15.md), Undo and Redo in the page top bar instead of < >.

## Phase 1 fixes mock: APPROVED by owner (15 Nov 2026)

Mock: claude.ai/artifact/H9xtkQg7JSwXjmwn1N5PDG (copy: docs/mockups/phase1-fixes/phase1-fixes.html). Panels: side list bar (T4), right sheets below the top bar, Page options folded, Pin an action ✕/✓ at the top, must-have update screens, no jump between Computer and Pencil mode.

Settings v4 (claude.ai/artifact/PL5zc6xh2np4CXwTYgr5sw) NOT approved: too many changes. Owner: start from the approved Settings mock v3 and add only the needed new changes; Fable checks which are needed.

Settings v3-plus (claude.ai/artifact/UV3fX4TMDJss4XmzXcScah), owner answers 15 Nov: Reduce glass keeps 2 choices (Auto, Solid). Test tools live in Advanced and are found by search at any level. Beginner also gets an "Advanced features" entry that switches on / shows all settings, just in case. Owner asked for deep research on making Settings simpler before approving.

Settings design questions (docs/research/reports, "Full customisation kept simple", 15 Nov): owner said yes to Claude's pick on 1, 2, 4, 5, 7, 8, 9, 12; 13 later. 11, 14, 15 later (docs/IDEAS.md). 3, 6, 10 yes to the pick. All 15 settled; Fable makes the Settings v5 picture from them.

Settings v5 (15 Nov): "Your layouts" hidden for now (owner chose A, later); it returns after the owner passes the Settings and tool bar test, with edit, rename and delete (docs/IDEAS.md). Manager, never drop: recount all 169 v3 feature switches into v5; keep the per-setting "this device / everywhere" menu; keep "Turn on all in this group". The old "Reset to Beginner" button is kept, named "Reset to Beginner layout" (owner, 15 Nov).

Settings v5 stories review (15 Nov), owner yes to the picks: tapping the Current starter after changes asks "Go back to Simple? (n changes)" with Undo; changing My experience later asks "Also apply the matching starter?" (No changes only the label); the button is named "Reset to Simple starter" (replaces "Reset to Beginner layout"). Owner: make the pictures cleaner to the design principles (Fable).

## Settings v5: APPROVED by owner (15 Nov 2026)

Pictures: docs/mockups/settings-v5/shots/ (1–8 iPad and dark, 9–16 phone); source docs/mockups/settings-v5/settings-v5.html. Stories: docs/features/settings-v5-stories.md. Replaces Settings v3 as the build reference. "Your layouts" hidden until after the owner's test. "Reset group" lives under More › Reset. Before the build: recount all 169 v3 feature switches into v5 (the mock shows 113).

Tool bar settings (2A.14, 15 Nov): the 5 rows (Show tool names, Format tabs 3/4, Back to last tool, Three eraser menus, Bigger Lasso) plus a "Layout: Beginner | Professional" shortcut row kept on the Writing page; one tap sets all 5, single rows can still be changed. Pictures APPROVED by owner (15 Nov): docs/mockups/toolbar-v9/settings-rows/

## Close ✕ on notices (I1): APPROVED by owner (16 Nov 2026)

Pictures: docs/mockups/toast-close/ (1–4). Rule: ✕ on the leading edge, Undo or the action on the trailing edge, message between; ✕ drawn 10 px in a faint 22 px circle, tap area 44 × 44. The update notice keeps its "Later" button (no ✕).

## Text box states like Goodnotes (C11), approved 16 Nov 2026

Pictures: docs/mockups/textbox-2b/c11-shots/ (1-typing, 2-selected, 3-none). While typing: a thin border and no dots. One tap just outside: typing ends, the box stays selected (8 dots, ≡ handle, box bar). A second tap outside: nothing selected. Replaces the typing state in docs/mockups/textbox-2b/states.html. The frame always matches the box's fill (C12).

## Box size and hints (owner, 17 Nov 2026; picture docs/design/refs/c27-new-box-one-line.png)

Replaces TB-10's "starts narrow, grows to the right" and TB-42's "Tap here to keep writing". The look stays Goodnotes (C11 states, C12 frame).

- **New box (tap empty paper with the Text tool):** as wide as the whole line, one line tall, like a Notion block. It grows downward only as you write. It can still be made narrower or taller with its dots and moved beside another box (C21).
- **First box on a page:** the same rule: one line tall when empty, as tall as its text after that, grows as you write; stretch it by hand if wanted. Tapping the paper under it with the Text tool makes a new box the same way.
- **Hints (owner, 17 Nov 2026, second word):** "Tap here to keep writing" is gone everywhere. "Type here" is gone from every new box. Only the first box of an empty page shows one hint ("Type, or tap anywhere…"), and it goes the moment you start writing.

## First tap in a box: cursor near the text, box elsewhere (owner, 17 Nov 2026; replaces TB-01 / TB-05 first tap)

Reference: the owner's two Goodnotes screenshots (17 Nov 14:30).

- **A tap on or near the text** of a box that is not selected: the typing cursor goes there at once (C11 typing look). "Near" = on a written line, up to about 1.5 to 2 letters past its last letter (not 1 cm: accuracy matters).
- **A tap in the box's empty part** (further from the text, or above or below the lines): the box is selected (8 dots, ≡ tab, box bar), like Goodnotes. To type, tap on or near the text.
- **A tap in the empty part of a box that is already selected:** it stays selected (no cursor).
- **Double and triple taps (TB-04) keep today's count:** in a box that was not active, the first tap only puts the cursor (or selects the box); the word/line count starts with the next tap.
- **The page's first box follows the same rule.**

## Open questions Q-1 to Q-6 answered (owner, 17 Nov 2026)

- **Q-1 One ⋯ per box:** only the ⋯ on the box bar stays; the ⋯ on the frame goes (replaces the two-⋯ look of the approved picture).
- **Q-2 First box while typing:** hides its dots and ≡ tab like every box; they show when it is selected (empty-part tap, C30b).
- **Q-3 Delete on the first box:** deletes it. If other boxes exist, the next one moves up and becomes first; if none, the page has no box until the user makes a new one (tap on the page). One Undo brings it back.
- **Q-4 Tap speed:** Relaxed 700 ms stays the default.
- **Q-5 Layouts (later phase, "Your layouts"; picture first):** free by default: no layout, drop a box anywhere there is space, smart guide lines snap it neatly (C21). A layout is optional and for the whole page only (a few big panels, e.g. two columns, Cornell); its panels guide (a dropped box snaps in and fits the width) but never lock: a box can be dragged out anywhere. Turning a layout off or changing it moves nothing; only the panel borders go. The 2B Layouts dialog (stacking picked boxes) stays as it is for now.
- **Q-6 Going live:** everything together later, after 2B passes the owner's test; the live app stays as it is until then.

## Empty page, tap below, keys on a selected box (owner, 18 Nov 2026)

- **Empty page:** the first (one-line) box shows no frame until it is tapped; only the grey hint "Type, or tap anywhere…" shows.
- **Tap on empty paper below the last box (Text tool):** a new one-line box at that spot (C27 stays).
- **Keys while a box is selected (dots showing):** typing does nothing. Selected means "adjust the box (shape, size, place)"; to type, tap where the words go (C30). Owner: "typing is not selected until we click somewhere it could be typed… he meant to adjust the box shape and size."
- **Hint tap (18 Nov):** on an empty page the grey hint line counts as text for "near": a tap on or near it gives the cursor; only a tap clearly away from it selects the box.
- **Hold (18 Nov):** hold on selected words = the strip (Cut, Copy, Paste…), approved; hold ≡ ~0.1 s = lift and move, approved; keyboard shortcuts as normal, approved. How a box is selected and shows its bar (today: tap its empty part) waits for the owner's Goodnotes example.
- **Empty box made by mistake (18 Nov):** a new box left empty (no text, nothing pasted, no picture or other item put in) vanishes at once, with no visible delay, the moment the user taps away or picks another tool. A box with anything in it stays.
- **Tap below makes a box only with the Text tool (18 Nov):** Pen, Highlighter, Eraser, Lasso and the rest never make a box.

## Selected box: one bar like Goodnotes (owner, 18 Nov 2026; picture first, not built yet)

Reference: owner's Goodnotes screenshots 18 Nov (uploads 8f9f2fc8-image.png, aa2edf8f-image.png).

- **One bar** when a box is selected: the text look (colour, size, font, B/I, align, list, fill) and the box actions together, replacing today's box bar + text format bar. Phone: a shorter bar, the rest under ⋯.
- **Box actions in the bar:** Cut, **Paste ▾** (tap = paste; ▾ = paste options: keep look, match style, plain text, like Settings), Delete, ⋯. Duplicate moves into ⋯. The ⋯ list keeps every item (Copy, Duplicate, Box style…), nothing dropped.
- **New in ⋯:** Lock box (a locked box cannot be moved, resized or deleted until unlocked). Front/Back: not chosen.
- **Font colour options** in the bar too; the owner will share more Goodnotes examples of how the options open.
- Next: mock-up picture for the owner's OK, then plan, then build (after the current re-test fixes).
