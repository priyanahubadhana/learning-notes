Replaced by action-bar.md (22 Nov 2026); kept for history.

# The smart selection bar (switch `select.smartBar`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

**Pictures approved by the owner on 21 Nov 2026 (check C3, docs/mockups/smart-bar/, pictures 1 to 22). This text waits for the owner's confirm.** Earlier: draft of 20 Nov. The "why" lens was written by Fable from the owner's recorded decisions (docs/design/owner-decisions.md "One smart selection bar", "Selected box: one bar like Goodnotes", "Paste and the Pencil buttons"; fable-brief-smart-select.md sections 3 and 8 to 12; the Goodnotes check in the phase page). The "how" and "whether" lenses run before Part B3. **No part after B2 is built before the owner has approved the pictures of B2.** Plan: [../plans/phases/phase-2-finish.md](../plans/phases/phase-2-finish.md), parts B1 to B9.

## Read this first (plain words, for the owner's confirm)

- One bar appears whenever something is selected: words, a box, a drawing, a picture, or a mix. It replaces today's three bars. Nothing they can do is lost.
- When you select words, Cut, Copy and Delete are added **at the end**, so nothing moves under your Pencil. Link is under ⋯.
- **Where it goes:** the first free place in this order: (1) below the selection, (2) above it, (3) upright on its right, (4) upright on its left, (5) if there is no room anywhere, just under the top tool bar, over the box but never over the words you selected. You can drag it anywhere and pin it.
- **Names on hover:** hover with the Pencil or a mouse and a button's name shows. Holding with a finger shows nothing for now.
- **Aa (Font)** opens a strip with the same three fonts the box bar has today (Easy to read, Classic, Handwritten) and More fonts…, each shown in its own look. **Size** opens the slider, − and + strip with a live sample.
- **A drawing:** Colour and Thickness are on the bar.
- **The small ⋯ tab under a box is removed.** Its menu is the bar's ⋯.
- **Every ⋯ ends with Customise bar…**, which opens the **same customiser the tool bar already has** (presets, a set for each kind of selection, live preview, reorder, reset). Nothing new is built for it. The Lasso tool also gets a Customise entry now, with its options added later.
- With the switch off, everything stays exactly as today.

## Purpose

