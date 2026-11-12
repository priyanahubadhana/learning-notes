# System layer v2 (slice 17, flag `system.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: the small things that appear everywhere become one calm family. Toasts stack up to 3 and each Undo keeps working. Empty lists and errors look the same everywhere and say what to do. Professional gets a Command palette (Ctrl+K) and editable shortcuts. In-app reminders appear on Home and under a bell. After an update, one "What's new" card. Finally, every screen gets a phone pass.

Sources: audit batch 6 (Y1, Y2, Y4 to Y11, A12, A20 to A22, D17, D18); build plan 2.3 row 6 and 3.4 row 17; Running principle 2. The update flow itself is [update-v2](update-v2.md); this slice only adds the "What's new" card and puts the update pill in the pill stack.

## When I do X → Y (each line = one e2e test)

Beginner:

- **Y-T1** When I do two undoable things quickly → two toasts stack (newest at the bottom); each Undo undoes its own action.
- **Y-T2** When a fourth toast comes → the oldest leaves; its action is still in the Undo history.
- **Y-T3** When the keyboard is open → toasts sit above it and above every bar; a toast never covers a dialog title.
- **Y-T4** When I hover or touch a toast → it stays; it leaves 1.5 s after I let go.
- **Y-E1** When a list is empty → I see one line saying what goes here and one button that adds the first item (the shared Empty state, all 44 places).
- **Y-E2** When something fails → I see what happened in plain words and "Try again"; my work is not lost.
- **Y-E3** When a whole screen fails → "This page could not be shown" with "Try again", "Home" and "Save all".
- **Y-K1** When I press "?" with no text field active → the Shortcuts sheet opens, grouped by task; typing filters it; Print works.
- **Y-K2** When I press Ctrl/⌘+Shift+K → Search opens on the Features chip (as today).
- **Y-R1** When I add a reminder to a task or page ("Remind me" → time) → at that time, while the app is open, a toast and a dot on the bell show it; Home's "Pending items" lists it.
- **Y-R2** When I open the app after a reminder time passed → the bell shows the count and the list says "Missed: 9:00".
- **Y-W1** When the app has updated → one "What's new" card appears once (3 lines max, "Got it" and ✕); it never shows again for that version.
- **Y-P1** When several pills show (sync, update, timer, now playing, recording) → they stack in the bottom corner without overlapping.
- **Y-B1** When an alert Banner offers "Open backups" or "Manage storage" → it opens Settings › Save & restore (today it opens a missing category).
- **Y-N1** When I tap "Not saved yet · Try again" → it really retries and shows "Saved" (the save notice).
- **Y-Q1** When I open the quiet corner menu → Settings, Save & restore, Trash, Device mode, Layer gallery, Refresh app, Help, Theme are there.
- **Y-D1** When I first open the app → one welcome flow (the approved Settings first-launch flow) including "Which device is this?"; not two.
- **Y-M1** When I open any surface on a phone (390 px) → it is full width, reachable with one thumb, the tab bar stays visible unless it is a Tool frame, and no row scrolls the page sideways.

Professional (unlock ids; "new" = proposed for `docs/mockups/pro-features.md`):

- **Y-K3** (`system.palette`, new) When I press Ctrl/⌘+K → the Command palette opens (Command list part): actions, pages and settings; favourites and recent on top; Enter runs the top result; Esc closes.
- **Y-K4** (`system.editKeys`, new) In the Shortcuts sheet → "Change" on a row records a new key; a clash is named; presets "Default", "Like Notion", "Like OneNote"; Reset with Undo.
- **Y-T5** (`system.toastPlace`, new) Settings › Toasts → position (bottom centre / bottom left) and "Fewer toasts".
- **Y-E4** (`system.errorDetails`, new) On an error → "Copy details" copies a plain report (no note text).
- **Y-U1** (`about.version`) Settings › About → version, check now, last check.
- **Y-D2** (`device.picker`) "Choose this device again" re-opens the device question; per-device layouts.
- **Y-L1** (`advanced.pencilLab`) Pencil lab opens from Settings › Advanced (as today).
- **Y-C1** (`device.controlPanel`) the Shift+K shortcut stays switchable.

## Shared parts used (plan 3.2 row 0g)

