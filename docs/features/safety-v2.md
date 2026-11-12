# Safety and data v2 (slice 16, flag `safety.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: you can always get your work back, and you always know if it is safe. One Trash for everything, emptied after 30 days (you can change that). A simple History list by day. One Share / Export sheet. When two devices change the same thing, both versions are kept and a small notice tells you. Tapping the sync dot shows one status card. The privacy lock is set up the same way everywhere.

Sources: audit batch 5 (D1 to D14, D16, S9, A23); build plan 2.3 row 5 and 3.4 row 16; Running principle 2. Lock code rules come from [security-m1](security-m1.md); this slice only redesigns the screens.

## When I do X → Y (each line = one e2e test)

Beginner:

- **SF1** When I open History → copies are grouped by day, newest first; tapping one previews it without changing my page.
- **SF2** When I tap "Restore this version" → the page becomes that copy, the state before is saved as a new copy, and a toast offers Undo.
- **SF3** When I delete a page, notebook, database or card → it goes to Trash and a toast offers Undo.
- **SF4** When I open Trash → every item shows its type, "Deleted 3 days ago" and visible Restore and Delete forever buttons (no hover needed).
- **SF5** When I tap Delete forever → a danger dialog names the item; only this dialog in the app uses a red button.
- **SF6** When an item has been in Trash for 30 days → it is removed the next time the app opens; Trash says "Items are removed after 30 days".
- **SF7** When I tap Share / Export on a page or notebook → one Sheet opens: What (page, notebook, selection) → format tiles (PDF, Word, Print) → Export; I see a preview of the first page before the file is made.
- **SF8** When I tap "Back up now" → a full backup file is saved and "Last backup: just now" shows.
- **SF9** When I tap Restore and pick a file → I choose "Add as copies" or "Replace my notes"; Replace makes a safety copy first; Undo is offered.
- **SF10** When I go offline → the sync dot turns grey; its card says "Offline, saved on this device"; when I come back it syncs without asking.
- **SF11** When I tap the sync dot → one card shows: "All saved" (or the problem in plain words), last sync time, what is waiting, and "Sync now".
- **SF12** When two devices changed the same text → both versions are kept, a Banner says "This page was changed on two devices. Both versions are kept.", and "Compare" opens a Before / after view.
- **SF13** When I am signed out on a device → notes are readable; editing shows one Banner with "Sign in"; Save & restore follows the same rule (Restore and imports are off until I sign in).
- **SF14** When I set a lock password → the rule (at least 8 characters; PIN 6 digits) shows before I type (from [security-m1](security-m1.md)).
- **SF15** When I lock a notebook from its menu → it shows the lock screen next time; Settings › Lock lists it.
- **SF16** When it has been 7 days without a backup → the backup Banner offers "Save backup now" and "Later" (90 days).
- **SF17** When I sign in → a 3-step flow (way to sign in → code or password → unlock key) with the step strip; the password rule is shown before typing.
- **SF18** When Claude asks to connect → the consent page lists what it can do, with Allow and Deny.

Professional (unlock ids; "new" = proposed for `docs/mockups/pro-features.md`):

- **SF19** (`safety.historyCompare`, new) When I open a copy → a Before / after view marks changes; "Copy from this version" copies a part.
- **SF20** (`safety.namedVersions`, new) When I name a copy → it is kept forever and shows with ★ at the top.
- **SF21** (`safety.trashTools`, new) In Trash → filter by type, select several, Restore or Delete forever in bulk; Settings › Trash: 30 / 60 / 90 days / never.
- **SF22** (`safety.exportMore`, new) In the Export sheet → Markdown, Text, Paper PDF, include sub-pages, and presets ("PDF for printing") with ★.
- **SF23** (`safety.backupMore`, new) In Save & restore → backup password, notes-only backup, journal / templates switches, Notion, NotebookLM and Anki imports, sample notebook.
- **SF24** (`sync.group.*`) In the sync card "⋯" → What syncs per group, reset this device with Undo, Reconnect Drive (`sync.reconnectDrive`).
- **SF25** (`safety.conflictChoice`, new) When I open Compare → per change: Keep mine, Use other, Keep both; the copy not kept goes to History.
- **SF26** (`lock.methods`, `lock.removeAll`) In Settings › Lock → the list of locked items and Remove all locks (asks first).
- **SF27** (`account.signOutAll`, `account.computers`, `account.signOutForget`) Account: devices, sign out everywhere, sign out and forget the key.

