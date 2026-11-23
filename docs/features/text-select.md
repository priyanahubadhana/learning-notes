# Text selection with the Pencil (text level, switch `select.textLevel`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

**Draft, waiting for the owner's yes (20 Nov 2026).** The "why" lens was written by Fable from the owner's recorded decisions (docs/design/owner-decisions.md, 19 and 20 Nov). The "how" and "whether" lenses (a builder, a tester) run before Part A4, as docs/archive/METHOD.md says. Plan: [../plans/phases/phase-2-finish.md](../plans/phases/phase-2-finish.md), parts A4 to A9.

## Purpose

In plain words: most of the owner's iPad time goes into correcting notes with the Apple Pencil. This feature lets the owner pick exactly the letters or words meant, with our own highlight and our own bar, then delete, paste or write over them. It lives beside today's Lasso and changes nothing in it.

## User story

As a learner who edits AI-made notes on the iPad with the Apple Pencil, I want to select exactly the letters or words I mean, remove or replace them and write the new ones by hand, so that correcting a note takes seconds and never breaks my flow.

## Rules

**Always true**

- **Scribble stays on.** "Turn Scribble off" is never the fix.
- **Exactly what I meant.** What is selected is what I circled or tapped. A letter counts when about half of it is inside my circle; I adjust with the two handles.
- **Our look, not Apple's.** I see our own strong purple highlight with two round handles, and our own bar. Never Apple's.
- **Straight back to writing.** After an action on the bar, or one tap on the words, I am back in the Text tool with the typing cursor where I expect it. After Delete it waits in the gap.
- **Finger too.** A finger taps like the Pencil. A finger never circles; it scrolls.
- **Handles that hold still (owner, C1a, 21 Nov).** Only the handle I drag moves; the other one stays exactly where it is, even when they come close. While I drag a handle the page does not scroll or move. Handles are easy to grab: bigger than today, with a touch area of at least 44 pt, so a near miss takes the handle, not the next word.

