# Earlier decisions that seem to disagree (25 Nov 2026)

The helpers that collected [the earlier decisions](README.md) reported these pairs. **Nothing here is judged.** Many pairs are already settled, because the later line replaced the earlier one; those say "settled". The others are questions for the owner when their feature is planned. Line numbers are those of commit 8440b4cd.

## Stages: which stage a feature is in

Source files: `docs/plans/stage-questionnaire-2026-11-22.md` (Q), `docs/plans/stage-map-2026-11-22.md` (map), `docs/MASTER-PLAN.md` (plan).

- The paper page: Q line 41 says stage 1; map line 138 and confirm row 13 (line 166) say stage 2.
- Review and recall cards: Q line 95 says stage 2; map line 69 says stage 1.
- The hosted connector: Q line 119 says the end of stage 2; map lines 141 and 167 say stage 3.
- The Action bar's drawing state, the customiser, docking and the polished pickers: Q lines 65, 67, 69 say stage 1; map lines 53 to 57 say stage 2. The questionnaire holds no owner reply on these.
- Mind maps, databases and pictures: Q lines 29, 43, 45 say stage 1; map lines 79 and 80 say stage 2.
- Dashboards: plan line 18 says 1D (stage 1); Q line 47 says stage 2.
- The Pencil: plan line 16 says the Pencil comes first in stage 2; map line 13 puts the Pencil basics in stage 1.
- The size of stage 1: plan line 29 says about 32 days; map line 123 says 11 to 14 days.
- Use without an account: `docs/plans/found-wishes-2026-11-22.md` line 109 lists it as a no; line 89 adds a guest mode with an empty profile.

## Pencil, Lasso and text selection