Toast queue (final), Empty state (final), Dialog set (alert added), Banner, Status pill stack (final), Command list (palette), Sheet (Shortcuts), Arrange sheet (quiet corner "+"), Overlay manager, Event router (keys).

## Sizes, spacing, motion

- Toast: max 420 px, min 48 px tall, radius 14 px, 12 px gap between stacked toasts, 16 px from the bottom bar / keyboard; kinds done / undo / problem by icon (Lucide 1.6), never by red fill.
- Empty state: drawing 96 px, line 15 px, button 44 px, centred, 24 px gaps.
- Palette: 560 px wide (full width on phone), input 48 px, rows 44 px, group labels 12.5 px semibold.
- Pill stack: pills 36 px tall (44 px target), 8 px gap, 16 px from the edge.
- Motion: toast rises 8 px and fades in 200 ms, leaves 130 ms; stack reflows 200 ms; palette as a card (200 / 130 ms); reduced motion = instant.

## States

- Empty: palette with no match "No results. Try other words."; reminders "No reminders".
- Error: Y-E2, Y-E3.
- Offline: palette and shortcuts work; reminders work while the app is open.
- Phone: Y-M1; Shortcuts sheet at the bottom; palette from the top.
- Dark: tokens only.

## Nothing lost

| Today's feature                                                                     | Where today (`src/`)                                                                                              | New home                       |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Toast with one action, hold to keep                                                 | `app/ui.tsx:401-471`, `App.tsx:851-899`                                                                           | Toast queue (Y-T1 to Y-T4)     |
| Toast timing by length, above keyboard                                              | `app/toastTiming.ts:1-23`                                                                                         | unchanged rules                |
| "Trashed" toast with Undo                                                           | `App.tsx:552`                                                                                                     | undo kind                      |
| Confirm, name, choice dialogs; NameSheet                                            | `app/ui.tsx:486,546,635`, `app/NameSheet.tsx:15`                                                                  | Dialog set                     |
| Empty state part and its 10 users (+34 inline)                                      | `app/ui.tsx:142`, users e.g. `search/SearchScreen.tsx:359`                                                        | Empty state (Y-E1)             |
| Error screen: Home, Save all                                                        | `app/ErrorBoundary.tsx:27-102`                                                                                    | Y-E3                           |
| Shortcut labels; shortcuts in the tool registry                                     | `app/keys.ts:2-19`, `app/tools/toolRegistry.ts:214-674`                                                           | Shortcuts sheet (Y-K1, Y-K4)   |
| Control panel = Search Features chip (Shift+K)                                      | `App.tsx:1216,1278`, `search/SearchPopup.tsx:34-129`                                                              | Y-K2; palette for Professional |
| Control panel entries (ribbon, bar, page, device)                                   | `app/tools/Ribbon.tsx:321`, `editor/DockedBar.tsx:388`, `pages/PageView.tsx:357`, `settings/DeviceSection.tsx:69` | kept, open palette or Search   |
| First-use tips (12 s), Help tips                                                    | `help/FirstUseTip.tsx:8-22`, `help/Help.tsx:44,249`                                                               | pop-up tips, unchanged         |
| Quiet corner menu                                                                   | `app/spaces/QuietCorner.tsx:96-190`                                                                               | Y-Q1                           |
| Save failed notice                                                                  | `app/SaveNotice.tsx:9-17`                                                                                         | Y-N1 (Banner)                  |
| Settings-changed notice                                                             | `settings/settingsNotice.tsx:11-13`                                                                               | Banner                         |
| Pencil offer                                                                        | `settings/PencilOffer.tsx:9`, `deviceModeSettings.ts:288`                                                         | Dialog set                     |
| Bar overflow hint; tool error fallback                                              | `app/tools/BarScroll.tsx:27-111`, `ToolsBoundary.tsx:28`                                                          | unchanged, error family text   |
| Attention banners (Drive, sign in, sync, backups, update, storage, set up, dismiss) | `app/attention/AttentionBanner.tsx:24-196`, `attentionSignals.ts:8-76`                                            | Banner; Y-B1 fix               |
| Welcome wizard; first-launch decision                                               | `onboarding/Welcome.tsx:83-163`, `onboardingState.ts`                                                             | Y-D1                           |
| "Which device is this?", Device-mode menu                                           | `app/tools/DevicePicker.tsx:32-109`, `app/DeviceModeMenu.tsx`                                                     | Y-D1, Y-D2                     |
| Timer chip and card                                                                 | `home/TimerChip.tsx:38`, `home/TimerCard.tsx:25`                                                                  | pill stack                     |
| Backup reminder bar                                                                 | `share/ReminderBar.tsx:8`                                                                                         | [safety-v2](safety-v2.md) SF16 |
| About version, device version                                                       | `settings/AboutSection.tsx:30`, `settings/DeviceSection.tsx:50`                                                   | Y-U1                           |
| Pencil lab                                                                          | `app/lab/PencilLab.tsx:34`                                                                                        | Y-L1                           |