- **Whole piece on a double tap.** A double tap selects everything between two spaces ("23-11", "rate-is"); a circle can still take a part (owner, 20 Nov). The same rule goes into the Text tool when Part A6 is built, so one gesture gives one result everywhere; the owner judges it on the iPad (agreed 20 Nov).
- **No doubled space.** After a delete in the middle of a line one space is left, not two, as the iPad itself does (Fable's pick; the owner did not answer this one directly, 20 Nov).

- **On the selection, my stroke acts on it** (owner, 20 Nov). Pressing on the selected words and dragging moves them to where I drop them. Going over them again and again, back and forth or round and round, deletes them. The handles at the two ends make the selection longer or shorter.
- **A tap elsewhere lets go.** A tap anywhere else ends the selection. A single tap on the selected words gives the typing cursor at that spot (owner, 19 Nov). **Only five things replace a selection** (owner, 22 Nov): Backspace, typing (a drawn letter or comma counts), the Delete button, Cut, and Paste. A single stray Pencil touch never deletes it (issue #56).

**Can never happen**

- **TS-N1** Apple's own bar (Paste, Select, Select All, AutoFill, Format) on a selection made this way.
- **TS-N2** A selection that jumps to a neighbour word (the old "one word to the left" fault).
- **TS-N3** A circle that selects something outside the box it started in.
- **TS-N4** Words that change or vanish by themselves: only an action on the bar, or my own scribble over selected words, changes them.
- **TS-N5** A circle that leaves ink on the page.
- **TS-N6** The bar over the selected words, or off the page.
- **TS-N7** Any change to today's Lasso (LS-N6 in lasso.md).

**Limits**

- It works in the box I was typing in last. Picking the Lasso takes the blinking cursor away (checked in the code, 20 Nov), so that box keeps its thin typing border while the Lasso is picked: I can see where a circle will select letters. Everywhere else the Lasso behaves as today.
- Circle: Pencil or mouse. Taps: Pencil, finger or mouse.
- Taps add up when they come within about 1 second and land about one word apart.
- One box at a time: a selection never spans two boxes.

**How I get there:** with the Text tool, tap near the words (cursor), then pick the Lasso; or already in the Lasso, tap the box and tap near the words (today's taps, LS-20); later also Edit Text on the box bar (Part B4).

## Scenarios

```gherkin
Feature: Select letters and words with the Pencil, then fix them

  Background:
    Given a text box with the words "Service 23-11 2000 rate-is"
    And that box is the one I was typing in
    And the Lasso tool is picked

  @ipad
  Scenario: S1 Circle a few letters inside a word
    When I circle "vi" in "Service" with the Pencil
    Then only "vi" is selected, with the purple highlight and two handles
    And our bar shows
    And Apple's own bar does not show

  @ipad
  Scenario: S2 Circle a word with a symbol in it
    When I circle "rate-is" with the Pencil
    Then exactly "rate-is" is selected

  Scenario: S3 Double tap a word
    When I double tap "2000"
    Then exactly "2000" is selected

  @ipad
  Scenario: S4 Delete, then write the new word
    Given "rate-is" is selected
    When I delete the selection
    Then the box reads "Service 23-11 2000 "
    And the typing cursor waits where "rate-is" was
    And the Text tool is active again

  Scenario: S5 One tap on the words gives the cursor back
    Given "23-11" is selected
    When I tap once on "Service"
    Then nothing is selected
    And the typing cursor is where I tapped
    And the Text tool is active again

  Scenario: S6 A circle that catches no letter does nothing
    When I draw a circle on the empty part of the box
    Then nothing is selected and no bar shows
    And no ink is left on the page
    And the typing cursor is where it was

  Scenario: S7 A loop outside the box is today's Lasso
    Given a small drawing outside the box
    When I draw a loop round the drawing
    Then the drawing is selected as with today's Lasso
    And the box is no longer being typed in

  Scenario: S8 A double tap takes the whole piece between spaces
    When I double tap "23-11"
    Then exactly "23-11" is selected

  Scenario: S9 No doubled space after a delete in the middle of a line
    Given "2000" is selected
    When I delete the selection
    Then the box reads "Service 23-11 rate-is"
    And the typing cursor waits where "2000" was

  Scenario: S10 Drag selected words to another place
    Given "2000" is selected
    When I press on the selected word and drag it in front of "Service"
    Then the box reads "2000 Service 23-11 rate-is"
    And one Undo puts it back

  @ipad
  Scenario: S11 Going over selected words again and again deletes them
    Given "rate-is" is selected
    When I go over it with the Pencil again and again, back and forth or round and round
    Then the box reads "Service 23-11 2000 "
    And the typing cursor waits where "rate-is" was

  Scenario: S12 A handle makes the selection longer
    Given "vi" in "Service" is selected
    When I drag the end handle to the end of the word
    Then exactly "vice" is selected
```

## We assume (not proven yet)

1. ~~Picking the Lasso keeps the typing cursor in its box.~~ **Checked by the builder lens, 20 Nov: false.** Picking the Lasso takes the focus away; the app still remembers where the cursor was. So the text level uses "the box I was typing in last", remembered when the tool changes, and shows it by its thin border. New code never asks "is the box focused" to mean "is there a cursor".
2. Under the Lasso, Scribble never takes the stroke, also inside the box that holds the cursor. Check: the owner's iPad at Part A5.
3. Because our highlight is drawn by us and the browser's own selection stays empty, iPadOS has nothing to show its bar for. Check: the owner's iPad at Parts A4 and A5.
4. "About half a letter" feels right. Check: the owner's iPad at Part A5; the number can be tuned.
5. Four moves for one correction (pick the Lasso, circle, Delete, write) are few enough. Check: the owner counts ten corrections at Part A7. If it is too many, the Scribble test (Part A3) decides the next step.

**Done when:** every scenario passes on chromium and ipad-webkit; on the owner's iPad "vi", "rate-is" and "23-11" are selected right 10 times out of 10, and a double tap 10 out of 10; delete and write over works in three moves after the selection; every Lasso test (LS-01 to LS-47) is green and unchanged; with the switch off the app is exactly as today.

## How it works

**From the builder and tester lenses (20 Nov; docs/archive/plans/lenses-2026-11-20.md):** the text level lives in its own folder and has its own letter geometry (today's circle code looks at a letter's middle only, and it is not touched); it needs one small hook where a Lasso touch starts, before the Lasso clears things; a highlight exists already, the handles are the large new piece. Numbers: half a letter = 50 %; taps add up within 1000 ms. Sizes: A4 about 6 hours (A4a the highlight, A4b the handles), A5 4 hours, A9 5 hours (A9a a scratch-out over selected words under the Lasso, read by our own code because Scribble is not active there; A9b writing over a selected word in the Text tool, T26). A green computer test does not prove "Scribble stays on", TS-N1, TS-N2 or TS-N5: the owner's iPad decides.

- `OPEN:` a circle in that box that also goes round a drawing on top of the words takes the letters only; to take the drawing, leave the box first (owner agreed, 20 Nov).

Detail lines for the builders (TS-01 …) are written part by part, just before each of A4 to A9 starts: the highlight and handles (A4); the circle, its dashed line and the half-letter rule (A5); double, triple and four taps = word, line on screen, paragraph (A6); leaving (A7); dragging selected words (A7b, S10); Paste ▾ and Delete on the bar (A8); scribble over selected words, write over a selected word (A9).

- `OPEN:` where dragged words may land: anywhere in the same box and in another box (Fable's pick); on empty paper (a new box with those words) later.
- `OPEN:` the exact bar before the smart bar exists: today's word bar with Paste ▾ and Delete added (owner, 19 Nov); one picture for the owner's OK before Part A8.

## Edge cases

To be filled by the builder and tester lenses before Part A4. From the lenses: a circle over just a space; a handle dragged past the other handle; a box with a link in it; Undo after Delete (the words and the selection come back); the page scrolls while words are selected. Known so far: a circle that crosses the box's edge (only letters of this box count); a circle over two lines; a tap on a handle (it is a handle, not a tap on the words, unless it is the next tap of a run); the page scrolls while words are selected (the highlight follows).

## Security check

Paste is the only risky path: pasted web content must go through today's paste cleaning (Settings › Paste as) and is checked in Part A8. No new storage, no network call.

## Tests

The scenarios above run as written (Part B0). Each detail line gets a test named after its id. `@ipad` scenarios count as proven only after the owner's iPad check.