## Shared parts used (plan 3.2 row 0g)

Sheet, Dialog set (danger kind), Toast queue, Banner, Before / after view, Wizard steps (sign-in, restore, imports), Tool frame (imports), Status pill stack (sync dot), Empty state, Context menu strip (Trash rows), Tab row, ✕ field.

## Sizes, spacing, motion

- Sheet: 376 px wide docked right (iPad landscape, PC), bottom sheet on phone and iPad portrait (max 90% height), radius 20 px, 16 px padding.
- Format tiles 104 × 96 px, 12 px gap; selected = accent tint + 1.5 px ring.
- Trash and History rows 56 px min; buttons 44 px; day headers 13 px semibold muted.
- Sync card 304 px (picker size); dot 10 px with 44 px target.
- Motion: card / sheet 200 ms open, 130 ms close; restored row glows 700 ms; reduced motion = instant.

## States

- Empty: Trash "Nothing in Trash"; History "No earlier copies yet. A copy is made every 2 minutes while you write."
- Error: export or backup failed → plain words, "Try again", Professional "Copy details"; nothing deleted.
- Offline: SF10; Export and backup work offline; sign-in shows "Connect to sign in".
- Phone: sheets at the bottom; Before / after stacks top / bottom.
- Dark: tokens only; danger red only in SF5.

## Nothing lost

| Today's feature                                                                | Where today (`src/`)                                                                                             | New home                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| History dialog: list, preview, restore, keep note                              | `history/HistoryDialog.tsx:20`, `versionService.ts:193`                                                          | SF1, SF2, SF20                      |
| Copies every 2 min, 20 s after big changes, 300 kept, thinning                 | `history/versionService.ts:13-19,107-116`                                                                        | unchanged; text fixed (was "5 min") |
| Undo / Redo step journal                                                       | `history/pageHistory.ts:34-36,421-475`                                                                           | unchanged                           |
| Trash list, empty state                                                        | `trash/TrashSection.tsx:26,69`                                                                                   | SF4                                 |
| Restore notebook / database / page                                             | `trash/trashService.ts:212,259,286`                                                                              | SF4, SF21                           |
| Delete forever with confirm                                                    | `trash/TrashSection.tsx:108-133`, `trashService.ts:342-397`                                                      | SF5                                 |
| Export: PDF, Paper PDF, Word, Markdown, Text                                   | `share/export/ExportDialog.tsx:23-29`, `exportService.ts:23`                                                     | SF7, SF22                           |
| Include sub-pages; Save; device Share; Print                                   | `share/export/ExportDialog.tsx:114,183,194,201-209`                                                              | Export sheet                        |
| Locked pages skipped and counted                                               | `share/export/ExportDialog.tsx:160`                                                                              | Export sheet note                   |
| Save everything / notes only / password                                        | `share/DataScreen.tsx:402,412`, `PasswordFields.tsx:20`                                                          | SF8, SF23                           |
| Restore: open, Replace (safety copy), Add as copies, Undo                      | `share/DataScreen.tsx:219,368,425-492`, `RestoreDialog.tsx:107,125`                                              | SF9                                 |
| Journal / templates include switches                                           | `share/DataScreen.tsx:541-550`                                                                                   | SF23                                |
| Notion, NotebookLM, Anki import; Anki export                                   | `share/NotionImportSection.tsx:35`, `notebooklm/NotebookLmImport.tsx:59`, `DataScreen.tsx:264,306`               | SF23 (Tool frame)                   |
| Sample notebook                                                                | `share/DataScreen.tsx:174,645-672`                                                                               | SF23                                |
| Backup reminder, 7 days, snooze 90 days                                        | `share/ReminderBar.tsx:5-27`, `backupReminder.ts:10-61`                                                          | SF16 Banner                         |
| Sign-in: code, password, create, reset; guide                                  | `sync/SignInPanel.tsx:25-271`, `SignInGuide.tsx:40-144`                                                          | SF17                                |
| Passphrase setup, recovery code (copy, print, save, replace), unlock + limiter | `sync/SyncSection.tsx:99,158`, `RecoveryCodeView.tsx:18-77`, `AccountSection.tsx:398`, `unlockAttempts.ts:14-19` | SF17 step 3, Account                |
| Account: who, connections, devices, sessions, sign out (everywhere)            | `sync/AccountSection.tsx:53,253-287`                                                                             | SF27                                |
| Sync section: status, Drive reconnect, test run                                | `sync/SyncSection.tsx:44,214-255`                                                                                | sync card + SF24                    |
| What syncs, reset device with Undo                                             | `settings/WhatSyncs.tsx:25-121`                                                                                  | SF24                                |
| Sync dot states                                                                | `sync/SyncDot.tsx:5-18`, `syncDisplay.ts:14`                                                                     | SF10, SF11                          |
| Whole-account choice: Merge / this / other device                              | `sync/SyncChoiceDialog.tsx:14-94`                                                                                | kept as a Dialog (first sync)       |
| Clash bars: Keep mine / Use other / Keep both                                  | `editor/ClashBars.tsx:22-160`                                                                                    | SF12, SF25                          |
| Read-only bar + Offline / Later sheet; signed-out gate                         | `sync/AccountGateBar.tsx:16-115`, `SignedOutGate.tsx:16`                                                         | SF13                                |
| Lock: PIN, password, Face ID, locked list, remove all                          | `app/lock/LockSection.tsx:52-406`                                                                                | SF14, SF15, SF26                    |
| Connect Claude consent                                                         | `connector/ConnectPage.tsx:40-138`                                                                               | SF18                                |

