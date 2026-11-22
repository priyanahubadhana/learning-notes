# Found wishes: past wishes that have no row in the register yet

| Status                                     | Scope                                                                                    | Builds on                                                     | Last change       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------- |
| Draft, waiting for the owner's one-pass OK | every past owner wish not yet a row in docs/FEATURES.md (F-001 to F-096, F-200 to F-351) | docs/FEATURES.md, docs/MASTER-PLAN.md, DECISIONS 22 Nov 06:00 | 22 Nov 2026, Opus |

**What this is.** I read your old wishes again: the old plans, your mock-up comments, your decisions page, the checks list and the old roadmap. Below is every wish I found that has **no row** in the feature list yet. Each has a short name, a pillar letter, and the stage I suggest.

**How to answer, in one pass.** Reply with only the row numbers you want changed, for example "7 → stage 1, 12 → no". **Every row you do not name counts as yes.** That is it.

**The pillars (from the master plan).** N = Notion, what it can hold. G = GoodNotes, the Apple Pencil. F = Figma, shape the page freely. P = Power BI, show the data. A = Anki, recall cards. core = the app itself (accounts, settings, AI, safety). **The stages.** 1 = the working app for you now. 2 = the premium app for you. 3 = for everyone.

## Confirm sheet

### N · what it can hold

| Row | Wish, in plain words                                                                                                                                                                                                 | Where I found it (file)                                                                          | Pillar | Proposed stage | My pick and the one-line case against                                                                               | Owner: yes / change to |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ | -------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Copy and paste with choices: Paste keeps the look, or plain text; More gives Match style, As quote, As text box, Link; Copy as plain text or Markdown. Built, but has no row.                                        | features/copy-paste.md; design/owner-decisions.md (19 Nov, Paste ▾ menu)                         | N      | 1              | 1, you paste every day on the PC. Against: the Paste ▾ button already sits in F-025, so two rows touch paste.       |                        |
| 2   | A new page offers a short template list under the cursor (Study first), and "Start new pages as" can be any template you pick. Partly built.                                                                         | features/new-page-start.md; plans/mock-feedback-2026-11-11.md (S6)                               | N      | 1              | 1, it is built and you meet it on every new page. Against: F-017 (templates) could simply hold it.                  |                        |
| 3   | The new Notebooks and Search screens (built, switched off): the Pages tab organises like a PDF tool (add, delete, duplicate, extract, reorder), Outline, one notebook settings panel, Duplicate notebook, Reset look | features/notebooks-search-v2.md; plans/mock-feedback-2026-11-11.md (N1, N3, notebooks v2 review) | N      | 1              | 1, you said the frame should not change later. Against: one more screen for you to test in 1B.                      |                        |
| 4   | A "Resources" tab in the side panel instead of Audio: pictures, references and links you want to reuse                                                                                                               | plans/mock-feedback-2026-11-11.md (N1)                                                           | N      | 2              | 2, nice but not needed to write. Against: the new Notebooks screen (row 3) may already have it, then it is stage 1. |                        |
| 5   | "Collapse all notebooks" in one click in the sidebar (it existed before)                                                                                                                                             | plans/mock-feedback-2026-11-11.md (N2)                                                           | N      | 1              | 1, small and helps on the PC. Against: tiny; could wait for the polishing pass.                                     |                        |
| 6   | A switch beside a heading or list that turns it into its toggle version and back (you use toggles most)                                                                                                              | design/owner-decisions.md (18 Nov, Make-toggle switch)                                           | N      | 1              | 1, you use toggles daily. Against: the Action bar's List ▾ (F-025) may already cover it.                            |                        |
| 7   | Many more notebook covers (patterns, gradients, drawn), plus your own photo with a crop that shows the right shape                                                                                                   | plans/mock-feedback-2026-11-11.md (N5)                                                           | N      | 2              | 2, looks, not use. Against: none strong.                                                                            |                        |
| 8   | On a page, hide the notebook's tab row (Notes, Summary, Cards…) to give the tools room; a small arrow brings it back; on/off in Settings                                                                             | plans/mock-feedback-2026-11-11.md (notebooks v2 review)                                          | N      | 2              | 2, a polish. Against: on the PC screen space matters now, so it could be stage 1.                                   |                        |
| 9   | Reader lock with four modes: Everything works, Reading mode (like Kindle), View only, Frozen; unlock with a long press and a filling ring; remembered per book                                                       | plans/mock-feedback-2026-11-11.md (A2 owner answer)                                              | N      | 2              | 2, with the reader presets (F-058). Against: it touches every reader tool, so it is not small.                      |                        |
| 10  | Read aloud like Audible: a player, a "now playing" control on every screen, a sleep timer. Built in an earlier phase, has no row.                                                                                    | plans/master-plan-2026-11.md (B4, N22, N24, V-7)                                                 | N      | 2              | 2, with the reader. Against: it is built; if you listen while reading on the iPad now, it belongs with F-034 in 1D. |                        |
| 11  | Video time links beyond YouTube: Vimeo, Loom and your own video files                                                                                                                                                | design/owner-decisions.md (open-items choices, LATER)                                            | N      | 2              | 2. Against: the notes Claude writes (F-341) may need it sooner.                                                     |                        |
| 12  | Pictures: text that flows around a picture, drawing on a picture, labels and tape on pictures                                                                                                                        | design/owner-decisions.md (open-items BUILD list; waiting for the redesign)                      | N      | 2              | 2, premium layout. Against: Claude's notebooks place pictures in stage 1, and text flow would make them nicer.      |                        |
| 13  | Reader extras not built yet: a page-curl turn and a bubble zoom                                                                                                                                                      | plans/master-plan-2026-11.md (S-34, V-5)                                                         | N      | 2              | 2. Against: small value; could be stage 3 or never.                                                                 |                        |
| 14  | Add your own fonts (import a font file), on top of the small built-in set                                                                                                                                            | plans/master-plan-2026-11.md (H1, N4)                                                            | N      | 2              | 2, with the font polish (F-312). Against: font files need a licence check each time.                                |                        |
| 15  | Export to Word, and a share sheet that sends a page out (PDF, Word, text)                                                                                                                                            | plans/master-plan-2026-11.md (J1, N5)                                                            | N      | 3              | 3, with the other exports (F-082). Against: you may want Word copies for work sooner.                               |                        |

