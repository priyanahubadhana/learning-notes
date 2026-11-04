# Short bar and ribbon

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Research: [docs/research/toolbar-ribbon.md](../research/toolbar-ribbon.md).

## Purpose

One calm bar for the tools you use most, a place for every other tool, and a search over everything. Built in batch 2d: step 1 (short bar, tool sets, control panel, device picker, sidebar), step 2 (the full ribbon). Control panel: [control-panel.md](control-panel.md). Device modes and the picker: [device-modes.md](device-modes.md).

## How it works (step 1)

- **One list of features:** `src/app/tools/toolRegistry.ts` (id, icon, tab, group, shortcut, "coming" reason, how to run). The short bar, the control panel and (step 2) the ribbon all read it and run tools through `runTool`. Names are `tool.<id>`, tabs `ribbon.tab.<id>`, groups `ribbon.group.<id>` in `i18n/en.ts`.
- **Running a tool:** `toolRuntime.ts` holds what a tool needs: the app's actions (registered by `App.tsx`: open Settings, Save & restore, Calendar, Review …), the open page's editor (registered by `PageEditor`), and the bar's trays. Editing tools (`editorCommands.ts`) act on the editor; with no open page they say "Open a page first."
- **Sets:** Write, Draw, Read (`toolbarState.ts`). Details in [device-modes.md](device-modes.md). The short bar (`src/editor/DockedBar.tsx`, `SetSwitch.tsx`, `ToolButton.tsx`) shows the tools of the set showing; ids that no longer exist are skipped but stay saved.
- **Icons:** `lucide-react` 1.60.0 (ISC licence). Each icon used is imported by name in `src/app/tools/icons.tsx` so the build bundles only those (checked: the build has no other Lucide icon). `npm audit` found nothing new. If it ever fails a check, replace the file's imports with inline SVGs.
- **Look:** see device-modes.md. Colours are the theme tokens, so Day, Night and Sepia follow; active states use an extra mark besides colour.
- **Draw and Read tools** wait for drawing (batch 6) and Reading mode (batch 3). They are in place so the layout, Edit bar and search are final.

## The full ribbon (step 2)

- **Opening:** **All tools** replaces the short bar with the ribbon (`src/app/tools/Ribbon.tsx`, shown inside the same pill); **Short bar** returns. It opens on the tab that matches the set showing (Write → Home, Draw → Draw, Read → View) and follows the set when it changes. Since batch 2e whether the ribbon shows is saved per device (Settings › Tool bar › Tool bar layout), so the app starts the way it was left; the open tab is not saved.
- **Tabs:** File, Home, Insert, Draw, View, Review, each with named groups (`TAB_GROUPS` in `toolRegistry.ts`; a tool belongs to one tab and may also show in another group, e.g. Font in Home and View). File = Save & restore, Share, Print / PDF (coming), Anki import, Lock page and notebook (coming), Settings. Home (Google Docs order, batch 2e) = Undo and redo · Text style (headings, quote) · Font and size · Format (B I U S, Code) · Colors · Lists and alignment (lists, checklist, alignment, indent, ↵ New line) · More formatting (More, Make blank) · **Copy & paste** (one button at the end, see below). The old Clipboard group at the front is gone. Insert = picture, audio (coming), file (coming), table (coming), database, callout, divider, link, link to a page, templates, mind map (coming), recall card, summary. Draw = Ball pen, Fountain pen, Marker, Brush, Pencil, highlighter, eraser, lasso, shapes, ink style controls, paper, "only the Pencil draws" (all coming until the drawing batch). View = Reading mode and line focus (coming), Calendar, Databases, All cards, Font and Text size (coming), Theme, Zoom (coming), Tool bar on or off, Keep tools open. Review = make cards, Study now, Due today, All cards, Summary, Card stats.
- **Two behaviours, in plain words:** _Tools close after use_ (the default): a tap on a tab shows its tools (the same tab again hides them); they close after a tool is used, on a tap outside, or Esc (focus stays on the tab). _Tools stay open_: they never close by themselves. Since batch 2e the button is an icon-only pin (name for screen readers, tooltip with the shortcut, pressed when tools stay open), so it takes no room. **Ctrl/Cmd+F1** switches (it opens the ribbon first if needed) and says which one is on in a message; the choice is saved per device.
- **Accessibility:** `tablist` named "Tool tabs", tabs with `aria-selected`, `aria-controls` and a roving tab stop; ← → move (wrapping), Home and End jump, Enter or Space opens; the tools are a `tabpanel` labelled by its tab, with each group named. 44 px targets, text under every icon, contrast AA in the three themes.
- **Customising:** Edit bar › "Ribbon tabs to show" hides tabs (one always stays); any tool can be pinned to the short bar from Edit bar (grouped by tab) or from the control panel.
- **Phone and narrow bars:** the same layout: when the tabs and the buttons do not fit side by side, the buttons wrap under the tabs (a flex-wrap row, no fixed breakpoint). The tab strip and the groups scroll sideways with a fade at the edge that has more, and a scroll comes to rest on a whole group (scroll snap), so no label is half cut.

