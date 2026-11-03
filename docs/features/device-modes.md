# Device modes and the formatting bar

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One app for a computer, a finger on an iPad and an Apple Pencil. A device mode (Computer, Touch or Pencil) picks where the formatting bar sits, how big its buttons are and which hints show. It is saved per device, never with the notes.

## How it works

- **Modes** (`src/app/deviceMode.ts`, presets in `MODE_PRESETS`):

| Mode     | Bar placement               | Button size     | Hover tips | Shortcut hints | Auto-hide |
| -------- | --------------------------- | --------------- | ---------- | -------------- | --------- |
| Computer | Floating over the selection | Compact (36 px) | On         | On             | Off       |
| Touch    | Docked under the top bar    | Normal (44 px)  | Off        | Off            | Off       |
| Pencil   | Docked at the bottom        | Large (54 px)   | Off        | Off            | Off       |

- **First run:** `initDeviceMode()` (`src/settings/deviceModeSettings.ts`, called from `main.tsx`) picks Computer for a fine pointer with hover, Touch for a coarse pointer, else Computer. It never picks Pencil. When a pen touches the screen for the first time and the mode is not Pencil, a small message offers Pencil mode once (`useOfferPencilMode`); nothing changes unless it is tapped.
- **Switching:** Settings › General › Device mode, or the page ⋯ menu (Switch to … mode). Both call `applyDeviceMode`, which writes the mode and the five presets.
- **Advanced:** Settings › Advanced has each preset value as its own device setting (bar position, bar size, button tips, shortcut hints, hide when idle). Changing one leaves the mode name as it is. Touch and Pencil never go under 44 px buttons (`barButtonPx`), even with Compact.
- **Hardware keyboard:** a key press a screen keyboard cannot make (Ctrl/Cmd/Alt shortcuts, arrows, Tab, Esc, function keys) turns shortcut hints on for the rest of the visit, even in Touch mode (`watchHardwareKeyboard`).
- **Docked bar** (`src/editor/DockedBar.tsx`, `barActions.tsx`): text style menu, then the pinned buttons (default Bold, Italic, Underline, Key point, Make card, ↵ New line), then More and Done. Top: sticky under the top bar, in the page flow, so it never covers text. Bottom: fixed, lifted above the on-screen keyboard through `visualViewport`, with the safe-area inset, and the page gets space under the last line. Buttons keep the editor's selection and keyboard (the mouse-down is cancelled).
- **More** lists every button not on the bar: Strike, Code, the other marks (Keyword, Must know, Formula and any added label), Make blank, alignment, Colors, Nest and Unnest block, Create link, the picture buttons (caption, replace, rename, download, preview, delete) and Edit bar. Names come from BlockNote's own texts, so they match the floating toolbar and follow the language.
- **Edit bar:** tick or untick each button, move it with the ↑ ↓ buttons or by dragging the ⠿ handle, set size, position and auto-hide, or Reset (the default buttons and the current mode's presets). The button list is stored per device (`learning-notes:formatBar.pinned`) and checked when read.
- **Done** and a tap on empty page space collapse the selection and leave the editor (the keyboard goes away).
- **↵ New line** adds an empty paragraph after the block with the cursor and moves there. The tap area under the last block adds an empty last paragraph, or only focuses the last one when it is already empty (`src/editor/lineActions.ts`). The tap area shows in Touch and Pencil.
- **Auto-hide** (off in every preset) hides the docked bar while the editor has no focus, nothing is selected and no tray is open; the space is kept so the page does not jump.

## Edge cases

- A stored mode or setting that is not valid reads as its default; invalid values are never saved.
- A saved button that no longer exists (a deleted Revise label) is left out of the bar but stays in the saved list.
- Read-only pages (open in another window) show no bar and no tap area.
- Hover tips and shortcut hints apply to the docked bar. The Computer floating toolbar keeps BlockNote's own tips.
- When the sticky chips of a long lesson page and the docked bar are both at the top, the bar is drawn over the chips (known, see DECISIONS).

## Security check

- Validated: mode, placement, size and on/off values (`isDeviceMode`, `isBarPlacement`, `isBarSize`, `isOnOff`), and the button list (`isPinnedList`: at most 40 plain ids, unique).
- Data leaving the device: none. Nothing is saved with the notes.
- Deletes: none. Reset only rewrites device preferences.

## Tests

- Unit: `src/app/deviceMode.test.ts` (presets, detection, size, validation, pin, unpin, reorder, keyboard keys), `src/editor/lineActions.test.ts` (New line, tap below), `src/settings/settings.test.ts` (mode switching writes presets, invalid values).
- Browser: `e2e/deviceModes.spec.ts` (Touch bar at 820×1180, More has every old action, Edit bar pin/reorder/drag/reset after reload, Done and tap-away, New line and tap below, hints with a keyboard, Pencil offer, switching from ⋯ and from Settings, Computer unchanged, screenshots in Day, Night, Sepia at 390×844 and 820×1180), `e2e/touchTargets.spec.ts`.