## Won't do

- Sharing with other people, public links, collaboration, paid storage.
- Any Supabase or server change (sync protocol untouched).
- Lowering any existing password minimum.

## Sub-slices (one commit each)

1. **16a Trash** (D2): `src/trash/*`, Settings › Trash. SF3 to SF6, SF21.
2. **16b History** (D1): `src/history/HistoryDialog.tsx`, `versionService.ts` (names only), i18n history text fix. SF1, SF2, SF19, SF20.
3. **16c Share / Export sheet** (D3): `src/share/export/*`. SF7, SF22.
4. **16d Save & restore + backup Banner** (D4, D5, D6, S9): `src/share/DataScreen.tsx`, `RestoreDialog.tsx`, `ReminderBar.tsx`, imports. SF8, SF9, SF16, SF23.
5. **16e sync card + conflicts** (D10, D11, D13): `src/sync/SyncDot.tsx`, `SyncSection.tsx`, `src/settings/WhatSyncs.tsx`, `src/editor/ClashBars.tsx`. SF10 to SF12, SF24, SF25.
6. **16f sign-in, account, gate** (D7, D8, D9, D12): `src/sync/SignInPanel.tsx`, `SignInGuide.tsx`, `AccountSection.tsx`, `AccountGateBar.tsx`, `SignedOutGate.tsx`. SF13, SF17, SF27.
7. **16g lock screens + Connect Claude** (D14, D16): `src/app/lock/LockSection.tsx`, `src/connector/ConnectPage.tsx`. SF14, SF15, SF18, SF26.

## Tests

- Unit: Trash age rule (30 / 60 / 90 / never, UTC); clash keeps both; restore saves a copy first; read-only gate in Save & restore.
- e2e (Chromium + `ipad-webkit`): SF1 to SF27; offline toggling; flag off = today.
- Screenshots: every sheet and card × light / dark × iPad landscape / portrait / phone / PC.
- Security review: deletes (rules/security.md), backup password, gate.

## Owner iPad check (3 steps)

1. Turn on `safety.v2`; delete a page, tap Undo, delete again, open Trash: Restore and Delete forever are visible.
2. Open a page's History, tap a copy (preview only), then Restore; Undo brings back the newer text.
3. Turn Wi-Fi off: the sync dot is grey and its card says "Offline, saved on this device"; Wi-Fi on: it syncs by itself. Then open Share / Export and see the preview.

## Decisions to review

- **Passwords:** "one rule, 8 characters" applies to the lock password and backup password (already 8). The account password stays at 15 (`src/sync/passwordRules.ts:7`) and the sync passphrase at 12, because lowering them weakens real protection. One sentence everywhere: "At least 8 characters (15 for your account)".
- **Auto-empty Trash after 30 days** is a new deletion; it runs only for items deleted after the flag is on, so nothing already in Trash disappears without warning.
- **Clash default "Keep both"**; the first-sync whole-account choice dialog stays (it is a different case: two full sets of notes).
- New unlock ids proposed: `safety.historyCompare`, `safety.namedVersions`, `safety.trashTools`, `safety.exportMore`, `safety.backupMore`, `safety.conflictChoice`.
- No new visual pattern: Before / after view and Wizard steps are planned shared parts (0g step 3).