In plain words: today three different bars appear when something is selected (the Lasso's drawing bar, the small text bar, the box bar). This feature makes them one bar, in one look, that shows the right buttons for what is selected. Nothing the three bars can do today is lost.

## User story

As a learner who works with the Apple Pencil, I want one bar that shows the right buttons for whatever I selected (words, a box, a drawing, a picture or a mix), always in the same place and the same look, so that I never hunt for a button and never meet three different bars.

## Rules

**Always true**

- **One bar.** There is one bar. Its look is the approved one bar of 18 Nov (docs/mockups/box-bar/); each button opens a small strip right under it.
- **Follows the selection.** It follows what is selected (Auto, on by default): the cursor in text, words selected, a box, a drawing, a picture, a mix.
- **Nothing dropped.** Nothing is dropped: every button of the three old bars is on the bar or under ⋯.
- **Calm.** When words get selected, Cut, Copy and Delete are added at the end; the bar keeps its place and shape (owner, 21 Nov: A). Link is under ⋯ (owner, 21 Nov).
- **Paste on the bar.** Paste ▾ is on the bar: a tap pastes and keeps the look; ▾ offers Plain text and More.
- **Where it goes (owner, 21 Nov; pictures 15 to 19).** The first place with room wins: (1) below the selection; (2) above it; (3) upright on its right; (4) upright on its left; (5) no room anywhere: just under the top tool bar, over the box but never over the selected words. It is never cut off by the page or the screen.
- **Stays where I put it.** The bar can be moved, pinned and docked on any of the four sides; a pinned or docked bar stays on every page and after the app is closed.
- **Two presets, one customiser.** Two presets, Edit and Study. Every ⋯ menu ends with **Customise bar…** (owner, 21 Nov; picture 20), which opens the tool bar's existing customiser (reused, not rebuilt): presets, a button set for each kind of selection, a live preview, reorder, on the bar or under ⋯, reset. The same place as Settings › Tool bar › Selection bar.
- **Font and size strips (owner, 18 and 21 Nov; pictures 21 and 22).** Aa opens a strip with the three quick fonts the box bar already has (Easy to read, Classic, Handwritten) and More fonts…, each drawn in its own look with a sample of the words; the current one has a ✓. Size opens the strip of 18 Nov (slider, −, number, +) with a live sample.
- **Drawing and box.** For a drawing, Colour and Thickness are on the bar (owner, 21 Nov). The small ⋯ tab under a box is removed; its menu is the bar's ⋯ (owner, 21 Nov).
- **Lasso tool.** Its menu gets a Customise entry now; its options come later (owner, 21 Nov).
- **Phone.** On a phone: the same presets, fewer buttons, the rest under ⋯.
- **Names, and one red button.** Hovering over a button (Pencil hover or a mouse) shows its name; a held finger shows nothing for now (owner, 21 Nov). Delete is the only red button.

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

**Order (owner, 21 Nov, C3):** the buttons already shown stay put and new ones join at the end (choice A). Earlier order as drawn (owner, 20 Nov): Edit = Delete, Paste ▾, Cut, Copy, B/I, Colour, Size, Highlight, ⋯. Study = Highlight, Colour, Make card, B/I, Copy, ⋯ (owner, 20 Nov, later: highlighting matters most, Make card yes; Add to summary and Revise mark sit under ⋯, nothing dropped).

## Scenarios

```gherkin
Feature: One bar for every selection

  Scenario: S1 With only the cursor, the bar offers format and Paste
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the typing cursor is in that box
    Then the bar shows the text buttons and Paste
    And it shows no Cut, Copy or Delete

  Scenario: S2 Selecting words adds the selection buttons at the end
    Given the bar is showing for the cursor in a text box
    When I select the word "2000"
    Then Cut, Copy and Delete are added at the end of the bar
    And Link is under ⋯
    And the bar has not moved or changed its shape

  Scenario: S3 A drawing gets drawing buttons
    Given a small drawing on the page
    When I select the drawing with the Lasso
    Then the bar shows the drawing buttons
    And it shows no text buttons

  Scenario: S4 Edit Text takes me from the box to its words
    Given a text box is selected as a box
    When I choose Edit Text on the bar
    Then the typing cursor is at the end of the box's words
    And the bar shows the text buttons, in the same place

  Scenario: S5 The Study preset puts the study buttons first
    Given the preset is Study
    When I select the word "2000"
    Then the bar starts with Highlight, Colour and Make card

  Scenario: S6 Below first
    Given a text box with room below it
    When I select the word "2000"
    Then the bar sits below the box

  Scenario: S6b A tall box gets the bar upright at its side
    Given a text box from the top of the page to the bottom, with room on its right
    When I select the word "2000"
    Then the bar stands upright on the right of the box
    And if there is no room on the right, it stands upright on the left

  Scenario: S6c No room anywhere
    Given a text box that fills the page
    When I select words in it
    Then the bar sits just under the top tool bar
    And it does not cover the selected words
    And it is fully on the screen

  Scenario: S8 A button's name on hover
    Given the bar is showing
    When I hover the Pencil over Aa
    Then the name "Font" shows

  Scenario: S9 The font strip shows each font in its own look
    Given words are selected
    When I tap Aa
    Then a strip shows Easy to read, Classic and Handwritten, each in its own look, and More fonts…
    And the current font has a ✓

  Scenario: S10 Customise bar opens the tool bar's customiser
    Given the bar's ⋯ is open
    When I choose Customise bar…
    Then the customiser opens on the selection bar, with the preset and the kind of selection I am on

  Scenario: S7 A pinned bar stays where I put it
    Given I moved the bar to the left side and pinned it
    When I open another page and select something
    Then the bar is on the left side
```

## We assume (not proven yet)

1. ~~The box bar of 18 Nov can simply grow into the smart bar.~~ **Checked by the builder lens, 20 Nov: partly.** Its shell (grip, docking, remembered place, strips) is reused. It is tied to boxes, so the smart bar needs three new things: one description of "what is selected" (cursor, words, box, drawing, picture, mix), the actions for each kind, and one place at page level where the bar is shown.
2. Every button of the three old bars really works today. Check: Part B1 (some were "coming later" on 11 Nov).
3. The bar can load only when something is selected, so the app's first load stays inside its size limit (about 6.9 KB were left on 20 Nov). Check: `npm run check:size` in Part B3.
4. The drawn order is right for daily use. Check: the owner's iPad at Part B9; it can be changed in Settings at any time.
5. A phone has room for four or five buttons and ⋯. Check: the pictures of Part B2.
6. Following the selection (Auto) never feels like the bar is jumping. Check: the owner's iPad at Part B9.

**Done when:** every scenario passes on chromium and ipad-webkit; the "nothing lost" test of Part B1 lists every old button and finds each on the bar or under ⋯; the pictures match B2 side by side (light, dark, iPad both ways, phone); with the switch off the three old bars are exactly as today; the owner has used it on the iPad and said yes.

## How it works

**From the builder and tester lenses (20 Nov; docs/archive/plans/lenses-2026-11-20.md):** the owner sees three bars, the code has six pieces to replace (the text mini bar, the v8 selection bar, the Lasso menu sheet, the mixed menu, the old box bar, the one box bar with its pinned form). Today two bars can show at once in some Pencil flows, which SB-N6 forbids. The two new switches need their entries and texts. Numbers: "keeps its place" = the bar's left edge, top and width within 1 px. Sizes: B3 about 8 hours (B3a what-is-selected and the page-level place, B3b the text states), B5 8 hours (B5a move, copy, card; B5b colour and thickness), B6 4, B7 7 (B7a order and storage, B7b the Settings part), B9 4. A green computer test does not prove SB-N5, SB-N7, a held button's name with the Pencil, or docking by a Pencil drag.

Detail lines for the builders (SB-01 …) are written part by part, just before each of B3 to B9 starts, after the pictures of B2 are approved. The button list of Part B1 is the base: every button, where it lives on the smart bar, and whether it works today.

- A mixed selection (a box with a drawing on it) shows Cut, Copy, Duplicate, Delete, Resize and Edit Text; the rest under ⋯ (owner agreed, 20 Nov); drawn in the pictures of B2.
- `OPEN:` three Goodnotes extras, later by default: a box and its ink resized and turned as one piece; Front and Back; Create Element.

## Edge cases

To be filled by the builder and tester lenses before Part B3. From the lenses: the selection changes while a strip is open (the strip closes); Auto is off (the Edit bar shows for everything); a saved order names a button that no longer exists (it is skipped); the iPad refuses Paste ("Couldn't paste. Try again."). Known so far: the selection changes kind while the bar is pinned; a docked bar on a phone turned sideways; a strip that would open off the screen; a locked box (only Unlock and Copy make sense).

## Security check

Paste and Link are the risky paths: pasted content goes through today's paste cleaning; a link is checked the way the text bar checks it today. No new storage beyond the bar's settings on the device.

## Tests

The scenarios above run as written (Part B0). Each detail line gets a test named after its id. Looks are checked against the pictures of B2.