### G · the Apple Pencil

| Row | Wish, in plain words                                                                                                                   | Where I found it (file)                                                                   | Pillar | Proposed stage | My pick and the one-line case against                                                              | Owner: yes / change to |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | -------------- | -------------------------------------------------------------------------------------------------- | ---------------------- |
| 16  | "Keyboard stays hidden" switch: the iPad keyboard and our small bars stay down until you tap the Keyboard button; Scribble still works | design/owner-decisions.md (11 Nov, OWNER OK)                                              | G      | 2              | 2, with the Pencil work. Against: part of it may already be in the code; then it only needs a row. |                        |
| 17  | Drawing tools inside the reader: the Eraser, shapes, ruler and tape in the reader's pen, and a magnifier                               | plans/mock-feedback-2026-11-11.md (A3); design/owner-decisions.md (BUILD and LATER lists) | G      | 2              | 2, with the reader. Against: the reader is parked, so this waits behind it.                        |                        |
| 18  | Elements: stickers and GIFs with categories and Edit, like GoodNotes, with a shelf of recent ones                                      | plans/mock-feedback-2026-11-11.md (12 Nov 2:40, NEW feature)                              | G      | 2              | 2, fun, not needed. Against: pictures of stickers need a licence check; could be stage 3.          |                        |

### F · shape the page freely

| Row | Wish, in plain words                                                                                                                                   | Where I found it (file)                                         | Pillar | Proposed stage | My pick and the one-line case against                                                     | Owner: yes / change to |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------ | -------------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| 19  | Page layouts for the whole page (two columns, Cornell notes): the panels guide where a box lands but never lock it; turning a layout off moves nothing | design/owner-decisions.md (17 Nov, Q-5 "Your layouts")          | F      | 2              | 2, after the bars. Against: Claude's page-by-page notes (F-002) might want it in stage 1. |                        |
| 20  | Presets per notebook: each notebook remembers its own pen, text and box settings                                                                       | design/owner-decisions.md (LATER list); plans/text-tool-plan.md | F      | 2              | 2. Against: adds a second place where settings live, which can confuse.                   |                        |
| 21  | Turn a normal page into a paper page and back, and put a paper page inside a normal page                                                               | ROADMAP.md (Phase Q: "converting page types comes later")       | F      | 2              | 2. Against: risky for data; needs careful tests before it touches your notes.             |                        |
| 22  | A table on a paper page that carries on across the gap to the next sheet                                                                               | design/owner-decisions.md (open-items BUILD list)               | F      | 2              | 2. Against: I could not prove it is still open; it may have been built on 11 Nov.         |                        |

### P · show the data

