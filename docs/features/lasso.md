# Lasso (today's tool, frozen) and its two fixes

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Written by Fable, 20 Nov 2026. Plan: [../plans/phases/phase-2-finish.md](../plans/phases/phase-2-finish.md). Code places, reasons and today's tests for every line: [../plans/lasso-inventory-2026-11-20.md](../plans/lasso-inventory-2026-11-20.md). This page is the first one written the spec-first way (phase page, "How every part runs"): **every line has an id, every id has a test whose name starts with that id, and the owner says yes to the lines before any code.**

## Purpose

In plain words: the Lasso is the tool that circles things (drawings, pictures, words, boxes) so you can move, resize, copy or delete them. The owner likes it as it is. This page writes down everything it does today, so that tests can hold it still (Part A0), and then fixes two rare faults without changing anything else (Part A1).

**Owner rule (20 Nov):** the Lasso is not changed. New text selection is separate code with its own switch; with that switch off, every line LS-01 to LS-47 holds exactly.

## User story

As a learner who edits notes with the Apple Pencil, I want to circle drawings, pictures, words and boxes and then move, resize, copy or delete them, so that I can tidy and correct a page quickly while nothing on the page reacts by itself.

## Rules

**Always true**

- Only what is inside the loop is selected.
- Every action can be undone with one Undo.
- The next touch always works.
- Every scenario below gives the same result with the new text selection switched off and switched on.

**Can never happen:** LS-N1 to LS-N6 (under "Part A1" below).

**Limits**

- Picks decide what a loop may take: Ink on, Pictures and Text off at the start.
- A stroke counts when 60 % of it is inside; a word when its middle is inside.
- A touch held still for 4 seconds is dropped.
- Resize goes from 0.1 to 10 times.

## Scenarios

The owner reads these; each one runs as a test (Part B0). `@ipad` = a computer can only stand in; the owner's iPad check decides. The ids in brackets point to the detail lines below.

```gherkin
Feature: The Lasso stays as it is and never gets stuck

  Scenario: A loop round a drawing selects it  [LS-12, LS-22, LS-32]
    Given a page with a small drawing
    And the Lasso tool is picked
    When I draw a loop round the whole drawing with the Pencil
    Then the drawing is selected, with its dashed box and handles
    And the Lasso bar shows

  @ipad
  Scenario: The words under the Lasso never react  [LS-01, LS-N3, LS-N4]
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the Lasso tool is picked with Picks set to Ink only
    When I draw a loop over the words with the Pencil
    Then no word is selected, typed, deleted or moved
    And Apple's own bar does not show

  Scenario: With Text picked, a loop takes whole words  [LS-13]
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the Lasso tool is picked with Picks set to Text
    When I draw a loop round "2000 rate-is"
    Then exactly "2000 rate-is" is selected

  Scenario: A new loop lets go of the old selection  [LS-07, LS-N2]
    Given a drawing is selected with the Lasso
    When I draw a new loop round another drawing
    Then only the other drawing is selected
    And the first drawing has not moved or changed

  Scenario: Moving a selection is one Undo  [LS-26, LS-41]
    Given a drawing is selected with the Lasso
    When I drag it to a new place
    And I undo once
    Then the drawing is back where it was

  @ipad
  Scenario: A missed lift still finishes the loop  [LS-50, LS-51, LS-N1]
    Given I am drawing a loop round a drawing with the Lasso
    When the iPad does not report that the Pencil lifted
    And the Pencil moves away in the air
    Then the drawing is selected, as after a normal lift
    And no loop line is left on the screen

  @ipad
  Scenario: The next loop always starts fresh  [LS-52, LS-N2, LS-N5]
    Given a loop whose lift was missed is still open
    When I touch the page again and draw a loop round another drawing
    Then the new loop starts at once
    And only the other drawing is selected

  Scenario: A stroke outside the selection never changes it  [LS-53]
    Given a drawing is selected with the Lasso
    When I draw a stroke that starts outside its dashed box
    Then the selected drawing has not moved, resized or changed

  Scenario: A loop that starts in the margin is just as safe  [LS-54]
    Given I am drawing a loop that started in the page margin
    When the iPad does not report that the Pencil lifted
    And the Pencil moves away in the air
    Then what is inside the loop is selected
    And no loop line is left on the screen
```

## How it works

Details for the builders: finer than the scenarios, and each line still has its own test. `has` = a test exists today (Part A0 puts the id in its name; no check is changed). `add` = Part A0 writes the test. `(iPad)` = only the real iPad can fully prove it; it is also in the owner's check list.

### Starting a loop

