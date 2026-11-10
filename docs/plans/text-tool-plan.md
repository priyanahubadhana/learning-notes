# Text tool plan (owner bug batch 2, item 8): 10 Nov 2026

Research: [research/goodnotes-text-tool-2026-11.md](../research/goodnotes-text-tool-2026-11.md). Builds on the options pill ([features/toolbar.md](../features/toolbar.md)), the box grid ([box-grid-plan.md](box-grid-plan.md)), Layout Assist ([layout-assist-plan.md](layout-assist-plan.md)) and the tap model (batch 1, items 11 and 20, `editor/tapSelect.ts`).

## The idea in one line

GoodNotes' strip and box styles, plus our grid (no cramped handles), our flowing default box (full-page text that crosses sheets) and **several saved style presets** (the most requested GoodNotes fix).

## 1. One text bar, not three

Today there are the MicroBar (floating above the caret box), the BoxBar (on a picked box, with side pills) and the Text options pill. Each new bar should do one job:

| Bar | Shows when | Holds |
|---|---|---|
| **Text strip** (the Text options pill, restyled) | the Text tool is chosen (or pinned) | **text:** style▾ (Title/H1-3/Body), font▾, size −/26/+, colour, highlight, B, I, U, align▾, list▾, line spacing▾ · **box:** style swatch▾ (Box style popover), Layout ▦ · 📌 Pin |
| **Box bar** (kept, slimmer) | a box is picked (Lasso, box-select tap, or ⠿) | ⠿ move, Box style swatch, Layout ▦, Duplicate, Delete, ⋯ |
| **MicroBar** | **removed on iPad and desktop** while the strip is visible; kept only when the strip is hidden (tool bar auto-hidden, phone, or floating bar out of view) | B, I, colour, ⋯ (as now) |

Rule: one text-formatting surface at a time. The strip wins. The MicroBar is only a fallback, and the hold menu is unchanged.

## 2. Text tool strip

- Choosing AA opens the strip in the existing pill slot (top gap, draggable, `toolbar.pillPlace`). It mirrors the selection (shows the current font and size). With nothing selected, the values are those of the **next new box**.
- **📌 Pin Text Tool**: when off (default), picking or making a box with a tap keeps the Text tool until the user chooses another tool. That is today's behaviour, so the pin here means *keep the strip open* (the pin already exists as `pinned`). Decision: rename the label "Pin Text Tool" and keep one meaning: the strip stays open even while another pill would have closed it. (Owner Q1.)
- Size uses real points per box (12-72; stored as a box text scale), while the device font settings in `textStyle.ts` stay as display preferences.

## 3. Box style (per box, synced, default for new boxes)

- **Data**: `Box.style?: { preset?: string; bg?: ColorToken; border?: ColorToken; borderW?: 0|1|2|3; radius?: 0|4|8|12|16; shadow?: boolean; pad?: 0|4|8|12|16 }` (values in px snapped to the 4-pt grid, colours as **token names**, never hex, so dark mode works). It is optional, so no Dexie version is needed (same pattern as `Page.boxes`). Validate it in `core/boxStyle.ts`, used by backups and sync (unknown keys are dropped, values clamped). Sync uses the box record, so it rides on the existing merge.
- **Presets** (built-in, tokens only): None (default, frameless), Outline, Soft card (surface-2 fill, radius 12, pad 12), Note (yellow tint, no border), Callout (accent tint, left border), Shadow card. Users can **save up to 8 own presets** ("Save current as preset", rename, delete). They are stored per account in settings and synced.
- **Popover** "Box style": the presets grid first; **Advanced ›** gives background, border colour, border width, corner radius, shadow and padding as steppers or chips with a live preview on the real box. "Reset" returns to None.
- **Default for new boxes**: "Use for new boxes" (a check). The strip's box swatch shows the default when no box is picked, with a dot when the picked box differs (GoodNotes' heart button, made clearer). The default box of the page (the flowing one) **never takes a frame by default**, and the rule applies only to new extra boxes.
- Grid fit: padding and border sit **inside** the cell (`box-sizing: border-box`), so the 3 mm and 4 mm gaps and `layoutRows` don't change. Shadow is drawn outside, never measured. Ink stays above.

## 4. New-box frame (clear, calm)