| Row | Wish, in plain words                                                                                                                                                                                | Where I found it (file)                                      | Pillar | Proposed stage | My pick and the one-line case against                                                                   | Owner: yes / change to |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| 23  | A list of the building blocks the app is still missing to build the Planner, the Learning tracker and the Finance dashboard by hand, and then those blocks, so anyone can build them with app tools | plans/mock-feedback-2026-11-11.md (Home answers Q4, Q6, Q6b) | P      | 2              | 2, with dashboards. Against: it is open-ended; it needs a short list first so it does not grow forever. |                        |

### A · recall cards

| Row | Wish, in plain words                                                                                       | Where I found it (file)                                | Pillar | Proposed stage | My pick and the one-line case against                                                                | Owner: yes / change to |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ | -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| 24  | More study modes: a reading journal, a chapter recap, a focus session, links between notes while you study | design/owner-decisions.md (LATER, 12 Nov: study modes) | A      | 2              | 2, next to F-058 (summary layers, quiz, teach-back). Against: the quiz-style ones need AI (stage 3). |                        |

### core · the app itself

| Row | Wish, in plain words                                                                                                             | Where I found it (file)                                                                           | Pillar | Proposed stage | My pick and the one-line case against                                                                               | Owner: yes / change to |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | -------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 25  | Device modes: Pencil, Touch and Computer, each with the right buttons, and no jump when you switch. Built, but has no row.       | features/device-modes.md; plans/master-plan-2026-11.md (S-25); design/owner-decisions.md (15 Nov) | core   | 1              | 1, Computer mode is how you use the PC now. Against: F-038 and F-086 already point at the same spec.                |                        |
| 26  | An ✕ clear button in every search box and every app text field (not in your notes)                                               | plans/mock-feedback-2026-11-11.md (HT2, notebooks v2 review)                                      | core   | 1              | 1, small and used daily. Against: some fields already have it; this may be a short tidy-up only.                    |                        |
| 27  | Undo and Redo in the top bar on every screen, Home too, with a setting to hide them on a computer (Ctrl+Z and Ctrl+Y still work) | plans/mock-feedback-2026-11-11.md (HT1); features/shared-parts.md (D7)                            | core   | 1              | 1, one Undo everywhere is a core rule. Against: the page top bar may already have it; then only the setting is new. |                        |
| 28  | A Claude chat inside a notebook to change the notes while you work (your "second" use of the connector)                          | design/owner-decisions.md (11 Nov, connector is the main USP: SECONDARY)                          | core   | 3              | 3, it is AI inside the app. Against: through the connector (F-065) it could come at the end of stage 2.             |                        |
| 29  | An AI cost check: no two settings can switch on the same paid feature or charge twice                                            | design/owner-decisions.md (wave 2, Q4: severity high)                                             | core   | 3              | 3, with paid AI (F-087). Against: none, as long as no paid AI is switched on before stage 3.                        |                        |
| 30  | AI that points out what is missing in a note, and quizzes you out loud                                                           | ROADMAP.md (Phase 14)                                                                             | core   | 3              | 3, AI inside the app. Against: it overlaps the AI tutor (F-318); you may merge them.                                |                        |
| 31  | For other users: a privacy policy, "delete my account", and the GDPR, DPDP and app-store checks                                  | ROADMAP.md (Phase 15)                                                                             | core   | 3              | 3, only strangers need it. Against: none.                                                                           |                        |

## Small or unclear leftovers

These are too small or too unclear for a row. Say "make row" next to one if you want it in the list.

- **An open question from 11 Nov:** while signed out, should card review, tasks, habits, database cells and drawing also be frozen? (Today only pages and notebooks are.) design/owner-decisions.md.
- A spare icon and a test so a tool can never show a blank button. design/owner-decisions.md (11 Nov rule).
- A "Mic" button on the selection bar (T8). Probably covered by F-338 or F-062.
- A reader tab that gathers audio and formats in Professional. design/owner-decisions.md (11 Nov night).
- A "recent layouts" row, like Windows Snap Groups. plans/layout-assist-plan.md.
- The time-range bar (Today, Week, Year, custom dates) used in any template, not only Home. mock-feedback HT4, HT5. Probably built as a shared part.
- A read-only second window does not refresh. Old limitation; a bug, so it goes to GitHub Issues, not here.
- The "App user stories" notebook made through the connector, and the Gemini prompt v3 test. plans/stage-map-2026-11-22.md (I).
- The live-site check fix branch (tooling). plans/stage-map-2026-11-22.md (I).
- How others will pay (users pay, or bring their own storage). Belongs with F-095.
- A "Needs internet" label on anything that needs the internet. ROADMAP.md "Keep in mind". Probably built.
- A CAPTCHA at sign-in for strangers. design/owner-decisions.md (12 Nov: "CAPTCHA later").
- A visible flash when a setting changes (glow, toast with Undo). This is a design rule in docs/design/quality-standard.md, not a feature.