- **LS-01** `has` With the Lasso picked, the words under it never react: no Scribble, no text drag, no scroll from the Pencil. (iPad)
- **LS-02** `has` Pencil or mouse draws a loop. A finger scrolls; it draws a loop only when "Finger can draw" is Always.
- **LS-03** `add` A finger tap or a mouse click places the typing cursor there.
- **LS-04** `has` The loop is free-hand or a rectangle, as set when the touch starts.
- **LS-05** `has` A loop may start on the margin or on bare paper.
- **LS-06** `has` A tap on a stroke selects that stroke.
- **LS-07** `has` A new loop first lets go of the old selection (ink and words), the cursor and the browser's own selection.
- **LS-08** `has` The page cannot be typed in while a loop or a handle is held.
- **LS-09** `add` Pencil touches on the ink layer are cancelled, so the Pencil never scrolls the page. (iPad)
- **LS-10** `add` No loop starts under a bar, on a handle, or while a picture is being placed.

### What gets picked

- **LS-11** `has` Picks start as Ink on, Pictures off, Text off; each choice is remembered.
- **LS-12** `add` Ink: a stroke is taken when at least 60 % of it is inside the loop.
- **LS-13** `has` Text on: the whole words whose middle is inside, from the first to the last in reading order, as one selection.
- **LS-14** `has` A line taken whole (or every word of it) is selected as a line.
- **LS-15** `has` In a text box a line counts as whole only when every word and symbol is inside.
- **LS-16** `has` Pictures on: a picture that is mostly inside is taken.
- **LS-17** `has` Ink together with words or pictures: the mixed menu shows; the handles move the ink only.
- **LS-18** `has` A loop from the margin that holds all four corners of a box picks the box (else a box whose middle is inside); grouped boxes come along.
- **LS-19** `add` In books the Lasso picks ink only.
- **LS-20** `has` Taps on a box that is not active: 1 the box, 2 the cursor, 3 the word, 4 the line, 5 the paragraph. On the page's own text a double tap selects nothing.

### How the selection looks

- **LS-21** `add` The loop is a dashed line in the accent colour with a soft tint (a tinted box for the rectangle); the loop drawn from the margin looks the same.
- **LS-22** `has` The selection has a dashed box, four corner handles, a side handle on each side of 110 px or more, and a turn handle.
- **LS-23** `add` It fades in within 220 ms and out within 150 ms.
- **LS-24** `has` A faint line shows which text line the ink belongs to (hidden with the v9 tool bar).
- **LS-25** `has` Selected words show a tint with thin handles and a magnifier.

### Move, resize, turn

- **LS-26** `has` A drag inside the box moves the selection.
- **LS-27** `has` Corners resize and keep the shape; side handles stretch one way; between 0.1 and 10 times.
- **LS-28** `has` The turn handle clicks to quarter turns when within 5 degrees.
- **LS-29** `add` Two fingers on the box twist and move it.
- **LS-30** `add` A tap on the box or a handle without movement adds no Undo step.
- **LS-31** `has` Dropped ink joins the text line under it (or a new box); a mixed drag moves the lines too; one Undo puts everything back.

### The bar

- **LS-32** `has` Drawing row by default: Copy, Cut, Duplicate, Convert to text, Colour; the rest under ⋯ More.
- **LS-33** `add` ⋯ More holds Delete, Thickness, Make card, Add to Summary, Name this drawing, Paste (when something was copied), Replay (when recorded), Copy as picture, Save as picture; each one works. (Tests exist for Delete, Make card, Add to Summary; add Thickness, Name, Replay, Save.)
- **LS-34** `has` Deselect ⓧ sits beside the count and is always visible.
- **LS-35** `has` The user chooses and orders the row; it is remembered on this device.
- **LS-36** `has` With the v9 tool bar: Cut, Copy, Paste, Duplicate, Colour, Resize, Delete, ⋯; Professional adds nine more.
- **LS-37** `add` On words, Resize opens the Text size card and Paste follows Settings › Paste as.

### How a selection ends

- **LS-38** `has` A tap or a loop on empty paper lets go.
- **LS-39** `add` Esc lets go; Delete or Backspace deletes the selection. (Esc has a test; add the keys.)
- **LS-40** `add` Picking another tool lets go.
- **LS-41** `has` Every action (delete, move, resize, turn, colour) is one Undo.

### Safety nets

- **LS-42** `has` A touch that is held without moving for 4 seconds is dropped.
- **LS-43** `has` A tool change, an app switch or a lost touch ends a half-drawn loop.
- **LS-44** `add` While a bar is being dragged by its grip the Lasso ignores touches.
- **LS-45** `add` A loop gives way when a press-and-hold on words becomes a text selection.

### Ways into the Lasso

