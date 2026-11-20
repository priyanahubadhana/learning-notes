# Phase 2 finish: Lasso safe, text selection, smart bar, 2B leftovers, release

Written by Fable with the owner, 20 Nov 2026. Brief: [../fable-brief-smart-select.md](../fable-brief-smart-select.md). Owner's answers: [../../design/owner-decisions.md](../../design/owner-decisions.md) "Smart select plan" (20 Nov). Whether the build is running: only [../../BUILD-STATE.md](../../BUILD-STATE.md) says. Phase 3 and later are not planned here.

## What the owner gets

Select a word or a few letters with the Pencil, delete or paste, write over it with Scribble: reliably, with Scribble on. One smart bar for every selection. Today's Lasso unchanged. Then Phases 1, 2A and 2B go live together.

- **Pictures:** the highlight and handles: docs/design/refs/lasso-text-mock.png frames 1 and 4 (plan OK; its format bar is NOT approved). The bar's base look: docs/mockups/box-bar/ (approved 18 Nov). Settings part: docs/design/refs/selection-bar-presets-mock.png (approved 20 Nov, with the button order drawn). The smart bar's own states: no picture yet (Part B2).
- **Switches (new, OFF in the live app, ON in the preview when its part is under test):** `select.textLevel`, `select.smartBar`. Off = today, exactly.
- **Already built:** see BUILD-STATE "In the code line". **Not in this page:** Settings v5 (1S), Your layouts, Phases 3 to 10, AI, native apps.

## How every part runs (spec first; owner, 20 Nov)

One small part at a time: understand → write the lines → owner's yes → tests → code → check → refine.

1. **Lines.** Just before a part starts, Opus writes its lines in the feature's spec (docs/features/): plain "when … then …" sentences, each with an id (LS-, TS-, SB-), `(iPad)` on lines only the real iPad can prove, the must-never lines, and "not in this part". Pattern to copy: docs/features/lasso.md.
2. **Owner's yes.** The owner gets the short "we will prove" list (and a picture when anything new is visible) and answers yes or "missing X". No yes, no code.
3. **Tests first.** The builder writes one test per line, its name starting with the id, sees it fail, then builds. Switch off = today.
4. **Checks.** `npm run check:spec` (Part B0), the part's tests on chromium and ipad-webkit, every LS-01 to LS-47 test green and unchanged.
5. **Review.** Opus, once: the code against the lines, the look against the picture.
6. **iPad check.** Merged to the preview; the owner checks the `(iPad)` lines in 5 minutes and answers by id ("LS-52 fail: saw …"). Selection parts: after each part. Other parts: once a day.
7. **Refine.** A finding changes the lines first, then the test, then the code. A replaced line is marked "replaced by …", never left to contradict. New ideas go to docs/IDEAS.md, not into the part.

## Who builds (owner, 20 Nov: two lanes)

- **Lane A, builder 1 (Sonnet):** selection. These parts share `src/ink/controller.ts`, `src/paper/PaperFrame.tsx` and `src/editor/tapSelect.ts`, so they run strictly one after another.
- **Lane B, builder 2 (Sonnet):** everything that does not touch those three files.
- **Opus (main chat, medium):** writes each part's lines, hands out parts, gives the one ipad-webkit turn, reviews each part once, takes over after two Sonnet fails. **Fable:** only when Opus failed twice.
- No third builder: this PC runs one ipad-webkit suite at a time (measured 14 Nov).
- Hot files (one builder, merged alone): `package.json` (B0), `src/app/flags.ts` (A4, B3), `src/settings/builtinSettings.ts` (B7), `playwright.config.ts`.

## The parts

Sizes are likely hours from the measured pace (small fix 1 h, text box task 3 h, screen 6 to 10 h). Only A0, A1 and B0 have their lines written; each later part gets its lines at step 1.

### Lane A: selection