## Edge cases

- A kept set (pin) ignores pen and typing; the tap on the switch always works.
- Several tools open the same screen (Share, Anki import and Save & restore all open Save & restore).
- Table, Audio, File, Mind map, Print / PDF and Lock are listed as "coming": the editor has no table or file block yet, and the others are later batches.

## Security check

- Only device preferences are stored (set pin, tool lists, favourites, device choice); every stored list is validated when read (`isPinnedList`, `isIdList`, `isDeviceKind`). No data leaves the device.
- New dependency `lucide-react` (pinned exactly, 2 weeks old): ISC licence, no dependencies of its own, `sideEffects: false`, audit unchanged.
- Deletes: none.

## Tests

- Unit: `toolRegistry.test.ts`, `toolbarState.test.ts`, `controlRows.test.ts`, `deviceKind.test.ts`, `favourites.test.ts`, `calendarEntries.test.ts`.
- Browser: `e2e/toolBar.spec.ts`, `controlPanel.spec.ts`, `devicePicker.spec.ts`, `sidebarQuick.spec.ts`, `toolRibbon.spec.ts` (six tabs and their tools, both behaviours, Ctrl+F1, keyboard navigation, tools run, hidden tabs, pin from Edit bar, contrast and 44 px in three themes, phone width).

## Batch 2e: pop-ups, positions, floating bar, Slim ribbon, tool bar off

### The pop-up rule (design rule for every pop-up, menu and tray)

A pop-up stays open only until the user **chooses something**, OR **taps or clicks anywhere outside it**, OR **switches ribbon tab or opens another pop-up**, OR **presses Esc**, OR **navigates or scrolls the page**. Only one is open at a time, and each has a visible **✕ "Close"** (44 px) in its top corner. One shared hook enforces it: `usePopup` in `src/app/popups.ts`. Every current and future pop-up calls it while it is open (More, Edit bar, the colour picker, the ⋯ Toolbar menu, the ribbon's "Tools close after use" panel, the theme list, Copy & paste, Ribbon options, the page ⋯ menu and the sidebar + menus via `MenuPopover`, the path lists). Details: a press on the pop-up's own button (marked `data-popup-trigger`) is not an outside tap, so the button can toggle it; opening a pop-up closes the others at once; a scroll in the first 400 ms is the page settling and is ignored, as is a scroll inside the pop-up; Esc answers only the newest pop-up and can give the focus back. `AnchoredMenu` (`src/app/tools/`) is the ready-made menu under a button (drawn on the page body so a scrolling ribbon never clips it); `PopupClose.tsx` is the ✕. "Tools stay open" is the one deliberate exception: those tools never close by themselves.

### Tool bar off is never silent and never a dead end

- Turning it off (page ⋯ menu › Hide tool bar, the View › "Tool bar on or off" tool, or Settings) first asks, says "To turn it back on: page ⋯ menu › Show tool bar, or Settings › Tool bar" and offers **Cancel** (the default) and **Turn off**; afterwards a message offers **Undo**. "Off" is still the placement value `floating` (no bar, only the toolbar over selected text); the bar comes back where it was (`toolbar.lastPlacement`).
- While it is off a small **Show tool bar** button stays in the top bar (always on Touch and Pencil; on Computer once the user turned it off). Code: `src/app/tools/toolbarVisibility.ts`.
- **Settings › Tool bar** (category order 70) has: Show tool bar, Tool bar layout (short bar or ribbon), Ribbon tools (close after use or stay open), Ribbon display, Ribbon size, Ribbon position, Tool sets (opens Edit bar on the open page), Device mode, Formatting bar position, Bar size, Auto switch, and **Reset tool bar** (standard tools, tabs, positions; notes untouched). The Settings and control-panel search find them by "tool bar", "toolbar", "ribbon", "bar" (a setting can carry English `keywords`). The values live in the bar's own state; these settings are `derived` device settings (read and written through the bar's functions) in `src/settings/toolbarSettings.ts`.