- **LS-46** `add` "Circle to lasso" (off by default): with a pen, a quick circle round ink selects it and switches to the Lasso.
- **LS-47** `has` With a drawing tool, a Pencil tap on blank paper goes back to the Lasso.

## Part A1: the two fixes (new lines)

What the owner saw (20 Nov, about 1 or 2 times in 5 to 10 uses): **(a)** an old Lasso outline stays on the screen; **(b)** after the Pencil lifts, the next Lasso stroke still acts on the old selection for a moment. Likely cause, read in the code and not yet proven: the iPad sometimes never tells the app that the Pencil lifted; the Pen and Eraser are guarded against that (B11, 19 Nov), the Lasso is not. Plain story for the owner: [../plans/lasso-bugs-a-b-note.md](../plans/lasso-bugs-a-b-note.md).

- **LS-50** When the "Pencil lifted" signal never comes, the loop still finishes the moment the Pencil is seen in the air (moving with no touch): what is inside is selected exactly as after a normal lift, and the loop line is gone. (iPad)
- **LS-51** A loop line or a selection outline is on the screen only while its loop is being drawn or its selection is alive. When the selection ends, its outline is gone within 150 ms. Never two outlines for one selection. (iPad)
- **LS-52** A new Pencil touch always starts fresh at once: if an older loop is still open, it is finished first (as LS-50), then the new loop starts. The new touch is never ignored and never waits. Two fingers twisting a selection (LS-29) stay as they are. (iPad)
- **LS-53** A stroke that starts outside the selection box never moves, resizes or changes the old selection.
- **LS-54** The loop drawn from the margin follows LS-42, LS-43 and LS-50 to LS-52 too (today it has none of these nets).
- **LS-55** A fresh start also clears a left-over line selection, so no old bar shows and no new bar is hidden.
- **LS-56** A Pencil in the air does not keep a stuck touch alive: the 4 second rule (LS-42) counts only movement while touching.

**Must never happen** (owner's pick, 20 Nov; each is a test in A1):

- **LS-N1** A Lasso outline never stays on the screen after its selection is gone. (iPad)
- **LS-N2** A new loop never acts on the old selection. (iPad)
- **LS-N3** The Lasso never changes words by itself: nothing is typed, deleted or moved without an action or a drag on purpose.
- **LS-N4** The Lasso never wakes Scribble or Apple's own bar. (iPad)
- **LS-N5** The Lasso never gets stuck: the next touch always works, with no reload and no tool change. (iPad)
- **LS-N6** With the new text selection off, the Lasso behaves exactly as today; with it on, nothing changes for ink, pictures and boxes.

**Not in A0 or A1:** letters inside a word, the purple highlight, new taps, any bar change, any change to LS-01 to LS-47.

## Edge cases

- The lift is lost and the Pencil goes away without hovering: LS-42 drops the loop after 4 seconds, and LS-52 ends it sooner if the Pencil touches again.
- The lift is lost while a selection is being moved or resized (not a loop): the move ends where the Pencil last touched; one Undo step; no jump.
- A finger scrolls while a selection is alive: the outline follows the page (today's behaviour, kept).
- The app goes to the background in the middle of a loop: LS-43.

## Security check

No new data, storage, network call or pasted content in A0 and A1. Nothing to add to rules/security.md. (Paste comes with the text-level parts and gets its own check there.)

## Tests

- **Scenarios:** each scenario above runs as written (Part B0), on chromium and ipad-webkit.
- **A0 (freeze):** new file `e2e/lassoFreeze.spec.ts` for every `add` line, on chromium and ipad-webkit; every `has` test gets its id at the start of its name (names only, no check changed). No app file changes in A0. Pencil-style input through `e2e/realPen.ts`.
- **A1 (fixes):** new file `e2e/lassoLostLift.spec.ts`, written first and seen red: a Pencil loop whose lift is never sent, followed by hover moves (LS-50, LS-51, LS-56); a new touch-down while that loop is open (LS-52); the same from the margin (LS-54); a left-over line selection (LS-55); a stroke outside the box (LS-53). Then the fix. Every LS-01 to LS-47 test stays green, unchanged.
- **The checker** (Part B0, `npm run check:spec`): fails when a line here has no test named after it, or a test names a line that is not here.
- **Owner's iPad check for A1 (5 minutes, Scribble on, Lasso tool):**
  1. Draw 30 loops round drawings and words, lifting fast and moving the Pencil away low over the screen: no outline ever stays (LS-50, LS-51).
  2. Right after a loop, draw the next one at once, 15 times: each starts fresh (LS-52).
  3. Move, resize and turn a selection, use the bar: all as before (LS-26 to LS-37).
