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

- **Opening:** **All tools** replaces the short bar with the ribbon (`src/app/tools/Ribbon.tsx`, shown inside the same pill); **Short bar** returns. It opens on the tab that matches the set showing (Write → Home, Draw → Draw, Read → View) and follows the set when it changes. The ribbon being open is not saved (the app starts on the short bar).
- **Tabs:** File, Home, Insert, Draw, View, Review, each with named groups (`TAB_GROUPS` in `toolRegistry.ts`; a tool belongs to one tab and may also show in another group, e.g. Font in Home and View). File = Save & restore, Share, Print / PDF (coming), Anki import, Lock page and notebook (coming), Settings. Home = clipboard (copy as plain text and as Markdown, paste as plain text, copy page with pictures), text style, colours, paragraph, Revise marks, undo and redo. Insert = picture, audio (coming), file (coming), table (coming), database, callout, divider, link, link to a page, templates, mind map (coming), recall card, summary. Draw = Ball pen, Fountain pen, Marker, Brush, Pencil, highlighter, eraser, lasso, shapes, ink style controls, paper, "only the Pencil draws" (all coming until the drawing batch). View = Reading mode and line focus (coming), Calendar, Databases, All cards, Font and Text size (coming), Theme, Zoom (coming), Tool bar on or off, Keep tools open. Review = make cards, Study now, Due today, All cards, Summary, Card stats.
- **Two behaviours, in plain words:** _Tools close after use_ (the default): a tap on a tab shows its tools (the same tab again hides them); they close after a tool is used, on a tap outside, or Esc (focus stays on the tab). _Tools stay open_: they never close by themselves. The button names the current behaviour and is pressed when they stay open. **Ctrl/Cmd+F1** switches (it opens the ribbon first if needed) and says which one is on in a message; the choice is saved per device.
- **Accessibility:** `tablist` named "Tool tabs", tabs with `aria-selected`, `aria-controls` and a roving tab stop; ← → move (wrapping), Home and End jump, Enter or Space opens; the tools are a `tabpanel` labelled by its tab, with each group named. 44 px targets, text under every icon, contrast AA in the three themes.
- **Customising:** Edit bar › "Ribbon tabs to show" hides tabs (one always stays); any tool can be pinned to the short bar from Edit bar (grouped by tab) or from the control panel.
- **Phone:** the same layout: tabs scroll sideways, the groups scroll sideways, and the behaviour, search and Short bar buttons sit on a second row.

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