| #   | Part (what the owner gets)                                                                                                                                                | Lines                | Size | iPad check |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---- | ---------- |
| A0  | Freeze: tests hold today's Lasso still. No app change                                                                                                                     | lasso.md LS-01 to 47 | 3 h  | no         |
| A1  | No left-over outline; a new loop always starts fresh                                                                                                                      | lasso.md LS-50 to 56 | 3 h  | yes        |
| A2  | A quiet recorder (draws nothing; "Copy last trace" in Try new features) replaces the red-line Circle recorder                                                             | to write             | 2 h  | no         |
| A3  | Scribble test: a preview switch makes a selected, not-typed-in box read-only; one circle and one double tap by the owner show whether the Text tool gets the whole stroke | to write             | 1 h  | yes        |
| A4  | Text level 1: our strong purple highlight with two round handles that drag (switch `select.textLevel`)                                                                    | to write (TS-)       | 3 h  | yes        |
| A5  | Text level 2: with the cursor in a box, a Lasso circle inside that box selects the letters at least half inside; a dashed line follows and fades; Picks is not consulted  | to write             | 3 h  | yes        |
| A6  | Text level 3: in that box, double tap = word, triple = line, four = paragraph; acts at once                                                                               | to write             | 3 h  | yes        |
| A7  | Text level 4: leaving. Delete → cursor in the gap; any action or a tap on the words → Text tool with the cursor; a stroke outside the box → box level                     | to write             | 3 h  | yes        |
| A8  | Paste ▾ and Delete on the bar that shows for a text-level selection (today's bar until B9); paste safety check                                                            | to write             | 2 h  | yes        |
| A9  | Words selected + scribble over them = delete; T26 write over a selected word                                                                                              | to write             | 3 h  | yes        |
| A10 | 2B leftovers in these files: T25 (Scribble space after "/"), B8 (Scribble off: Pencil tap selects a box), the narrow-box line overlap, P-13, P-14                         | one fix each         | 1 h  | yes        |

A3's result decides one later question only: whether circle and double tap can also work in the Text tool without switching to the Lasso. That feature stays last (owner's order) and gets its own plan.

### Lane B: bar, leftovers, test health

| #   | Part                                                                                                                                                                     | Lines          | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ---- |
| B0  | The checker `npm run check:spec`: fails when a spec line has no test named after it, or a test names an unknown line; added to the push guard. Starts with lasso.md only | below          | 2 h  |
| B1  | Smart bar button list: every button of the three bars (Lasso drawing bar, text mini bar, box bar) with its place in the smart bar; a unit test that fails if one is lost | to write (SB-) | 2 h  |
| B2  | Pictures for the owner's OK (Opus): text cursor, words selected, box, ink, picture, mixed; Edit and Study; iPad sideways first, upright, phone; light and dark           | picture        | 3 h  |
| B3  | The bar's frame and the two text states (selection actions appear at the end, the bar keeps its place)                                                                   | to write       | 6 h  |
| B4  | Box state, with Edit Text                                                                                                                                                | to write       | 3 h  |
| B5  | Ink state: every drawing action of LS-32, LS-33, LS-36                                                                                                                   | to write       | 6 h  |
| B6  | Picture and mixed states                                                                                                                                                 | to write       | 3 h  |
| B7  | Presets Edit and Study, Auto on by default, Settings › Tool bar › Selection bar (order as drawn)                                                                         | to write       | 6 h  |
| B8  | Phone: the same presets, fewer buttons, the rest under ⋯                                                                                                                 | to write       | 3 h  |
| B9  | Swap-in behind `select.smartBar` (after A8): the smart bar replaces the three bars; off = today's bars                                                                   | to write       | 3 h  |
| B10 | 2B leftovers outside lane A's files: R15 redo, R17 Shadow tile, R18 phone dots, the wheel test move, TB23-DIV, TB-24 on a clean checkout                                 | one fix each   | 1 h  |
| B11 | The shaky iPad-size tests (about 21): find each cause; never a retry or a longer wait                                                                                    | none           | 6 h  |

**B0 lines (SC-):** SC-01 a line id in a listed spec with no test named after it fails the check, naming the id. SC-02 a test that starts with an id that is in no listed spec fails. SC-03 a line marked `(iPad)` must also have at least one computer test, or the words "iPad only" and a place in a phase page's owner check list. SC-04 the list of specs under the check may only grow (a unit test guards it). SC-05 it runs in the push guard and in CI.

### The end of the phase

E1 2B.12 nothing lost (inventory against the app). E2 2B.13 pictures and the owner's full test list. E3 side by side with every approved picture (light, dark, iPad both ways, phone). E4 security review by Opus as a tester: paste first, then the whole phase; findings as a bullet list discussed with the owner. E5 the owner's full test and its fixes. E6 the release bar (rules/quality.md). E7 task 0.7 and the switch ON in the live app, on the owner's yes.

## Must-never lines offered to the owner (20 Nov; the owner picks, each picked line becomes a test)

1. A Lasso outline never stays on the screen after its selection is gone.
2. A new loop never acts on the old selection.
3. The Lasso never changes words by itself: nothing is typed, deleted or moved without an action or a drag on purpose.
4. The Lasso never wakes Scribble or Apple's own bar.
5. The loop line is never saved as ink.
6. The Lasso never gets stuck: the next touch always works, with no reload and no tool change.
7. Nothing the Lasso does is lost for good: every action is one Undo.
8. A selection never jumps to other words: only what is inside the loop.
9. The bar never covers the selected words and never leaves the screen.
10. With the new text selection off, the Lasso behaves exactly as today; with it on, nothing changes for ink, pictures and boxes.

