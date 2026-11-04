# Device modes and the formatting bar

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One app for a computer, a finger on an iPad and an Apple Pencil. A device mode (Computer, Touch or Pencil) picks where the formatting bar sits, how big its buttons are and which hints show. It is saved per device, never with the notes.

## How it works

- **Modes** (`src/app/deviceMode.ts`, presets in `MODE_PRESETS`):

| Mode     | Bar placement                                                    | Button size     | Hover tips | Shortcut hints | Auto-hide |
| -------- | ---------------------------------------------------------------- | --------------- | ---------- | -------------- | --------- |
| Computer | Top (short bar; BlockNote's selection toolbar stays as an extra) | Compact (36 px) | On         | On             | Off       |
| Touch    | Docked under the top bar                                         | Normal (44 px)  | Off        | Off            | Off       |
| Pencil   | Docked under the top bar                                         | Large (54 px)   | Off        | Off            | Off       |

- **First run:** `initDeviceMode()` (`src/settings/deviceModeSettings.ts`, called from `main.tsx`) picks Computer for a fine pointer with hover, Touch for a coarse pointer, else Computer; it never picks Pencil. An iPad in Safari's default "desktop website" mode reports a fine pointer with hover and calls itself a Mac, so a "Mac" with more than one touch point is Touch (`detectDeviceMode`). Once (key `modeRechecked`), an iPad shown as a Mac that is still on the untouched Computer preset moves to Touch; anything the owner changed is left alone.
- **Auto switch** (Settings › Advanced, `advanced.autoSwitch`, per device): _Pencil only_ (default) switches to Pencil mode when a pen (`pointerType` pen) touches the screen and shows a message with Undo; a finger does not switch back. _Both ways_ also switches a finger touch in Pencil mode back to Touch. _Off_ never switches. A mouse never switches. `autoSwitchTarget` decides; `useAutoDeviceMode` waits while another pointer is down or a key was pressed in the last 1.5 s, and after a switch (or an Undo) waits 1.5 s, so it never flips back and forth in a gesture or during typing. This replaces the one-time Pencil offer.
- **Switching:** Settings › General › Device mode, or the page ⋯ menu (Switch to … mode). Both call `applyDeviceMode`, which writes the mode and the five presets.
- **Advanced:** Settings › Advanced has each preset value as its own device setting (bar position, bar size, button tips, shortcut hints, hide when idle). Changing one leaves the mode name as it is. Touch and Pencil never go under 44 px buttons (`barButtonPx`), even with Compact.
- **Hardware keyboard:** a key press a screen keyboard cannot make (Ctrl/Cmd/Alt shortcuts, arrows, Tab, Esc, function keys) turns shortcut hints on for the rest of the visit, even in Touch mode (`watchHardwareKeyboard`).
- **Bar position (batch 2e):** Top, Bottom or **Floating** (a bar over the page with a ⠿ handle, always inside the screen). The older value `floating` now means **Off**; no mode preset uses it (batch 2f: Computer is Top too, and a one-time repair moves any saved `floating` the user never turned off to Top). In every mode, whenever no bar shows, a Show tool bar button is in the top bar. Turning the bar off asks first and offers Undo. See [toolbar-ribbon.md](toolbar-ribbon.md).
- **Docked bar** (`src/editor/DockedBar.tsx`, `BarStack.tsx`, `barActions.tsx`): text style menu, then the pinned buttons (batch 2e default Write set: Bold, Italic, Colors, Highlight, Bulleted list, Checklist, Picture, More, ↵ New line; New line is back at the end), then the **⋯ Toolbar menu** and Done. Top (the default for Touch and Pencil): sticky under the top bar, in the page flow, so it never covers text; it shares its height as `--dock-top` and the sticky section chips of a lesson page sit just below it. Bottom: fixed, lifted above the on-screen keyboard through `visualViewport`, with the safe-area inset, and the page gets space under the last line. Buttons keep the editor's selection and keyboard (the mouse-down is cancelled).
- **Toolbar menu (⋯)** is hidden until opened. It lists every tool and action (pinned or not), then Copy as plain text, Copy as Markdown (the selection, or the block with the cursor), Paste as plain text, Copy page with pictures, and Edit bar. Rows are at least 44 px; focus moves into it, ↑ ↓ move between rows, Esc closes it and returns the focus to the ⋯ button.
- **Colour button** (`src/editor/ColorPicker.tsx`): an outlined swatch (2 px ink border, 3:1 or more in every theme) with the current highlight behind a letter A and a bar in the current text colour; its label names both ("Colors. Text: Red. Highlight: Yellow."). It opens a picker with every colour by name in two groups (Text color, Highlight color), a check on the current one, and a strong border; names pass 4.5:1 in Day, Night and Sepia. BlockNote's own colour button is no longer used on the bar.
- **More** lists every button not on the bar: Strike, Code, the other marks (Keyword, Must know, Formula and any added label), Make blank, alignment, Colors, Nest and Unnest block, Create link, the picture buttons (caption, replace, rename, download, preview, delete) and Edit bar. Names come from BlockNote's own texts, so they match the floating toolbar and follow the language.
- **Edit bar:** tick or untick each button, move it with the ↑ ↓ buttons or by dragging the ⠿ handle, set size, position and auto-hide, or Reset (the default buttons and the current mode's presets). The button list is stored per device (`learning-notes:formatBar.pinned`) and checked when read.
- **Done** and a tap on empty page space collapse the selection and leave the editor (the keyboard goes away).
- **↵ New line** adds an empty paragraph after the block with the cursor and moves there. The tap area under the last block adds an empty last paragraph, or only focuses the last one when it is already empty (`src/editor/lineActions.ts`). The tap area shows in Touch and Pencil.
- **Auto-hide** (off in every preset) hides the docked bar while the editor has no focus, nothing is selected and no tray is open; the space is kept so the page does not jump.

## Short bar, tool sets and the device picker (batch 2d)

The docked bar is now the **short bar** (full spec in [toolbar-ribbon.md](toolbar-ribbon.md)). It is not a device mode: Computer, Touch and Pencil work as above.

- **Write · Draw · Read switch:** three icon-only parts at the start of the bar (names for screen readers and tooltips), plus a pin, "Keep this set". The set decides which tools show. It changes by itself (a pen touching the screen shows Draw; typing, or the keyboard focus arriving in the text, shows Write; Reading mode will show Read) unless kept; a tap always works. A pen tap that puts the cursor in the text is not "typing" (700 ms). The set is not saved (it starts on Write); the pin is.
- **Tools per set** (saved per device): Write = Bold, Italic, Colors, Highlight, Bulleted list, Checklist, Picture, More; Draw = Pen, Highlighter, Eraser, Lasso, Shapes, Ink color, Thickness, Undo; Read = Text size, Font, Theme, Find, Read aloud, Lock, Exit reading. Drawing and Reading tools that are not built show dimmed with the reason ("coming in a later update"); Undo and Theme work. Write keeps the old `formatBar.pinned` list (people who edited it keep theirs); Draw and Read are `formatBar.pinned.draw` / `.read`. **Edit bar** has a Write · Draw · Read choice, a tick list per set, ↑ ↓ and drag, and "Not on the bar" grouped by ribbon tab so any tool can be added.
- **Look:** a rounded pill with a light translucent background (blur, solid colour where blur is missing), thin 1.6 px icons from Lucide, a soft shadow, 44 px targets, an "on" bar under active tools (not colour alone), no animation with reduced motion. On a phone the bar has two rows (switch, All tools, search / tools, ⋯, Done).
- **Fixed buttons:** All tools (icon and words; opens the Toolbar menu until the ribbon exists), search icon (control panel), ⋯ Toolbar menu, Done. The text style menu moved to the top of More.
- **Device picker** (`src/app/tools/DevicePicker.tsx`, `deviceKind.ts`): Phone, iPad / tablet or Computer / laptop, shown once on first start and once to existing users (dismiss with Not now or Esc), and any time from Settings › This device. Preselected from detection (the iPad-as-Mac check, coarse pointer, screen size) and, for existing users, from the mode they use. Phone → Touch; iPad → Touch, or Pencil with "I use an Apple Pencil"; Computer → Computer (`applyDeviceMode`). Dismissing changes nothing.
- **Computer mode** has the same short bar as the others, plus BlockNote's floating toolbar over selected text; the page ⋯ menu and View › Tool bar turn the short bar on (position Top) or off.

## Edge cases

- A stored mode or setting that is not valid reads as its default; invalid values are never saved.
- A saved button that no longer exists (a deleted Revise label) is left out of the bar but stays in the saved list.
- Read-only pages (open in another window) show no bar and no tap area.
- Hover tips and shortcut hints apply to the docked bar. The Computer floating toolbar keeps BlockNote's own tips.
- The sticky section chips sit below a top bar (never covered). Their wrapper is what sticks, at `top: var(--dock-top, 0px)`; without a docked bar the value is 0.
- A pen that touches while a finger is down, or right after a key press, does not switch; it switches on the next pen touch.

## Security check

- Validated: mode, placement, size and on/off values (`isDeviceMode`, `isBarPlacement`, `isBarSize`, `isOnOff`), and the button list (`isPinnedList`: at most 40 plain ids, unique).
- Data leaving the device: none. Nothing is saved with the notes.
- Deletes: none. Reset only rewrites device preferences.

## Tests

- Unit: `src/app/deviceMode.test.ts` (presets, detection incl. iPad, auto-switch rules, size, validation, pin, unpin, reorder, keyboard keys), `src/editor/lineActions.test.ts` (New line, tap below), `src/settings/settings.test.ts` (mode switching writes presets, invalid values).
- Browser: `e2e/deviceModes.spec.ts` (Touch bar at 820×1180, More has every old action, Edit bar pin/reorder/drag/reset after reload, Done and tap-away, New line and tap below, hints with a keyboard, Pencil offer, switching from ⋯ and from Settings, Computer unchanged, screenshots in Day, Night, Sepia at 390×844 and 820×1180), `e2e/touchTargets.spec.ts`, `e2e/dockedBar.spec.ts` (always visible and on top in Touch and Pencil, chips below the bar, Toolbar menu contents, 44 px rows, keyboard), `e2e/autoSwitch.spec.ts` (pen simulated with dispatched pointer events: Pencil only, Both ways, Off, debounce), `e2e/barColor.spec.ts` (WCAG contrast of the colour button, picker and every bar button in Day, Night and Sepia; chosen colours show on the button). Copy and paste: [copy-paste.md](copy-paste.md). Batch 2d: `e2e/toolBar.spec.ts` (switch, auto change, keep, per-set tools and Edit bar, icons, contrast in three themes, reduced motion, phone width), `e2e/devicePicker.spec.ts`; unit `deviceKind.test.ts`, `toolbarState.test.ts`.