- The Pencil hold: `docs/DECISIONS.md` line 9 (path 18 px, not 36) against line 10 (breaks at 18 px from the first touch or a 36 px path). Lines 102 (4 px and 10 px) and 251 (1.5 s) are older; line 15 replaced them.
- The Pencil hold time: `docs/DECISIONS.md` line 521 (0.5 s, a setting from 0.3 to 1.5 s) against the 25 Nov entry near the top (the hold time setting is removed). Settled by the later entry.
- Issue #68: `docs/DECISIONS.md` line 12 (goes to Fable first) against line 13 (fixed now, not stage 2) against line 14 (the owner moves it to stage 2). Settled on 25 Nov in the Fable review, section 0.1, row 2.
- A double tap in the Lasso: `docs/DECISIONS.md` line 12 (no selection by a tap or a double tap in the Lasso) against line 107 (one double-tap rule in the Text tool and the Lasso), and against line 519 (a Lasso tap places the caret) and line 364. Also `docs/features/toolbar.md` line 61 ("no double-tap word select") against line 63 (a Lasso double tap selects a word).
- Text selection: `docs/design/owner-decisions.md` lines 472, 473 and 477 (a circle in the Text tool; the Lasso unchanged) against lines 491 to 495 (precise selection in the Lasso).
- How near a tap is "near the text": `docs/design/owner-decisions.md` line 395 (1.5 to 2 letters) against line 406 (about one letter's width).
- Tap timing: `docs/design/owner-decisions.md` lines 414 and 398 against line 415. Settled: line 415 replaces them.
- The hint on the first box: `docs/design/owner-decisions.md` lines 389, 421 and 424 against line 455. Settled: line 455 drops the hint.

## The bars and the menus

- Paste: `docs/DECISIONS.md` line 66 (one press pastes) against lines 75 and 82 (the first press previews, the second pastes), line 278 (the default is "ask each time") and line 193 (it obeys the "Paste as" setting). In `docs/features/action-bar.md`, line 137 (two presses) is replaced by lines 33, 168 and 214 (one press).
- Paste only in Pencil mode: `docs/design/owner-decisions.md` line 485 against line 535 (Paste stays in every mode).
- The pinned bar: `docs/design/owner-decisions.md` line 442 (it stays with nothing selected) against line 555 (it folds into one pin button). In `docs/features/action-bar.md`, lines 31 and 143 are overridden by the fold rule at line 41; line 144 still says "A locked" where the owner chose B at line 135.
- `docs/features/action-bar.md` line 5 says Confirmed, all 21 rows Yes; line 24 says the PC picture still waits for the owner's yes.
- Where the bar goes when there is no room: `docs/design/owner-decisions.md` line 444 against the order of five places at line 546.
- The micro bar: `docs/design/owner-decisions.md` line 110 (keep it separate) against line 122 (three bars become one Selection bar, the micro bar kept). Settled by line 122.
- A name on hold or on hover: `docs/design/owner-decisions.md` line 527 (a held button shows its name) against line 549 (hover shows it; a hold shows nothing).
- The order of Cut, Copy and Delete: `docs/design/owner-decisions.md` line 545 (open) against line 548.
- The Edit button: `docs/DECISIONS.md` line 84 (inside the more menu) against line 86 (a button in view) and line 82 ("Edit text" on the box bar).
- The names "picker" and "Selection bar": `docs/DECISIONS.md` line 36 against line 44; `docs/design/principles.md` line 118 against line 120. Settled: Selection bar (24 Nov).
- The toast shape: `docs/DECISIONS.md` line 38 (C) against line 44 (the owner leans to A).
- The more menu: `docs/features/parts/more-menu.md` line 20 (the ⋯ always shows ▾, owner 24 Nov) against line 53 (Customise has no ▾).
- A pinned bar on a smaller window: `docs/features/parts/bar-place.md` line 55 (undecided) against Fable's pick at line 60.
- Right-click: `docs/DECISIONS.md` line 50 (the Hold menu always) against line 56 (the browser's menu on one misspelled word). `docs/features/parts/hold-menu.md` line 61 is overridden by the owner's "always" at line 57.
- The ribbon: `docs/DECISIONS.md` line 569 (its state is not remembered) against line 561 (saved for each device); line 742 against line 734, settled by line 734 on the owner's word.
- "New line" in the default Write set: `docs/DECISIONS.md` line 574 (left it) against line 566 (back in it).
- A long press: `docs/features/page-menus.md` lines 54 and 210 (0.5 s) against line 58 (a row's long press is 1.5 s).
- The Tool bar spec: `docs/features/toolbar.md` line 29 (only Print and PDF are still to come) against line 44 (Shapes, Tape, Magnifier and Ruler are still to come).
- The font names: `docs/design/owner-decisions.md` line 447 (Modern, Classic, Technical) against line 448 (Easy to read, Classic, Handwritten).
- The font picker: `docs/features/parts/font-picker.md` line 25 against line 32 and the Fable read at line 59; line 26 against the same Fable note.
- The keys and shortcuts card: Fable's attack read at `docs/features/parts/keys-and-shortcuts.md` line 58 is not yet applied to the rules at lines 18, 23, 51 and 52.

## Home, Settings and the first run

- The first run on Home: `docs/features/home-v2.md` line 59 (Beginner sees 4 cards) against line 314 (a default of 6 cards).
- Reset on Home: `docs/features/home-v2.md` lines 99 and 322 (one Undo step) against line 338 (Reset stays in edit mode so Cancel can undo it). Line 324 replaces "widget" by "card"; lines 328 to 343 still say "widget".
- The tour: `docs/design/owner-decisions.md` line 83 (on the first launch for all) against lines 85 to 87 (only for New) and line 253 (a tour of 7 steps).
- Beginner and Professional: `docs/design/owner-decisions.md` line 99 (a hybrid default) against line 136; lines 107 and 110 (no names in Beginner) against line 212.
- The reset button's name: `docs/design/owner-decisions.md` line 365 against line 367.
- The Settings release: `docs/design/owner-decisions.md` lines 539 and 540 (Settings v5 joins the release) against line 542, point 2 (nothing optional holds the release).
- The pending items widget: `docs/design/owner-decisions.md` line 294 (optional, ask the owner) against line 340 (add it).
- The Features chip in search: `docs/features/notebooks-search-v2.md` lines 199 and 210 (in Beginner) against line 399 (hidden from Beginner).
- Icon stroke: `docs/design/principles.md` line 140 (the owner: use the latest document) against line 76 (B, 1.75, the older value).

## Layers, the reader and study

- Layers: `docs/design/owner-decisions.md` line 22 (rotation and layer order for v2) against line 27 (layers and front/back dropped). `docs/DECISIONS.md` line 515 (at most 12 layers) against line 503 (a cap of 2 layers).
- "Boxes never overlap" (9 Nov) is replaced by the owner's decision at `docs/DECISIONS.md` line 1031.
- The reader's default: `docs/design/owner-decisions.md` line 234 (a pick: Light study) against line 237 (the owner: a new book opens in the last preset).
- Lock modes: `docs/design/owner-decisions.md` line 222 (three modes) against line 234 (a separate Full and Frozen lock board); F-360 lists four.
- A PDF: `docs/DECISIONS.md` line 1464 replaces "a PDF is always continuous".
- The study button set: `docs/design/owner-decisions.md` line 519 against line 537.

## Data, sync, accounts and the update

- Database upgrades and Replace: `docs/DECISIONS.md` line 708 (no version 13 upgrade for the lock) against lines 864 and 866 (ink tables as version 13); line 777 (Replace refused for older versions) against lines 818 and 866 (allowed when only tables were added).
- "Notes only" export: `docs/DECISIONS.md` line 782 against line 836. Settled: line 836.
- History copies: `docs/DECISIONS.md` line 837 (30 full copies) and line 996 (30 for each page) replace "10 for text, 5 for ink and media". `docs/features/page-history.md` line 29 (copies seem not to travel in files) against `docs/features/backup-and-files.md` line 11 (the full save includes them).
- Sync timing: `docs/DECISIONS.md` line 455 (every 30 s) against line 378 (2 s after the last edit; a poll every 10 s).
- Signed-out devices: `docs/DECISIONS.md` line 1370 against line 1391. Settled: line 1391 (the account gate).
- Who can sign in: `docs/features/sync.md` line 7 (only the owner's Gmail) against line 17 (an email code and a password).
- Connector access: `docs/DECISIONS.md` line 220 (the escrow choice) against lines 224 and 211 ("Allow AI").
- The currency rate: `docs/DECISIONS.md` line 1229 (fixed 90 INR for one US dollar) against line 1324 (the rate can be edited).
- The update flow: `docs/design/owner-decisions.md` line 71 (mandatory) against line 81 (forced only when needed).
- The update spec, `docs/features/update-v2.md`: line 5 and line 307 (all rows Yes) against lines 24 and 282 (rows 13 and 14 not approved) and line 304; line 305 (the 3 s countdown "proposed") against lines 143 and 307; row 15 (line 130) has no written answer.
- The prompt library: `docs/features/database.md` line 12 ("a later item") against `docs/features/prompt-library.md` line 7 ("Built 9 Nov 2026").

## Method and process

- The number of builders: `docs/DECISIONS.md` line 100 (two or three lanes) against line 20 (two builders) and lines 171 and 196 (four; six to eight). The Fable review of 25 Nov sets the lanes (section 0.2).
- Fable's role: `docs/DECISIONS.md` line 1575 (Fable as the top manager) against line 1581 (Fable only plans and solves what Opus could not). The Fable review of 25 Nov sets it (section 13.7).
- How a spec is made: `docs/DECISIONS.md` line 1660 (a flow with a confirm sheet) against line 1675 (a free talk, then a questionnaire).
- The weekly card's day: `docs/DECISIONS.md` line 1708 (Saturday) against line 1791 (Sunday).
- The iPad check rhythm: `docs/design/owner-decisions.md` line 520 against line 542. The builder ladder: line 521 against line 537.
- The Toyota-style standard: `docs/design/owner-decisions.md` line 125 (a rule text proposed) against line 184 (still asks yes or no).
- Names: `docs/DECISIONS.md` line 1714 ("strip") is renamed "picker" at line 1723; `docs/features/parts/hover-names.md` line 23 (HN-05) is marked unsure because the note at line 60 says it cannot always hold.
- Two leftover lines of a merge clash stand in `docs/DECISIONS.md` at lines 219 and 222.