### Positions

- **Short bar position** (Settings › Formatting bar position, Edit bar › Position): Top, Bottom or Floating. The older value `floating` now only means Off (relabelled "Off", not offered in the lists; Show tool bar turns the bar off).
- **Ribbon position** is chosen separately: Same as short bar (default), Top, Bottom or Floating. Each is remembered per device and has Reset.
- **Stacking, never overlapping** (`src/app/tools/barLayout.ts`, `src/editor/BarStack.tsx`): bars on the same place share one stack (the ribbon above the short bar). Top: sticky under the top bar (shares `--dock-top`); Bottom: fixed above the keyboard (shares `--dock-bottom`, the page leaves that room); both Floating: one stack with one handle, placed by the short bar's saved place.

### Ribbon display and size

- **Ribbon replaces short bar** (default) or **Ribbon + short bar** (both at once, the short bar keeps its full tool set; its "All tools" button hides while the ribbon shows). Chosen from the ribbon's ⋯ **Ribbon options** menu (show, size, position, Reset) and Settings › Tool bar.
- **Full** (icon + name, less padding than before) or **Slim**: one row of icons only (the Office Simplified Ribbon idea): the tabs, then the current tab's tools as icons with the names in the tooltip and as accessible labels (iPad has no long-press tooltip; logged), then search, options and Short bar as icons. Slim always shows the tools, so the pin is hidden there. All six tabs fit at 820 px with the sidebar open or closed; when the row cannot hold everything it wraps.

### The floating bar (Floating position)

A bar that floats over the page: it appears at once, centred just above the bottom edge, and is **always clamped into the visible screen** (visual viewport: keyboard, zoom, safe areas), re-placed on resize, rotation, keyboard and scroll. Its place is saved as a fraction of the room it has (so rotation keeps the same relative spot) and an invalid saved place reads as the default. The **⠿ handle** drags it with a pen, finger or mouse (pointer events with capture, `touch-action: none`), the arrow keys move it (Shift = bigger steps), it snaps gently to an edge within 24 px, a double-tap on the handle resets the place, and the ⋯ Toolbar menu has **Reset bar position**. Choosing Floating shows a tip with an arrow: "This bar now floats. Drag ⠿ to move it." (gone on a tap, Esc or after 12 s). A floating bar never auto-hides. Trays open up or down, whichever side has room. Code: `freeBar.ts` (place maths, saved place), `BarStack.tsx`.

### Theme list, Copy & paste, New line

- **Theme:** the Theme button still cycles in one tap; a small ▾ beside it (ribbon View › Look, short bar Read set) opens a list (Day, Night, Sepia) with a preview swatch and a tick on the current one. The sidebar already shows all three themes as buttons, so it has no extra arrow.
- **Copy & paste ▾** is one button at the end of Home that opens a menu: Copy as plain text, Copy as Markdown, Copy page with pictures, Paste as plain text. The four tools keep their own rows in the control panel but are not drawn on the ribbon (`inRibbon: false`).
- **↵ New line** can be tapped again and again: the cursor goes to the new empty line, the bar and the button keep their place (the sticky bar follows the visible screen when the keyboard pans it; the new line is scrolled into view without moving the bar), and tools marked `repeat` (New line, Undo, Redo) do not close the ribbon's tools. New line is back in the default Write set, at the end.

### Tests (batch 2e)

Unit: `popups.test.ts`, `barLayout.test.ts`, `freeBar.test.ts`, `toolbarSettings.test.ts` (off, Cancel, Undo, Settings section, search), `dragSelect.test.ts`, `pathStyle.test.ts`, `fullFile.test.ts` (path styles in a backup). Browser: `popups.spec.ts`, `toolBarOff.spec.ts`, `ribbonLayout.spec.ts` (fit at 768, 820, 1024, 1366 with the sidebar open and closed, fade, sticky, compact, Slim, both bars, all nine position pairs without overlap), `floatingBar.spec.ts` (820×1180 and 1180×820, keyboard by a short window, drag, snap, reload, off-screen reset), `newLine.spec.ts`, `penSelect.spec.ts`, `sidebarGroups.spec.ts`, `pathStyle.spec.ts`.