## Said no to earlier, not re-asked

- Native apps (CLAUDE.md). The App Store wrapper of this same app is F-092, not a native app.
- Collaboration, including a Share link for other people (CLAUDE.md; F-294 notes Share needs it).
- AI inside the app before stage 3 (CLAUDE.md). Rows 28 to 30 stay in stage 3 for that reason.
- Switching away from BlockNote or the stack (CLAUDE.md).
- Using the app without an account (CLAUDE.md).
- A split view in the reader (master plan V-11, owner dropped it).
- Importing Kindle books (master plan S-9). The book-store connections are parked as F-093.
- Notifications on Home (master plan standing decision 10).
- The update pill versus bar question (owner-decisions, DROP 11 Nov).
- Settings v4 (not approved, 15 Nov).
- From the text box polish list of 11 Nov: a recall card from a box, send a box to Summary, handwriting into a box, fold a box. You took these off then; I did not ask again.

## Already in the register

I checked these wishes and found them as rows, so they are not above. Wish → id.

- Lock box, Paste ▾ on the bar, Customise bar…, docking and pinning → F-025, F-027
- Shrink a box so its text scales down → F-037 (media-v2 "Shrink to scale")
- Box glides into place after a drop; minimum width is the longest word → F-007 (TB-10)
- Drag selected words to move them; scribble over them to delete → F-050
- Box rotation; layers → F-059, F-051
- Snapshot Lasso → F-060
- Saved tool bar layouts, one per device, rename, reset → F-330, F-334
- Pen with pen types inside, two erasers, "Back to tool", hide the bar while writing → F-030
- Home day planner: tasks, matrix, Top 3, timer and Focus, habits, evening review, Pending items, time blocks, weights → F-055 (its spec docs/features/home.md is not yet in the Spec column; I will add it)
- Daily Highlight with its own settings → F-307, F-055
- Planner, Learning tracker and Finance templates; Layer gallery; share layers as a file; notebook views Shelf and Tabs → F-066
- Review: reverse and true/false cards, undo last rating, forecast → F-057
- Memory helpers → F-017 (templates)
- Reader presets; the cross-book Highlights database → F-058, F-035
- Reader sticky notes, Listen, "Highlight where I land", pages grid; vocabulary → F-034
- Library knowledge bank, one Tag picker everywhere → F-021
- Notes from a PDF with a cost estimate → F-323; prompts on pages → F-087
- Settings previews, tours, the experience question, "Let AI use my notebooks" → F-080, F-081, F-090
- Every Professional feature unlockable one by one → F-085
- One-tap update, the must-have update, the update bar → F-032
- Claude connector, both local and online, with the Inbox → F-065
- Bugs and specs inside the app → F-063; Notion mirror → F-064, F-351
- PIN attempt delays; ask before loading pictures from the web → F-083
- Tap beside a box for side by side → F-328; Front / Back, Create Element → F-349
- Default page tabs → F-238; the page "…" menu → F-284; "+ Add" to pin an action → F-337, F-291
- Nicer voices, reading goals → F-308; offline dictionary → F-309
- Calendar Year view → F-315; hands-free voice → F-299; mic in the text box → F-338, F-062
- Sync for everyone → F-274; search inside database cells → F-239
- Default paper style, paper backgrounds → F-010; box layout picker → F-009

## What happens after your yes

- Each confirmed row becomes a register row in docs/FEATURES.md with the next free id in the ideas range (from F-352), its pillar, its stage, and state "idea" (or "built" where the row says built).
- A row you change is added with your change. A row you mark "no" goes under "Said no to" in this page and is not asked again.
- The old plan pages (phase-plan.md, master-plan-2026-11.md, mock-feedback-2026-11-11.md and the other old plan pages) move to docs/archive/. Nothing is deleted. ROADMAP.md becomes a pointer to MASTER-PLAN.md.
- The replan count stays the same (0), because you asked for this sweep (DECISIONS, 22 Nov 06:00).

### Changes

- 22 Nov 2026 · made · Opus, from docs/IDEAS.md (all already F-200 to F-351), docs/design/owner-decisions.md, docs/plans/\*.md, ROADMAP.md, the feature specs without a row, and the headings of docs/ARCHIVE.md.
