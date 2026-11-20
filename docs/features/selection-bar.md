# The smart selection bar (switch `select.smartBar`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

**Draft, waiting for the owner's yes (20 Nov 2026).** The "why" lens was written by Fable from the owner's recorded decisions (docs/design/owner-decisions.md "One smart selection bar", "Selected box: one bar like Goodnotes", "Paste and the Pencil buttons"; fable-brief-smart-select.md sections 3 and 8 to 12; the Goodnotes check in the phase page). The "how" and "whether" lenses run before Part B3. **No part after B2 is built before the owner has approved the pictures of B2.** Plan: [../plans/phases/phase-2-finish.md](../plans/phases/phase-2-finish.md), parts B1 to B9.

## Purpose

In plain words: today three different bars appear when something is selected (the Lasso's drawing bar, the small text bar, the box bar). This feature makes them one bar, in one look, that shows the right buttons for what is selected. Nothing the three bars can do today is lost.

## User story

As a learner who works with the Apple Pencil, I want one bar that shows the right buttons for whatever I selected (words, a box, a drawing, a picture or a mix), always in the same place and the same look, so that I never hunt for a button and never meet three different bars.

## Rules

**Always true**

- There is one bar. Its look is the approved one bar of 18 Nov (docs/mockups/box-bar/); each button opens a small strip right under it.
- It follows what is selected (Auto, on by default): the cursor in text, words selected, a box, a drawing, a picture, a mix.
- Nothing is dropped: every button of the three old bars is on the bar or under ⋯.
- When words get selected, the selection buttons (Cut, Copy, Delete, Link) are added at the end; the bar keeps its place and shape.
- Paste ▾ is on the bar: a tap pastes and keeps the look; ▾ offers Plain text and More.
- The bar can be moved, pinned and docked on any of the four sides; a pinned or docked bar stays on every page and after the app is closed.
- Two presets, Edit and Study; the owner chooses and orders the buttons in Settings › Tool bar › Selection bar.
- On a phone: the same presets, fewer buttons, the rest under ⋯.
- A held button shows its name. Delete is the only red button.

**Can never happen**

- **SB-N1** A feature of the three old bars is missing.
- **SB-N2** A button that does nothing is shown.
- **SB-N3** The bar covers the selected words, sits inside a box over its words, or goes past the page or the screen.
- **SB-N4** The bar jumps or swaps to a different bar when the selection goes from cursor to words.
- **SB-N5** The bar appears or moves while the owner is writing with Scribble.
- **SB-N6** Two bars show for one selection.
- **SB-N7** Apple's own bar shows in its place.

**Limits**

- Auto can be switched off in Settings: then one fixed bar shows for everything.
- No filter for mixed selections on the bar (the Lasso's Picks is the one place). No bottom keyboard bar.
- The AI button stays hidden until the owner approves the AI cost.
- With the switch off, today's three bars are exactly as they are.

**Order as drawn (owner, 20 Nov):** Edit = Delete, Paste ▾, Cut, Copy, B/I, Colour, Size, Highlight, ⋯. Study = Highlight, Colour, Make card, Add to summary, Revise mark, B/I, Copy, ⋯.

## Scenarios

```gherkin
Feature: One bar for every selection

  Scenario: With only the cursor, the bar offers format and Paste
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the typing cursor is in that box
    Then the bar shows the text buttons and Paste
    And it shows no Cut, Copy or Delete

  Scenario: Selecting words adds the selection buttons at the end
    Given the bar is showing for the cursor in a text box
    When I select the word "2000"
    Then Cut, Copy and Delete are added at the end of the bar
    And the bar has not moved or changed its shape

  Scenario: A drawing gets drawing buttons
    Given a small drawing on the page
    When I select the drawing with the Lasso
    Then the bar shows the drawing buttons
    And it shows no text buttons

  Scenario: Edit Text takes me from the box to its words
    Given a text box is selected as a box
    When I choose Edit Text on the bar
    Then the typing cursor is at the end of the box's words
    And the bar shows the text buttons, in the same place

  Scenario: The Study preset puts the study buttons first
    Given the preset is Study
    When I select the word "2000"
    Then the bar starts with Highlight, Colour and Make card

  Scenario: No room near the selection
    Given a text box that fills the page
    When I select words in it
    Then the bar sits in free space
    And it does not cover the selected words
    And it is fully on the screen

  Scenario: A pinned bar stays where I put it
    Given I moved the bar to the left side and pinned it
    When I open another page and select something
    Then the bar is on the left side
```

## We assume (not proven yet)

1. The one box bar built on 18 Nov (strips, move, dock, pin) can grow into the smart bar; it does not have to be rebuilt. Check: the builder lens before Part B3.
2. Every button of the three old bars really works today. Check: Part B1 (some were "coming later" on 11 Nov).
3. The bar can load only when something is selected, so the app's first load stays inside its size limit (about 3 KB are left). Check: `npm run check:size` in Part B3.
4. The drawn order is right for daily use. Check: the owner's iPad at Part B9; it can be changed in Settings at any time.
5. A phone has room for four or five buttons and ⋯. Check: the pictures of Part B2.
6. Following the selection (Auto) never feels like the bar is jumping. Check: the owner's iPad at Part B9.

**Done when:** every scenario passes on chromium and ipad-webkit; the "nothing lost" test of Part B1 lists every old button and finds each on the bar or under ⋯; the pictures match B2 side by side (light, dark, iPad both ways, phone); with the switch off the three old bars are exactly as today; the owner has used it on the iPad and said yes.

## How it works

Detail lines for the builders (SB-01 …) are written part by part, just before each of B3 to B9 starts, after the pictures of B2 are approved. The button list of Part B1 is the base: every button, where it lives on the smart bar, and whether it works today.

- `OPEN:` the exact buttons for a mixed selection (a box with ink on it); proposed in the pictures of B2.
- `OPEN:` three Goodnotes extras, later by default: a box and its ink resized and turned as one piece; Front and Back; Create Element.

## Edge cases

To be filled by the builder and tester lenses before Part B3. Known so far: the selection changes kind while the bar is pinned; a docked bar on a phone turned sideways; a strip that would open off the screen; a locked box (only Unlock and Copy make sense).

## Security check

Paste and Link are the risky paths: pasted content goes through today's paste cleaning; a link is checked the way the text bar checks it today. No new storage beyond the bar's settings on the device.

## Tests

The scenarios above run as written (Part B0). Each detail line gets a test named after its id. Looks are checked against the pictures of B2.