## Won't do

- Push or phone notifications (need the native apps); reminders only while the app is open.
- A feedback form that sends data without consent.
- Any server or Supabase change.

## Sub-slices (one commit each)

1. **17a toasts + pill stack** (Y1, D17 pill): `src/app/ui.tsx` (toast), `src/app/toastTiming.ts`, `src/App.tsx` (toast state only), `src/app/overlay/pillStack.tsx` (new). Y-T1 to Y-T5, Y-P1.
2. **17b empty and error family** (Y4, Y5, Y9): `src/app/ui.tsx` (EmptyState), `src/app/ErrorBoundary.tsx`, `src/app/tools/ToolsBoundary.tsx`, the 34 inline empty states (one commit per area if large). Y-E1 to Y-E4.
3. **17c notices + banners** (Y8, D18): `src/app/SaveNotice.tsx`, `src/settings/settingsNotice.tsx`, `src/settings/PencilOffer.tsx`, `src/app/attention/AttentionBanner.tsx`. Y-B1, Y-N1.
4. **17d shortcuts + palette** (Y6): `src/app/keys.ts`, `src/app/shortcuts/ShortcutsSheet.tsx` (new), `src/app/palette/CommandPalette.tsx` (new). Y-K1 to Y-K4, Y-C1.
5. **17e reminders + What's new** (Y11, D17): `src/home/reminders.ts` (new), bell in the shell, `src/app/WhatsNew.tsx` (new). Y-R1, Y-R2, Y-W1.
6. **17f first run + quiet corner** (A12, A20, A21, A22, Y7): `src/onboarding/*`, `src/app/tools/DevicePicker.tsx`, `src/app/spaces/QuietCorner.tsx`. Y-Q1, Y-D1, Y-D2, Y-L1.
7. **17g phone pass** (Y10): screenshot fixes across slices 1 to 16, only layout CSS. Y-M1.

## Tests

- Unit: toast queue (3 max, each Undo bound to its action); shortcut clash detection; reminder due times in UTC; What's new once per version.
- e2e (Chromium + `ipad-webkit`): every line above; flag off = today.
- Screenshots: toasts stacked, palette, Shortcuts sheet, empty and error family × light / dark × iPad / phone / PC; phone pass of every surface.
- Accessibility: toasts `status` / `alert` by kind; palette combobox pattern.

## Owner iPad check (3 steps)

1. Turn on `system.v2`; delete two things quickly: two toasts stack and each Undo brings back its own item.
2. With a keyboard, press "?": the Shortcuts sheet opens; in Professional press ⌘K and run "New page".
3. Add a reminder for 1 minute ahead to a task: the toast and the bell show it; open an empty notebook to see the empty state.

## Decisions to review

- **Reminders are new** (Y11 said none exist). Stored as an optional field on tasks and pages (adds a field only, no rename), shown only while the app is open.
- **Bell location:** in the shell top bar, next to the sync dot. This is the one possibly new visual item; it uses the existing icon button, so no mock-up is needed.
- **Command palette and Search Features chip** both stay: Beginner keeps Shift+K Search; Professional adds Ctrl+K.
- **Shortcut count:** the audit says 70, the tool registry holds 16 `shortcut:` entries; the rest are in editor and screen handlers. 17d first builds one list of all of them (a haiku inventory) before the sheet.
- New unlock ids proposed: `system.palette`, `system.editKeys`, `system.toastPlace`, `system.errorDetails`.
