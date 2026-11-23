# Action bar (template v2, method v2)

| Status                                                                                                     | Stage | Switch             | Phase and parts                                                                  | Pictures                                                                                                       | Builds on                                                                                                                       | Last change        |
| ---------------------------------------------------------------------------------------------------------- | ----- | ------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Confirmed (all 21 sheet rows Yes, owner 22 Nov evening; set from the sheet answers, no status program yet) | `1`   | `select.actionBar` | stage 1, phase set by docs/plans/stage-1-plan.md; parts `Bar shell`, `Bar place` | PC drawn: docs/mockups/action-bar/ (waiting for the owner's yes); iPad sideways, iPad upright, phone to follow | selection-bar.md (replaced), text-select.md, page-menus.md (Hold menu), parts: `Bar shell` and `Bar place` (to be carded in M9) | 22 Nov 2026, Fable |

<!-- The top layer (down to the confirm sheet) is written for the owner. Sources: docs/plans/smart-bar-inventory-2026-11-22.md (the table and section 3), docs/DECISIONS.md 22 Nov (rounds 1 to 4), docs/design/owner-decisions.md (18 to 21 Nov), docs/design/principles.md. Security rules: rules/security.md. -->

## Goal

Whatever you select, one calm bar shows the right tools, always in the same order and look.

## The two non-negotiables

1. Nothing already decided is left out: every element of the inventory is on the bar or under ⋯.
2. The same action sits in the same place in every state; the ending never changes.

## Story

As the owner, who edits AI-made notes all day, I want one bar that changes its tools with what I select, keeps Cut, Copy, Paste and Delete where my hand expects them, and stays put when I pin it, so that I never hunt for a button.

## Picture

PC drawn (23 Nov, waiting for the owner's yes): docs/mockups/action-bar/index.html, 13 frames in docs/mockups/action-bar/png/. To be drawn after it: iPad sideways, iPad upright, phone. Every picture is checked by `scripts/check-bar-inventory.mjs` against the tool table below before you see it (owner, 22 Nov: the tool list comes before pictures).

## Rules

**Always true**

- **One bar.** One Action bar for every selection; it replaces the three old bars.
- **Default ending.** Every selection state ends Cut, Copy, Paste ▾, Delete, ⋯▾ by default (owner, 22 Nov; the pinned bar with nothing selected shows only the pin and ⋯▾); Customise bar… may change it.
- **Nothing moves.** The same button keeps the same place in every state; with only the cursor, Cut, Copy and Delete show greyed (owner, 22 Nov).
- **Paste ▾ remembers.** Its icon shows the last format used, per notebook; one press pastes at once in that format; ▾ lists the formats, picking one pastes and becomes the new default; a wrong paste is one Undo away (owner, 22 Nov evening; replaces the two-press preview of the afternoon).
- **Drag and dock.** Grab ⠿ to move the bar along its line or dock it top, left, right or bottom; stage 1 (owner, 22 Nov).
- **Floats until pinned.** Unpinned, it floats at the first free place near the selection.
- **Five places.** Below, above, upright right, upright left, else under the Tool bar.
- **Pin.** Pinned, it stays exactly where it is until you move it by hand.
- **Pinned keeps place.** A pinned bar keeps its place and only changes its tools.
- **Pinned is frame.** Once pinned it joins the app frame; nothing covers it.
- **The pin is the switch.** The pin image shows empty when the bar floats and filled when it is pinned; tapping the filled pin unpins and hides the bar until the next selection. There is no separate ✕ (owner, 22 Nov evening, artifact comment: the pin image itself adds and removes the bar; no separate ✕).
- **Pinned folds (owner, 24 Nov).** A pinned bar with nothing selected folds into a small round pin button at its place. A selection opens the bar there by itself; when the selection ends it folds again; a click on the round button opens it too. The round button drags and docks like the bar and keeps its place. "Keep bar open", a row in ⋯ shown only when pinned, stops the folding: the bar then stays open with nothing selected. The fold replaces the nearly empty "pin and ⋯" bar as the default. The tool table row and the pictures change together in the redraw (the script reads the table).
- **Edit is Customise.** Edit = "Customise bar…", the last entry inside ⋯ (owner, 22 Nov, R1).
- **⋯ with ▾.** One ⋯, always last, with a small ▾ when more exists (Q18).
- **Hold menu.** Hold or right-click opens the Hold menu: the state's ending, at the pointer.
- **Hold and bar.** While the Hold menu is open: a pinned bar stays, an unpinned bar hides.
- **Phone overflow.** On a phone, tools that do not fit go under ⋯; the ending stays.
- **PC.** The same bar, plus hover names and right-click; every action also by key.
- **Hover names.** Hover (mouse or Pencil) shows a button's name; nothing is hover-only.
- **44 px.** Every target 44 px always; Compact tightens spacing only (Q17).
- **Shapes.** Menus radius 8, pickers 20, sheets 24; toast is the bottom-right pill (Q4, Q5).
- **One red.** Delete is the only red button.
- **One bar in stage 1.** One customisable bar; presets (Edit, Study, Auto) wait for stage 2.
- **Study set kept.** Study later: Highlight, Make card, Add to summary, Colour, then the ending.

**Must never happen**

- **AB-N1** A picture or a build misses an element listed in the tool table.
- **AB-N2** A button moves or changes order between states, unless the user changed the bar in Customise bar….
- **AB-N3** The bar covers the selected words or leaves the screen.
- **AB-N4** A pinned bar moves by itself.
- **AB-N5** Two bars show for one selection (the Hold menu counts as one).
- **AB-N6** A button that does nothing is shown.
- **AB-N7** An action that only a hover can reach.
- **AB-N8** Apple's own bar shows in place of ours.

**Limits**

- Drawing and mixed rows are recorded now and built in stage 2 (stage map); phone in stage 3.
- The AI button stays hidden until the owner approves the AI cost.

## The tool table (the checklist; the script reads it)

Every bar starts with ⠿ (move) and the pin (filled when pinned; tapping it again unpins and hides; no ✕). Pinned with nothing selected, the bar is folded into one round pin button (44 px, filled pin, accent tint) that is also the move handle; "Keep bar open" (ticked in ⋯▾, pinned only) keeps the full bar instead. "B/I ▾" opens Bold, Italic, Underline, Strike, Highlight.

<!-- tool-table:start -->

| State                    | Stage | On the bar, in order                                                                             | Inside ⋯▾, in order                                                                         |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Caret in text            | 1     | B/I ▾, Colour, Size, Font, Highlight, Cut (grey), Copy (grey), Paste ▾, Delete (grey), ⋯▾        | Make card, Add to summary, Revise mark, Customise bar…                                      |
| Words selected           | 1     | B/I ▾, Colour, Size, Font, Highlight, Cut, Copy, Paste ▾, Delete, ⋯▾                             | Link, Make card, Add to summary, Revise mark, Customise bar…                                |
| A box                    | 1     | Edit text, B/I ▾, Colour, Size, Font, Align ▾, List ▾, Box style, Cut, Copy, Paste ▾, Delete, ⋯▾ | Duplicate, Lock box, Make card, Add to summary, Revise mark, Customise bar…                 |
| A picture                | 1     | Cut, Copy, Paste ▾, Delete, ⋯▾                                                                   | Duplicate, Make card, Add to summary, Customise bar…                                        |
| Pinned, nothing selected | 1     | pin (filled)                                                                                     |                                                                                             |
| Pinned, Keep bar open on | 1     | pin (filled), ⋯▾                                                                                 | Keep bar open, Customise bar…                                                               |
| A drawing                | 2     | Colour, Thickness, Cut, Copy, Paste ▾, Delete, ⋯▾                                                | Turn, Resize, Duplicate, Replay, Convert to text, Make card, Add to summary, Customise bar… |
| Mixed                    | 2     | Edit text, Colour, Thickness, Resize, Duplicate, Cut, Copy, Paste ▾, Delete, ⋯▾                  | Make card, Add to summary, Customise bar…                                                   |
| PC mouse notes           | 1     | the row of the selected state, unchanged; every button names itself on hover                     | the same; right-click opens the Hold menu; keys in AB-09                                    |
| Phone                    | 3     | the state's row; leading tools that do not fit move under ⋯ from the right; the ending stays     | moved tools first, in bar order, then the state's ⋯ list                                    |

<!-- tool-table:end -->

## Scenarios

- **S1, caret.** Given the cursor in "Service 23-11 2000 rate-is", then the bar shows the caret row with Cut, Copy and Delete greyed.
- **S2, words.** Given S1, when I select "2000", then Cut, Copy and Delete become active; no button moves.
- **S13, Paste ▾.** Given I pasted "as formatted" last in this notebook, when I press Paste once, then it pastes at once in that format; ▾ lets me pick another format, which pastes and is remembered.
- **S14, drag and dock.** Given a pinned bar, when I drag ⠿ to the top edge, then it docks there and stays after a reload.
- **S3, a box.** Given a box is selected, then the box row shows; Edit text puts the cursor at the end of its words.
- **S4, a drawing (stage 2).** Given a drawing selected with the Lasso, then Colour, Thickness and the ending show, no text tools.
- **S5, a picture.** Given a picture is selected, then only the ending shows; ⋯ holds Duplicate, Make card, Add to summary.
- **S6, mixed (stage 2).** Given a box with ink on it selected, then the mixed row shows, Colour and Thickness included.
- **S7, PC mouse.** Given words selected on the PC, when I hover Font, then "Font" shows; Ctrl+C copies.
- **S8, pin.** Given I pin the bar at the top left, when I select a box, then it stays there and shows the box row with the filled pin; tapping the pin unpins and hides it.
- **S15, fold (owner, 24 Nov).** Given the bar is pinned at the top left and nothing is selected, then only the round pin button shows there; when I select words, the bar opens at that place with the words row; when I click away, it folds back. Given "Keep bar open" is on, when I click away, then the bar stays open.
- **S9, Edit.** Given ⋯ is open, when I choose Customise bar…, then the Customise bar sheet opens on the state I am in.
- **S10, phone overflow (stage 3).** Given a phone and a box, then the ending shows in full and the extra tools sit first under ⋯.
- **S11, Hold menu.** Given words selected and the bar unpinned, when I right-click them, then the Hold menu opens and the bar hides until it closes.
- **S12, the thing that goes wrong.** Given the browser refuses Paste, when I press Paste, then a calm toast "Couldn't paste. Try again." shows and nothing changes.

## How we get there (the steps, each with its test)

| Step | What it gives                                     | Proved by                  |
| ---- | ------------------------------------------------- | -------------------------- |
| 1    | Every old button mapped to a cell of the table    | the inventory list (T1)    |
| 2    | The checklist script fails a bar that misses one  | `check-bar-inventory` test |
| 3    | One bar with the caret, words, box, picture rows  | AB-S1, AB-S2, AB-S3, AB-S5 |
| 4    | Floats, five places, pin as the switch, Hold menu | AB-S8, AB-S11              |
| 5    | Customise bar…, PC keys and hover names           | AB-S7, AB-S9, AB-S12       |

## On the iPad later

What changes: Pencil hover names, finger hold opens the Hold menu (Pencil hold rules stay in text-select.md and lasso.md), drag and dock by touch. What does not: the tool table, the ending, 44 px, the places, the pin.

## Done when

Every stage 1 scenario passes on chromium; the checklist script is green on the build and on every picture; the owner said yes by scenario on the preview; with the switch off the three old bars are exactly as today; one line in docs/metrics/tasks.csv.

## We assume (not proven yet)

- Today's three bars hold no button missing from the table. Check: T1.
- The bar loads only on a selection, inside the size limit. Check: `npm run check:size`.

## Open points

**Owner's answers, 22 Nov 2026 (chat):** OPEN-1: pin, ✕, drag and dock ALL in stage 1 (a stage move for drag and dock; replan count +1). OPEN-2: B, nothing moves: the buttons keep their place; with the caret, Cut, Copy and Delete show greyed. OPEN-3: A (Fable's pick, logged). OPEN-4: A, Edit text on the bar with its own icon and name. OPEN-5: A (Fable's pick, logged). OPEN-6: B, the ending is editable like the rest; the default arrangement keeps the ending and the inventory script checks the default. OPEN-7: A (Fable's pick, logged).

**Paste ▾, the owner's words (22 Nov; detail for the Paste part, to confirm in the sheet):** the Paste icon shows the last paste format used (for example "paste as formatted"); per notebook, the automatic choice is that last format; the ▾ opens the formats below to change it; the first press selects and shows a preview of the paste, the second press pastes in that format; the preview may float over boxes, it is only a preview and blocks nothing.

- `OPEN-1` Pin in stage 1? Answered 22 Nov: the pin, ✕ and drag and dock all in stage 1 (the owner went past pick A, which kept drag and dock in stage 2; one count toward the replan). B was: all in stage 2.
- `OPEN-2` Caret to words: A: Paste ▾ and ⋯ slide right as Cut, Copy join (pick). B: Cut, Copy, Delete shown greyed with the caret. Against A: Paste moves two slots.
- `OPEN-3` Order of the format tools: A: B/I, Colour, Size, Font, Highlight (20 Nov picture, pick). B: the box bar's Colour, Size, Font, B/I. Against A: the box bar changes.
- `OPEN-4` Edit text on the box and mixed bars: A: on the bar, its own text-cursor icon (pick). B: under ⋯. Against A: two "edit" words nearby.
- `OPEN-5` Pinned with nothing selected: A: only the pin and ⋯ (pick; was "⋯ and ✕" before the pin became the switch). B: also Paste ▾ into a new box. Against A: the bar looks nearly empty.
- `OPEN-6` The ending in Customise bar…: A: locked, shown with a lock (pick). B: editable like the rest. Against A: you said every button editable.
- `OPEN-7` Picture tools: A: only the ending plus ⋯ until T1 finds today's picture menu items (pick). B: crop and replace now. Against A: thin until T1.

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The goal line says what I meant.                                                                                                                                                                           |
| 2   | The two non-negotiables are right.                                                                                                                                                                         |
| 3   | Every state ends Cut, Copy, Paste ▾, Delete, ⋯▾ by default; with only the cursor those three are greyed; nothing moves.                                                                                    |
| 4   | Unpinned it floats at the five places; pinned it stays until I move it; I can drag ⠿ along a line or dock it on an edge, in stage 1.                                                                       |
| 5   | A pinned bar keeps its place and changes its tools; the filled pin unpins and hides it (owner changed from ✕, 22 Nov evening).                                                                             |
| 6   | Edit is "Customise bar…", the last entry inside ⋯.                                                                                                                                                         |
| 7   | Hold or right-click opens the Hold menu; a pinned bar stays, an unpinned one hides.                                                                                                                        |
| 8   | Row "Caret in text" of the tool table is right.                                                                                                                                                            |
| 9   | Row "Words selected" is right.                                                                                                                                                                             |
| 10  | Row "A box" is right.                                                                                                                                                                                      |
| 11  | Row "A picture" and "Pinned, nothing selected" are right.                                                                                                                                                  |
| 12  | Rows "A drawing" and "Mixed" are right, built in stage 2.                                                                                                                                                  |
| 13  | PC: the same bar, hover names, right-click, keys; phone: overflow under ⋯, the ending stays.                                                                                                               |
| 14  | Presets wait for stage 2; the Study set is recorded as written.                                                                                                                                            |
| 15  | Scenarios S1 to S14 describe what I expect.                                                                                                                                                                |
| 16  | Open points 1 to 7 are closed with my answers of 22 Nov as written under "Open points".                                                                                                                    |
| 17  | Design and quality: the check list in the bottom layer is complete.                                                                                                                                        |
| 18  | Paste ▾: the icon shows the last format per notebook; one press pastes at once; ▾ picks a format, pastes, and remembers it; Undo fixes a mistake (owner changed from the preview, 22 Nov evening).         |
| 19  | The ending can be changed in Customise bar…; the default keeps it and the script checks the default.                                                                                                       |
| 20  | The bar folds its tail into ⋯▾ by the width it has, not by device: a narrow PC window and the upright iPad fold like the phone (from the outside audit, 22 Nov).                                           |
| 21  | The ▾ format list: Escape or a tap anywhere else closes it without pasting; a screen reader hears the list and the format it pastes with (from the outside audit, 22 Nov; reworded when the preview went). |

**Owner's answer, 22 Nov evening (chat and two artifact comments):** all 21 rows Yes. Change in the comments: the pin image adds and removes the bar, no separate ✕ (applied to the rules, the tool table, S8, step 4, OPEN-5, row 5, AB-03, AB-08 and the Design check). Next by the plan: scripts/check-bar-inventory.mjs, then the pictures PC, iPad sideways, iPad upright, phone.

---

## Bottom layer: for the builders

### Builds on

| Part card or spec                     | Used for                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------- |
| selection-bar.md (replaced)           | history: place order, strips, edge cases, SB-N lines folded into AB-N     |
| text-select.md                        | what counts as words selected, caret after an action                      |
| page-menus.md                         | the Hold menu strip (Cut, Copy, Paste ▾, Delete, ⋯); reused, not rebuilt  |
| `Bar shell` (card in M9)              | grip, pin (the switch), buttons, ⋯▾, hover names, sizes                   |
| `Bar place` (card in M9)              | the five places, floating, pinned place, never over the selection         |
| Customise bar sheet (approved 20 Nov) | the tool bar's customiser, reused (REF, picture 20; ✕ left, ✓ right, 376) |

No gap, radius, timing or placement number is written here once a card owns it; point to the card.

### Plan

Made with Spec Kit after the confirm sheet is all Yes. Files: the bar under `src/` behind `select.actionBar`, one "what is selected" description shared by every state, one page-level host. First failing test: AB-S2.

### Tasks (stage 1 only)

| Task | Satisfies                   | Size    | Done when                                                      |
| ---- | --------------------------- | ------- | -------------------------------------------------------------- |
| T1   | AB-01, non-negotiable 1     | < 1 day | every button of the old bars and picture menu mapped to a cell |
| T2   | AB-02, AB-N1                | < 1 day | the script and its unit test are green; a broken fixture fails |
| T3   | AB-03 to AB-05, AB-N2, N6   | < 1 day | Bar shell card built; AB-S1, AB-S2 green                       |
| T4   | AB-06, S3, S5               | < 1 day | box and picture rows; AB-S3, AB-S5 green                       |
| T5   | AB-07, AB-08, S8, AB-N3, N4 | < 1 day | Bar place card built; AB-S8 green                              |
| T6   | AB-10, S11, AB-N5           | < 1 day | Hold menu interplay; AB-S11 green                              |
| T7   | AB-09, AB-11, S7, S9, S12   | < 1 day | keys, hover names, Customise bar…; AB-S7, AB-S9, AB-S12 green  |

### Detail lines

- **AB-14** Fold (owner, 24 Nov; builds on the minimise rule of docs/design/shell-spec.md §5 and principle 6): pinned and nothing selected = the round pin button, 44 px, at the bar's stored place (AB-08); a selection opens the bar from the button on the motion scale, the end of the selection folds it; a click or Enter on the button opens it; ⠿ behaviour (AB-13) applies to the button; "Keep bar open" in ⋯ (pinned only, a tick when on) is stored like the pin; with it on, the bar shows the pin and ⋯▾ when nothing is selected. Unpin: open the bar, tap the filled pin. One Undo does not apply (bar layout, as the pin). Scenario AB-S15.
- **AB-01** T1 lists every button of the text mini bar, box bar, Lasso bar, mixed menu and picture menu, and its cell; anything unmapped joins that state's ⋯ before the end.
- **AB-02** `scripts/check-bar-inventory.mjs` reads the table between `tool-table:start` and `tool-table:end`; it fails a picture index or a bar build whose state misses an element, in order. Run as `npm run check:bar-inventory`.
- **AB-03** Master order, from left: Edit text, B/I ▾, Colour, Thickness, Size, Font, Highlight, Align ▾, List ▾, Box style, Resize, Duplicate, then the ending (the pin sits at the start, after ⠿). A state greys what does not apply among Cut, Copy, Delete and hides the rest; nothing reorders.
- **AB-12** Paste ▾ keeps the last format per notebook in the notebook's settings; one press pastes at once in that format at the target; ▾ opens the format list, a pick pastes and stores that format; Escape or a tap elsewhere closes the list without pasting; every paste is one Undo (owner, 22 Nov evening; the preview of the afternoon is dropped).
- **AB-13** Drag: ⠿ moves the bar along its current line; dropping within 24 px of an edge docks it there (top, left, right, bottom); the dock is stored like the pin (AB-08).
- **AB-04** Changing state rebuilds the tools in one frame; the bar's left edge and top stay within 1 px (SB numbers).
- **AB-05** ⋯ always shows ▾, also when its list holds only Customise bar… (owner, 24 Nov; the case against: one extra tap for a list of one); Customise bar… is always last.
- **AB-06** Box style opens the approved Box style card (Presets, Advanced); Font opens the three quick fonts and More fonts…, each in its look; Size opens the slider strip.
- **AB-07** Unpinned place: the first free of the five; never over the selected words, never off the screen.
- **AB-08** Pin stores the place on the device; pinned stays on every page and after a restart; tapping the filled pin unpins and hides until the next selection; no ✕ (owner, 22 Nov evening, artifact comment: the pin image itself adds and removes the bar; no separate ✕).
- **AB-09** Keys: Ctrl+X, C, V, Delete act as the buttons; Alt+F10 moves focus to the bar (Fable's pick, logged); arrows move along it; Esc closes ⋯, then ends the selection.
- **AB-10** Hold menu items = the state's ending; it opens at the pointer; the unpinned bar returns when it closes.
- **AB-11** A refused clipboard gives the toast "Couldn't paste. Try again." (Q5 pill, 2.6 s) and no change.

### Not in this part

- Presets (Edit, Study, a "Preset" entry in ⋯) and Auto: stage 2.
- (Drag and dock moved INTO this part on 22 Nov, OPEN-1; see AB-13.)
- The Pencil hold rules beyond the Hold menu (text-select.md, lasso.md); the hold preview (IDEAS.md).
- Drawing and mixed rows (stage 2); phone (stage 3); the AI button.

### Design and quality check

| #   | Check                           | Yes/no | Pointer                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Looks like the approved picture | no     | none yet, by design: drawn after the sheet, checked by AB-02                                                                                                                                                                                                                                       |
| 2   | Meets quality-standard.md       | yes    | stroke 1.75 (Q1), glass frame (Q3), Delete the only red                                                                                                                                                                                                                                            |
| 3   | Follows owner-ui-patterns.md    | yes    | the pin as the switch on a staying bar (UP:9 asked for ✕; owner changed it 22 Nov evening); ⋯ ends with Customise bar…                                                                                                                                                                             |
| 4   | Accessible                      | yes    | AB-09 keys; every button labelled; contrast AA; reduced motion: no slide                                                                                                                                                                                                                           |
| 5   | i18n keys                       | yes    | `actionBar.*`: move, pin, unpin, close, more, customise, cut, copy, paste, pasteOptions, delete, editText, format, colour, size, font, highlight, align, list, boxStyle, thickness, resize, duplicate, turn, replay, convertToText, link, lockBox, makeCard, addToSummary, reviseMark, pasteFailed |
| 6   | One Undo per change             | yes    | each content action is one Undo; bar layout undone by the pin or Reset in the sheet                                                                                                                                                                                                                |
| 7   | Speed budget                    | yes    | shows within 100 ms of the selection; state change in one frame; lazy chunk (`check:size`)                                                                                                                                                                                                         |
| 8   | Device-neutral                  | yes    | 44 px, nothing hover-only (AB-N7), "On the iPad later" above                                                                                                                                                                                                                                       |
| 9   | Flexible                        | yes    | Customise bar…: a set per state, reorder, on the bar or under ⋯, reset; same as Settings › Tool bar                                                                                                                                                                                                |

### Security check

Paste and Link are the risky paths: pasted content goes through today's paste cleaning; a link is checked as the text bar checks it today. Only the bar's place and sets are stored, on the device.

### Tests

One e2e per scenario, named AB-S1 to AB-S12, through the real screen in computer mode; the tests of S4, S6 and S10 are written with their stage, not now (no skipped test is added). Unit tests for the state description and AB-03. `check-bar-inventory` runs in CI on every merge. `@ipad`: S10 and the Pencil hover name.

### Changes

- 22 Nov 2026 · Draft v2 from the inventory and the owner's answers (rounds 1 to 4); replaces selection-bar.md · waiting for the owner's sheet
- 22 Nov 2026 · - · synced with the owner's open-point answers: nothing moves (greyed Cut, Copy, Delete with the caret), Paste ▾ remembers and previews, drag and dock in stage 1, editable ending; rows 3, 4, 15, 16 reworded; rows 18 and 19 added; S13, S14, AB-12, AB-13 · Fable
- 24 Nov 2026 · owner change after the first look at the PC picture: the pinned bar folds into a round pin button when nothing is selected (question 1 A), "Keep bar open" in ⋯ (question 2 A), built with the first build (question 3 A; the case against: about one more day, and a change to a confirmed spec; one count toward the replan, 3 of 10); AB-05 reworded (⋯ always shows ▾); new: the Pinned folds rule, S15, AB-14; the tool table row changes with the redraw · Fable
