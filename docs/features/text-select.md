# Text selection with the Pencil (text level, switch `select.textLevel`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

**Draft, waiting for the owner's yes (20 Nov 2026).** The "why" lens was written by Fable from the owner's recorded decisions (docs/design/owner-decisions.md, 19 and 20 Nov). The "how" and "whether" lenses (a builder, a tester) run before Part A4, as docs/METHOD.md says. Plan: [../plans/phases/phase-2-finish.md](../plans/phases/phase-2-finish.md), parts A4 to A9.

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

- **Whole piece on a double tap.** A double tap selects everything between two spaces ("23-11", "rate-is"); a circle can still take a part (owner, 20 Nov). The Text tool's own double tap stays as it is today.
- **No doubled space.** After a delete in the middle of a line one space is left, not two, as the iPad itself does (Fable's pick; the owner did not answer this one directly, 20 Nov).

**Can never happen**

- **TS-N1** Apple's own bar (Paste, Select, Select All, AutoFill, Format) on a selection made this way.
- **TS-N2** A selection that jumps to a neighbour word (the old "one word to the left" fault).
- **TS-N3** A circle that selects something outside the box it started in.
- **TS-N4** Words that change or vanish by themselves: only an action on the bar, or my own scribble over selected words, changes them.
- **TS-N5** A circle that leaves ink on the page.
- **TS-N6** The bar over the selected words, or off the page.
- **TS-N7** Any change to today's Lasso (LS-N6 in lasso.md).

**Limits**

- It works in the box that holds the typing cursor. Everywhere else the Lasso behaves as today.
- Circle: Pencil or mouse. Taps: Pencil, finger or mouse.
- Taps add up when they come within about 1 second and land about one word apart.
- One box at a time: a selection never spans two boxes.

**How I get there:** with the Text tool, tap near the words (cursor), then pick the Lasso; or already in the Lasso, tap the box and tap near the words (today's taps, LS-20); later also Edit Text on the box bar (Part B4).

## Scenarios

```gherkin
Feature: Select letters and words with the Pencil, then fix them

  Background:
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the typing cursor is in that box
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
```

## We assume (not proven yet)

1. Picking the Lasso after the Text tool keeps the typing cursor in its box. Check: the first test of Part A4. If not, the text level uses "the box edited last".
2. Under the Lasso, Scribble never takes the stroke, also inside the box that holds the cursor. Check: the owner's iPad at Part A5.
3. Because our highlight is drawn by us and the browser's own selection stays empty, iPadOS has nothing to show its bar for. Check: the owner's iPad at Parts A4 and A5.
4. "About half a letter" feels right. Check: the owner's iPad at Part A5; the number can be tuned.
5. Four moves for one correction (pick the Lasso, circle, Delete, write) are few enough. Check: the owner counts ten corrections at Part A7. If it is too many, the Scribble test (Part A3) decides the next step.

**Done when:** every scenario passes on chromium and ipad-webkit; on the owner's iPad "vi", "rate-is" and "23-11" are selected right 10 times out of 10, and a double tap 10 out of 10; delete and write over works in three moves after the selection; every Lasso test (LS-01 to LS-47) is green and unchanged; with the switch off the app is exactly as today.

## How it works

Detail lines for the builders (TS-01 …) are written part by part, just before each of A4 to A9 starts: the highlight and handles (A4); the circle, its dashed line and the half-letter rule (A5); double, triple and four taps = word, line on screen, paragraph (A6); leaving (A7); Paste ▾ and Delete on the bar (A8); scribble over selected words, write over a selected word (A9).

- `OPEN:` the exact bar before the smart bar exists: today's word bar with Paste ▾ and Delete added (owner, 19 Nov); one picture for the owner's OK before Part A8.

## Edge cases

To be filled by the builder and tester lenses before Part A4. Known so far: a circle that crosses the box's edge (only letters of this box count); a circle over two lines; a tap on a handle (it is a handle, not a tap on the words, unless it is the next tap of a run); the page scrolls while words are selected (the highlight follows).

## Security check

Paste is the only risky path: pasted web content must go through today's paste cleaning (Settings › Paste as) and is checked in Part A8. No new storage, no network call.

## Tests

The scenarios above run as written (Part B0). Each detail line gets a test named after its id. `@ipad` scenarios count as proven only after the owner's iPad check.
