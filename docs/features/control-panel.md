# Control panel (search every feature)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One search box over every feature and setting of the app, so nothing is hard to find. It also pins any tool to the short bar. Built in batch 2d (step 1).

## How it works

- **Opening it:** Ctrl/Cmd+Shift+K, the search icon on the short bar, the page ⋯ menu (_Search all features…_), and Settings (_This device_ box). **Ctrl/Cmd+K is not used for it:** it already opens the page search (and BlockNote's link shortcut would clash with it), so the panel takes Ctrl/Cmd+Shift+K (logged in DECISIONS).
- **The list** is a plain filter over two static lists, nothing is indexed or fetched:
  - `src/app/tools/toolRegistry.ts`: every tool (File, Home, Insert, Draw, View, Review, and "Go to"), one line each. **A new feature adds one line there** plus its name `tool.<id>` in `i18n/en.ts` (and hi7, es7).
  - the settings registry (`settings/builtinSettings.ts`): every setting appears automatically.
- **Rows** (`controlRows.ts`) are grouped like the ribbon tabs, then Settings. Each row shows its icon, name, where it lives (_Home › Clipboard_, _Settings › Advanced_), its shortcut and a **Pin to bar** button. A tool that is not built yet is dimmed and says why.
- **Search:** every typed word must appear in the row's name, its place, or its English name (so English words work in any language). Up to 80 rows show; a line says "Showing the first 80" when more match.
- **Running a row:** the panel closes, then the tool runs (`runTool`). A setting opens Settings at that setting, highlighted. An editing tool with no open page says "Open a page first."
- **Pin to bar** adds the tool to the end of the tool set that is showing (Write, Draw or Read); pressed again it removes it. Settings cannot be pinned.
- **Keyboard and screen reader:** a modal dialog with a name; the search box has focus first; ↓ ↑ move between rows (↑ from the first returns to the box); Enter in the box runs the first match; Tab moves from a row to its Pin button; focus stays inside; Esc closes and returns focus to where it was. A live line says "N results" or "Nothing found."

## Edge cases

- Ids saved on the bar that no longer exist are left out; Revise marks (`mark:<label>`) are listed with their current names.
- A tool needing the bar's trays (Colors, More, Link) says "Turn on the tool bar first" when the floating toolbar is used.

## Security check

- Only local lists are read; no text typed is sent anywhere. Pinned ids are validated like all bar lists (`isPinnedList`).
- Deletes: none.

## Tests

- Unit: `src/app/tools/toolRegistry.test.ts`, `controlRows.test.ts`, `toolbarState.test.ts`.
- Browser: `e2e/controlPanel.spec.ts` (open by key, bar icon, page menu and Settings; every group; search by name, place and English; run a tool and a setting; "coming" message; arrows, Tab, Esc and focus; pin and unpin on the set showing).
