# Plan: settings that follow you (settings sync)

Research: [../research/settings-sync-2026-11.md](../research/settings-sync-2026-11.md). Status: proposal, needs the owner's OK. Builder: Sonnet. No new costs, no new server tables.

## In short

Every setting declares where it lives: **All devices** (synced), **This device** (device) or **Secret** (synced only when the person opts in, E2E). Synced settings travel as encrypted records through the existing sync engine; the newer edit wins per setting (our hybrid clock). A "What syncs" panel has one switch per group. Each setting shows a small tag and a menu: "Keep on this device only", "Use this device's value everywhere", "Reset to synced value".

## Important finding first

`synced` settings do not sync today: `src/sync/tables.ts` has `settings: 'local'`. AI on/off, models, cap and privacy are plain localStorage outside the registry. Step 1 fixes the first, step 3 the second.

## Data model

- Registry: `scope: 'synced' | 'device' | 'secret'`, plus a new `group: SyncGroupId` (required for synced and secret; a unit test fails if missing).
- `settings` rows: `{ id, value, updatedAt, hlc }`. Change `SYNC_TABLES.settings` to `'record'`. One record per setting, so it is last-writer-wins per key, never a whole-file clash.
- Device overrides: localStorage `learning-notes:settings.override.v1` = `{ [settingId]: value }`. Read order: this device's override, then the synced row, then the default. Overrides never sync.
- Group switches: localStorage `learning-notes:settings.syncGroups.v1` = `{ [groupId]: boolean }` (device only, like Obsidian and VS Code). With a group off on a device: local edits go to the override map; incoming rows are stored but not applied, so turning it back on is instant and loses nothing.
- Secrets: keep the R6-2 `secrets` table and `ai.keysSync`; the panel shows them as the "AI keys" group (off by default).

## Conflicts

Last-writer-wins per setting by HLC (`nextHlc()` in `sync/device.ts`), ties broken by device id, exactly like `record` today. No CRDT. List values (Revise labels, model order) also take the newer whole value: acceptable because they change rarely. An invalid incoming value (older or newer app) is ignored; the current value stays (`isValid` exists).

## Groups and defaults

| Group                   | Scope  | Default | Settings                                                                                                                                                                                                                                   |
| ----------------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| General                 | synced | on      | language, date style, day start hour, show help, path style, open notebook at, new page study and chooser, paste mode                                                                                                                      |
| Appearance              | synced | on      | theme (default "System", which already follows each device), reduce glass                                                                                                                                                                  |
| Review                  | synced | on      | all `review.*`, Revise labels                                                                                                                                                                                                              |
| Reading                 | synced | on      | reading look (font, size, spacing). Reading progress and favourites stay out for now                                                                                                                                                       |
| AI                      | synced | on      | ai.enabled, provider, model order, model-to-key map (key ids only), spending cap, privacy OK, permissions, ai.currency                                                                                                                     |
| Lock                    | synced | on      | lock.idleMinutes                                                                                                                                                                                                                           |
| AI keys                 | secret | **off** | the `secrets` record (R6-2)                                                                                                                                                                                                                |
| This device (no switch) | device | n/a     | device mode, toolbar and ribbon layout, sizes, placement, sets, bar auto-hide, Pencil options, finger only, hover tips, shortcut hints, scroll hints, auto update, zoom, lab flags, the sync choices themselves, unlock throttle, sessions |

Privacy: a device without a key still shows the AI-off card even if "AI on" synced; AI never runs on a device until a key is present there.

## Migration (one time, per device)

1. First run of the new version: copy current localStorage values of newly synced settings into rows stamped with the oldest possible clock, so anything already on the server wins and a fresh device never overwrites the account.
2. If the server has no row, the local value becomes the account value on the first push.
3. If the first pull changes values this device had, show one quiet notice: "Settings now follow you. 3 settings changed to match your other devices. Undo" (Undo keeps the old values as this-device overrides).
4. Keep reading the old localStorage keys for one release as a fallback, then remove (DECISIONS entry).

## UI

- Settings > Sync > **What syncs**: one row per group with its name, a one-line list of contents and a switch. The AI keys row explains E2E and that a new device needs the passphrase. Signed out: rows disabled with "Sign in to use".
- Every setting row gets a small tag: "All devices" (cloud icon) or "This device" (device icon). An overridden synced setting shows "This device only".
- Row menu on synced settings: "Keep on this device only", "Use this device's value everywhere" (writes the value to the synced row, removes the override), "Reset to synced value" (removes the override).
- Panel footer: "Reset this device to synced values" (clears all overrides; Undo toast).
- All text in en, es, hi; tags and menus keyboard reachable and announced.

## Security

- Settings rows use the same AES-GCM envelope with AAD; the server sees only an opaque id.
- Never put a key's secret in `settings` (key ids only). A unit test scans synced values for key-like strings.
- Overrides and group switches never go into backups or sync.
- Sign out on all devices / remote sign-out: overrides stay (device data); synced rows follow the existing rules.

## Steps for the builder (Sonnet)

1. **Make synced settings sync.** `tables.ts` `settings: 'record'`; stamp `hlc` in `setSetting`. Tests: engine test with two memory devices: change `review.newPerDay` on A, it appears on B; both change, newer wins; invalid value ignored.
2. **Groups + `secret` scope in the registry.** Tests: every synced setting has a group, no device setting has one.
3. **Move AI prefs into the registry** as synced (enabled, provider, model order, keyFor, cap, privacy, permissions), same getters for callers. Tests: existing AI tests pass; round-trip test.
4. **Move General, Appearance, Reading, Lock settings** from device to synced per the table. Tests: settings.test updates.
5. **Overrides + group switches** in `settingsService`. Tests: read order; group off keeps incoming rows unapplied; turning on applies them.
6. **Migration** (oldest-stamp copy, notice with Undo). Tests: fresh device does not overwrite the server; Undo restores old values as overrides.
7. **What syncs panel**, AI keys row wired to `ai.keysSync`. e2e: Review off on B, change on A, B unchanged; on again, B updates.
8. **Scope tags, row menu, "Reset this device to synced values".** e2e: override on B, A changes, B keeps its value; Reset to synced, B takes A's value.
9. **Docs**: features/sync.md, features/settings.md, HELP-TEXTS, CHANGELOG, DECISIONS. Full tests, security check, mirror.

## Open questions for the owner

1. Theme: sync it (recommended, with "System" as default) or keep per device?
2. Language: sync (recommended) or per device?
3. AI spending cap: one cap for all devices (recommended, it is one wallet) or per device?
