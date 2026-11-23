# Stage 1 plan: the working app (Fable with the owner, 22 Nov 2026)

| Status                                                                     | Stage | Builds on                                                                                                                                     | Last change        |
| -------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Confirmed by the owner, 22 Nov 2026 (order 1A to 1D and the size accepted) | 1     | docs/FEATURES.md, docs/METHOD-v2.md, docs/plans/stage-map-2026-11-22.md, docs/plans/phases/phase-pc-1.md (stage 0 and U0 live on as phase 1A) | 22 Nov 2026, Fable |

## Goal of stage 1

"I use Learning Notes every day on the PC for my own notes, and read them on the iPad, without a blocking bug for a week." Claude Code writes the notebooks; the app imports them in full; I read and tidy them on the PC.

## The two non-negotiables

1. The spec is the only contract; a finding changes the spec before the code.
2. Nothing is done without proof; "no bug" means nothing stops the owner in the stage 1 path, proved by scenarios and a week of use.

## How stage 1 is cut

Four phases, each at most two weeks of building, each ending with a release on the train (preview every Friday; live every second Friday on the owner's yes). A part is under a day for one builder. Two lanes. The owner tests each phase by scenario when it is complete; bugs go to GitHub Issues; the fix round runs beside the next phase. The replan trigger (METHOD-v2) sends Opus back to the owner, who opens a Fable window, when the plan has moved too far.

Measured pace (docs/metrics/tasks.csv): a small fix 1 h, a text box part 3 h, a screen 6 to 10 h; one lane about 6 to 8 sized hours a day. Every number below is an estimate until three merged parts of the phase correct it.

| Phase | What the owner gets                                                                                                                                            | Features (docs/FEATURES.md)                                        | Size                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| 1A    | The method tooling and the update that never sticks                                                                                                            | F-032 and the set-up                                               | about 4 days, running  |
| 1M    | The build machine: fresh small windows, a done gate by program (function and look), a relay for big tasks, numbers by program, a template for the next project | method tooling (section A of the stage map), F-096 brought forward | about 6 days, estimate |
| 1B    | The Claude-made notebook, imported in full, and the editing path on the PC without a blocking bug; **the owner's daily use starts here**                       | F-001 to F-012, F-014 to F-023, F-030, F-033, F-039, F-040         | about 10 days          |
| 1C    | The bars complete and never rebuilt again                                                                                                                      | F-024 to F-029, F-031                                              | about 8 days           |
| 1D    | Reader basics, media inside pages, dashboards, custom views; the iPad reading check; the end of stage 1                                                        | F-013, F-034 to F-038                                              | about 10 days          |

About 38 working days in all, estimate (1M added 22 Nov). Usable from the end of 1B, about day 14.

## Phase 1A: set-up and the update (running since 22 Nov, 01:20)

Parts as in docs/plans/phases/phase-pc-1.md section 5 and section 18: M0 done; M1 done; M4 done; U0a, U0b done; U0c running; then M2, M3, M8, M5, M9 (Fable's attack read), M6, M7; S0 the Update card at the top of today's Settings page in the v5 card style. Done when METHOD-v2 "How we get there" is proved and the update scenarios S1 to S7 pass on chromium and at iPad size, with the owner's yes on the real iPad.

## Phase 1M: the build machine (planned 22 Nov 2026, after the red test and U0a)

Thirteen parts, one builder window each, in docs/plans/phases/phase-1m-build-machine.md. Done when the dry run (1M-13) merges two real tasks through all four gates with every number written by a program. Phase 1B starts on the machine.

## Phase 1B: the Claude notebook and the editing path (about 10 days, two lanes)

**Lane 1, the notebook path.**

| #   | What it gives                                                                                                                                                                                                               | Spec                             | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---- |
| N1  | The notes format v2 spec (ln-notes/2): boxes on paper, looks, highlights and colours, pictures incl. web pictures, mind map, database, tags, page tabs, ink and shapes; its confirm sheet; one picture of a landed notebook | ai-notes-format.md (template v2) | 4 h  |
| N2  | The importer reads v2: boxes and looks                                                                                                                                                                                      | F-001, F-007                     | 5 h  |
| N3  | The importer reads v2: highlights, colours, tags, page tabs                                                                                                                                                                 | F-001, F-008                     | 3 h  |
| N4  | The importer reads v2: pictures from the zip and from web addresses (own use)                                                                                                                                               | F-005, F-006                     | 3 h  |
| N5  | The importer reads v2: mind map and database with rows                                                                                                                                                                      | F-011, F-012                     | 4 h  |
| N6  | Page-by-page layout: sections to A4 sheets, a section with its picture on one page, long lists split, stickies for key points                                                                                               | F-002                            | 8 h  |
| N7  | Claude draws: ink strokes and shapes in the format; diagrams rendered to pictures                                                                                                                                           | F-004                            | 5 h  |
| N8  | The notebook skill for Claude Code: start questions, the style guide (the owner approves it once with a picture), writes the file, names the zip                                                                            | F-003                            | 5 h  |
| N9  | The "Test" notebook and the first real notebook made by the skill, imported, read by the owner: the first daily-use check                                                                                                   | all of the above                 | 2 h  |

**Lane 2, the editing path without a blocking bug.**

| #   | What it gives                                                                                                                                                                                                                                 | Spec                                    | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---- |
| E1  | The slice spec: the owner's Monday as scenarios S1 to S10 (open, read, fix a sentence, rewrite, highlight, colour and size, add a box beside, paste a picture, move things, save and sync), one test each through the real screen on chromium | a new spec, pc-slice.md (template v2)   | 4 h  |
| E2  | Text box and looks bug-free on the PC (F-007): every open text box finding on the PC                                                                                                                                                          | textbox-v2.md                           | 6 h  |
| E3  | Text styles and highlight (F-008)                                                                                                                                                                                                             | editor-and-blocks.md                    | 3 h  |
| E4  | Moving things, layout assist, box grid, the paper page on the PC (F-009, F-010)                                                                                                                                                               | paper-page.md                           | 5 h  |
| E5  | Mind maps and databases bug-free on the PC (F-011, F-012)                                                                                                                                                                                     | mind-map.md, databases.md               | 6 h  |
| E6  | Summary, undo and safety tools, Revise marks (F-014, F-017, F-022)                                                                                                                                                                            | summary.md, undo-history.md             | 3 h  |
| E7  | The frame: notebooks, pages, sidebar, page tabs, page menus, search, Today, Library (F-018 to F-021)                                                                                                                                          | navigation.md, search.md, library-v2.md | 5 h  |
| E8  | Layers, Tape and the mouse pen must not break (F-015, F-016); the Lasso as today (F-023); every feature on for the owner (F-039)                                                                                                              | ink.md, lasso.md, settings.md           | 3 h  |
| E9  | Data safety path: sign-in stays, offline, sync, backups, the rolling backup (F-033)                                                                                                                                                           | sync.md, backup-and-files.md            | 3 h  |
| E10 | The side-by-side with the approved pictures on the PC, light and dark; the 1B build report by scenario; the train release                                                                                                                     | quality-standard.md                     | 3 h  |

Owner's test **T1B** when N9 and E10 are merged: the Monday scenarios on the PC preview, by number. The usable checkpoint: from here the owner uses the app for real notes every day.

## Phase 1C: the bars complete (about 8 days)

Lane 1: the eleven part cards built, P1 to P11 as in phase-pc-1.md section 6 (F-024), the full customiser and docking included (F-027, F-028, F-029). Lane 2: the Action bar R1 to R7 as in section 7, with the drawing and mixed states (F-025, F-026), Settings › Bars and menus (F-031), the swap-in behind `bar.action`, the "nothing lost" test over the six old pieces, the side-by-side with pictures 1 to 22. The old bar files stay behind the switch, frozen, no new imports, until the Pencil phase goes live. Owner's test **T1C**: the bar on the PC by scenario.

## Phase 1D: reader, media, dashboards, custom views, and the end (about 10 days)

| #   | What it gives                                                                                                                                                                                                           | Features | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---- |
| D1  | Reader basics bug-free on the PC: open a PDF or book, read, highlight, notes on pages, every highlight in one list; its spec on template v2 with a confirm sheet                                                        | F-034    | 8 h  |
| D2  | The Highlights database and the highlight features                                                                                                                                                                      | F-035    | 6 h  |
| D3  | Media, audio, maths, embeds and the files table inside pages, bug-free on the PC                                                                                                                                        | F-037    | 10 h |
| D4  | Dashboards and the study tracker                                                                                                                                                                                        | F-013    | 6 h  |
| D5  | Custom Views: Collections, Smart views, Study views                                                                                                                                                                     | F-036    | 8 h  |
| D6  | The iPad reading check: open, read, navigate, scroll, zoom, at iPad size as tests, then the owner on the real iPad                                                                                                      | F-038    | 3 h  |
| D7  | The end of stage 1: nothing lost against the register; the security review (paste and import first); the release bar; the owner's full PC test by scenario; go live on the owner's yes with a backup of the notes first | all      | 12 h |

## The owner's checkpoints

Confirm sheets: N1 the notes format; N8 the style guide (one picture); E1 the slice spec; the Action bar spec rewritten on template v2 before R1; D1 the reader basics. Tests: T1B, T1C, T1D (the full PC test), each by scenario on the preview; the iPad reading check at D6 and at each live release. Reviews of the register's idea rows on the site, once.

## After stage 1

Stage 2 starts with the Pencil (F-050 to F-053, F-060), then the polishing (F-054), then the richer features; the Claude connector at its end (F-065). Stage 3 as in the register. Each stage is planned with Fable when the previous one goes live.

### Changes

- 22 Nov 2026 · made · Fable, from the owner's stage answers; order 1A to 1D and the size accepted by the owner.