- A Text-tool tap on blank paper (the existing rules: real tap, 8 mm from edges) makes a new full-width row box and shows an **accent 1.5 px dashed frame + caret + "Type here"** until the first character, then the box's own style (None = frame only while it has the caret, as now). An empty box is still removed 600 ms after the caret leaves.
- **Long press on blank paper** (finger or mouse; with the Pencil only if not Scribbling, as in item 5) opens the hold menu with **Start typing here**, which puts the caret at the end of the default box. If the press is below its end, empty lines are added down to that point. (This replaces GoodNotes' "text on the entire page", which we already have.)
- Hint for the first 3 pages per device: "Tap to add a text box · hold for Start typing here".

## 5. Taps (unchanged model)

`tapSelect.ts` stays the single counter. Text tool: 1 caret, 2 word, 3 line, 4 paragraph. On bare paper a tap = new box (above). A tap on the box border or ⠿ = pick the box (Box bar). Strip and popover buttons are `data-ui` (item 3 fix), so Pencil taps press them.

## 5b. Box states (owner-observed GoodNotes behaviour, 10 Nov)

| State | How you get there | What shows |
|---|---|---|
| **Idle** | tap bare paper, Esc | the box's own style only (None = no frame) |
| **Selected** | tap the box's **outer frame** (finger or Pencil; a 12 px band inside + 8 px outside the edge, at least 44 px total for touch) | floating Box bar + grid handles (⠿ move, column dividers), accent frame |
| **Typing** | tap inside the text (or a new box) | Box bar **hidden**, only a thin 1 px outline round the typing area, caret; iPad keyboard bar if the keyboard is up; the Text strip stays as it is |
| back to **Selected** | tap the frame again while typing | bar and handles return, caret kept in memory (tap inside resumes at the same spot) |

- One state per page (`boxState: idle | selected(ids) | typing(id)`) in a small pure reducer `paper/boxState.ts`, fed by `tapSelect.ts`. Frame hits are tested before text hits. Unit-test every transition.
- The MicroBar never shows in Typing (the strip or keyboard bar covers it), which matches "while typing, the bar hides".
- e2e (added to `textTool.spec.ts`): (l) frame tap shows bar + handles; tap inside hides the bar, outline stays, typing works; frame tap brings the bar back, then typing resumes at the same caret; (m) the same with a Pencil pointer; (n) Esc / bare-paper tap goes to Idle.

## 6. Tool bar: Layout + Box style

Add the Layout ▦ (from the Layout Assist plan) and a Box style swatch to the **Text strip** and the **Box bar**, and not as new main-bar icons. A main-bar slot is allowed only through the existing pin-a-tool control panel (both are offered there). Reason: the main bar is tools (modes), while these are actions on a box. (Owner Q2.)

## 7. iPad keyboard bar

When the on-screen keyboard is up (`visualViewport` shrinks more than 150 px), a 44 px glass bar sits on top of it: outdent, indent, bullet, number, checklist, align▾, B, I, U, S, ⌨↓ (hide). It replaces the MicroBar while visible. Web can't add to Apple's own shortcut row, so this is our bar (the same thing GoodNotes shows). Hidden with a hardware keyboard (no viewport shrink).

## Steps (Sonnet builder, each with tests)

1. `core/boxStyle.ts`: type, presets, `cleanStyle`, `styleToCss` (tokens to CSS vars). Unit tests (clamping, unknown keys, token names only). Wire into backup and sync checks.
2. Render: `BoxFrame` applies the style (border-box, shadow outside). The grid still passes `paperGrid.spec.ts`.
3. Box style popover (Presets + Advanced + Use for new boxes + own presets up to 8), i18n en/hi, tokens, a11y.
4. Text strip: restyle the Text pill (font, size, line spacing, box swatch, Layout, Pin). Remove the MicroBar when the strip shows. Slim the Box bar.
5. New-box frame + "Type here", long press "Start typing here", hint.
6. iPad keyboard bar (viewport detection, touch emulation in tests).
7. e2e `textTool.spec.ts`: (a) AA opens strip, pin keeps it open across another pill; (b) apply Soft card → reload → style kept; (c) Use for new boxes → next tap box has it, default box stays frameless; (d) save + apply own preset; (e) Advanced radius/padding change live, grid gaps unchanged (box rects equal before/after except inner); (f) tap on paper shows dashed frame + caret, empty box removed; (g) long press → Start typing here puts caret in default box; (h) only one text bar visible at once (strip vs MicroBar); (i) 1024x768 touch + shrunk viewport shows the keyboard bar; (j) Pencil tap on strip button presses it, no ink; (k) dark mode contrast of every preset (axe).
8. Docs: paper-page.md, toolbar.md, DECISIONS, CHANGELOG, mirror.

## Owner questions

1. Pin: is "keep the strip open" what you want, or should pinning also stop other tools from being chosen until it is unpinned?
2. Layout and Box style: in the strip and Box bar only (recommended), or also as fixed icons on the main bar?
3. Own presets: up to 8 synced per account (recommended), or per notebook?
4. Remove the MicroBar when the strip is showing (recommended), or keep both?