**Owner's pick (20 Nov): 1, 2, 3, 4, 6 and 10**, as tests in A1 (docs/features/lasso.md LS-N1 to LS-N6). 5, 7, 8 and 9 are already covered by LS lines or earlier owner rules and get their id in A0. Two more for the smart bar (from the Goodnotes check below; SB lines in B1 and B3): a button that does nothing is never shown; the bar never jumps or swaps when the selection goes from cursor to words (buttons are only added at its end).

## Fable's picks inside this plan (owner may change; also in DECISIONS "to review")

- LS-50: a loop whose lift was lost **finishes** (selects) instead of being thrown away, because the owner did lift the Pencil.
- At text level the Picks filter is not consulted: the cursor in the box already says "text".
- The text level reuses the Lasso's sheet and loop drawing by calling them; it adds its own files and never edits the lines LS-01 to LS-47 describe.

## Goodnotes screenshots check (Fable, 20 Nov; all 13 pictures in docs/design/refs/ and refs/goodnotes-bar/2-more-menu.png)

Every button and behaviour in the owner's screenshots, against the app and this plan. **B1's button list must contain every row of this table.**

| Seen in Goodnotes                                                                          | In our app or plan                                                                                            | Result                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Box bar: colour, size, Resize, Edit Text, Cut, Duplicate, Delete, ⋯                        | the one box bar (approved 18 Nov) and Edit Text in B4                                                         | covered                                              |
| Text bar with only the cursor: colour, size, Aa, B/I, align, list, highlight, **Paste**, ⋯ | brief section 10 missed the Paste button; ours: Paste ▾ shows with only the cursor                            | **added to B3**                                      |
| Text bar with words selected: the same, plus link, cut, copy at the end                    | B3 (buttons added at the end; the bar keeps its place)                                                        | covered                                              |
| **Edit Text puts the cursor at the end of the text**; the bar turns into the text bar      | not written before                                                                                            | **added to B4**                                      |
| A held button shows its name ("Edit Text", "Resize")                                       | our rule: names on a long press                                                                               | **added to B3**, every bar button                    |
| Delete is the only red button                                                              | not written before                                                                                            | **added to B3**                                      |
| Resize mode: 4 square corners, a turn handle, a short bar (Cut, Copy, Duplicate, Delete)   | ours shows the handles at once (C11, LS-22); ink turns; a text box does not turn (parked)                     | handles covered; box turning later                   |
| A box and the ink on it resized and turned as one piece                                    | ours: they move together (TB-32); the handles resize the ink only (LS-17)                                     | **open: owner decides** (later by default)           |
| ⋯: Cut, Copy, Duplicate, Paste, Paste and Match Style                                      | Paste ▾: Keep look, Plain text, More: Match style                                                             | covered                                              |
| ⋯: Front, Back                                                                             | not in the app; owner 18 Nov: not chosen; needs layers                                                        | **open: owner decides** (later by default)           |
| ⋯: Lock Textbox                                                                            | Lock box in the box ⋯ (built 18 Nov)                                                                          | covered                                              |
| ⋯: Take Screenshot                                                                         | Screenshot in the mixed menu and the Professional ⋯; Copy and Save as picture for ink                         | covered; B1 checks it for a box                      |
| ⋯: Create Element (save a selection to reuse as a sticker)                                 | not in the app                                                                                                | **open: owner decides** (ideas list)                 |
| ⋯: Writing Tools, Add to Image Playground, Ask Siri; the AI ✦ button                       | Apple's own items: a web page cannot add them; our AI waits for the cost OK                                   | cannot, or later                                     |
| Bottom keyboard bar (indent, lists, align, B I U S, mic, return)                           | owner: no. Underline and Strike are in the B/I strip, Indent in the Format card, Mic and Enter in the top row | covered; B1 proves each is reachable with the Pencil |
| The dashed loop stays round the selection; the bar sits below it, never on it              | ours: the loop fades into a dashed box with handles (LS-21, LS-22); the bar never covers the words            | covered (our look kept)                              |
| Undo and Redo top left; the Lasso's ▾ "what it selects"                                    | page top bar (2A.4); Picks                                                                                    | covered                                              |

**B1 also records, for every button, whether it really works today** (the Professional ⋯ lists Move, Scale, Rotate, Screenshot, Convert; some were "coming later" on 11 Nov). A button that does nothing is not put on the smart bar.

## Will not do here

Circle select in the Text tool itself (after A3, own plan); the mixed-selection filter on the bar; a bottom keyboard bar; rotation and layers; Settings v5; anything of Phase 3 or later.

## Done when

Every line of every part has a green test named after it; the owner has ticked every `(iPad)` line; E1 to E6 pass; the full test set is green; the owner says yes.
