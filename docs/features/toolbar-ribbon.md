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
- Browser: `e2e/toolBar.spec.ts`, `controlPanel.spec.ts`, `devicePicker.spec.ts`, `sidebarQuick.spec.ts`.
