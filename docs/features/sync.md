# Sync (Phase L)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Keep the notes the same on the iPad and the PC, end-to-end encrypted: the server (Supabase) and Google Drive only ever hold locked copies. Design: [RESEARCH.md](../RESEARCH.md). Only the owner's Gmail can sign in.

## How it works

- **Settings › Sync** (`src/sync/SyncSection.tsx`, loaded only when opened): Sign in with Google → first device: choose a passphrase (12+ letters, checked) → the app shows a printed **recovery code** (26 letters, 128 random bits) and asks for its last four letters → sync starts. Other devices: sign in, type the passphrase or the code → notes already on that device stay and are added.
- **Keys** (`crypto.ts`, `setup.ts`, `keyVault.ts`): one random master key (AES-256-GCM). Two locked copies on the server: by the passphrase (Argon2id 64 MiB, t=3, p=1, in WebAssembly) and by the recovery code (HKDF). The passphrase copy is also saved to Drive as the **spare key** (a new file each time; the newest valid one is used). On a device the key is kept as a non-extractable CryptoKey in its own small browser database (`learning-notes-keys`), never in backups.
- **Records**: each record is locked with its table, id, revision and key id bound in (AAD). The server id is a hash of table + id, so the server cannot tell a block from a card. Compare-and-swap on the server (`sync_push`): a save is accepted only if nobody saved since.
- **When**: on open, on return to the app, on reconnect, on a live ping and by polling while the app is in front (the iPad cannot sync in the background): every 10 s while the live feed is closed, every 60 s as a safety net while it is open. Local edits go out about 2 s after typing stops. "Last synced" and "Live" show in Settings › Sync.
- **Real-time (R6-13)**: `connectors/realtime.ts` keeps a plain WebSocket to Supabase Realtime (no SDK; Phoenix join, heartbeat 25 s, a fresh token every 45 min, reconnect 1→30 s) and listens to `sync_pings`, one tiny row per account that `sync_push` touches after each accepted save (migration `20261107000001_sync_realtime.sql`: table, RLS, publication). Only "changed" and the server order travel; records come by the normal pull. A ping at or below the order this device already saw (its own save) is ignored; several pings within 150 ms start one pull; a ping during a sync queues one more. The feed is closed while the app is hidden or signed out. `ChangeFeed` in `connectors/types.ts`; the memory connector pings other windows through the `storage` event, and the two-device e2e exposes a shared in-test server on `window.__lnSyncServer` with `__lnSyncPing`.
- **Live apply (R6-13)**: after a merged batch the engine announces the applied records (`sync/applied.ts`, plus BroadcastChannel to other windows). The open editor (`editor/liveApply.ts`, loaded when sync is on) waits 1.5 s after the last keystroke, then puts each changed block in place: update, insert at its place among its siblings, remove, or move (unless the caret is in it); the caret is restored by block and text offset; nothing becomes an Undo step; the autosaver's snapshot absorbs the result so nothing is written back. A block whose editor text differs from its last save (being typed in) is left alone: the typing wins (the newer change) and the other device's text goes to History (`history/loserVersion.ts`) with the "changed on two devices" notice. Own saves that come back from the server are recognised (same content, order and parent) and skipped. A second window of the same browser still reloads the page (O1).
- **Files** (pictures, books, audio, fonts): bytes are locked and uploaded to the Drive folder "Learning Notes (encrypted)" with the `drive.file` permission before their record is sent; other devices download them in the background. The Drive pass lasts an hour; it is renewed quietly, and if Google wants a tap the page shows **Reconnect Drive** (notes keep syncing meanwhile).
- **Merge rules** (`merge.ts`): new here → take; Delete forever always wins; review logs are only added; no change here → take; both changed → the newer hybrid clock wins (device time + counter + device id; a clock more than a day ahead is not followed and shows a warning). Blocks: the losing text is kept in that page's **History**, and a "changed on two devices" notice shows.
- **First merge**: workspaces, special notebooks (Journal, Templates, …), journal day/month pages and cards now get **fixed ids**, so two new devices make the same ones. Older devices that already have their own are merged after each sync (`dedupeWorkspaces`): the other's notebooks, pages and cards move into the kept one; the empty duplicate is soft-deleted.

- **Locked alert (Level 1)**: `sync/lockedStatus.ts` (`isLocked`: needsKey, needCode, unreadable) is read by the eager `LockedAlertGate`, which lazy-loads `LockedAlert.tsx`: one `alertdialog` per session (sessionStorage `attn.locked.shown`) after the person stops typing, not while Settings › Sync is open; Later leaves a red banner with Unlock; unlocking clears both. Design: [research/attention-alerts-2026-11.md](../research/attention-alerts-2026-11.md); other levels not built. Tests: `lockedStatus.test.ts`, `e2e/lockedAlert.spec.ts`.

## Adding a table (for future builders)

1. Add the table in `core/db.ts` (a new Dexie version, add-only) as usual.
2. Add one line to `SYNC_TABLES` in `src/sync/tables.ts` with its rule: `record` (newest edit wins), `blocks`, `append` (rows never change), `file` (bytes in `data` go to Drive) or `local` (never synced: rebuildable or device-only). A unit test fails while a table has no line.
3. Make every write set `updatedAt` (it is how edits made while sync was off are found) and keep soft deletes (`deletedAt`, `purgedAt`): sync never sends a hard delete.
4. Bytes must live in a field called `data` (ArrayBuffer) for `file` tables. Other binary fields are carried inside the locked record (`wire.ts`).
5. If two devices could make "the same" record on their own (a singleton, a record per date or per block), give it a fixed id with `stableRecordFields` / `stableId` (`core/records.ts`, `core/ids.ts`).
6. Nothing else: the outbox middleware (`outbox.ts`) tracks every save of a synced table, from any service.

Sync fields of a record live beside it in `syncState` (Dexie 18), one row per record: `rev` (server revision last seen = the base revision of the next save), `hlc` (clock of the last change), `dirty` (0/1), `fileState`/`fileRef` (files). The device id and clock live in localStorage (`device.ts`), the pull cursor (server seq) in `meta` `sync.cursor`. `formatVersion` travels inside each locked record.

## Vendor wall

Vendor code and addresses live only in `src/sync/connectors/` (`supabase.ts`, `google.ts`, `config.ts`); the rest imports `sync/connectors` (its index). ESLint enforces it (`no-restricted-imports`, `no-restricted-syntax` on `supabase.co`, `www.googleapis.com`, `accounts.google.com`). `memory.ts` is the test connector (browser tests set `learning-notes:sync.mock`). No vendor SDK: plain `fetch` (small, and nothing else can call the server).

## Edge cases

- Sign-in, sign-out, a wrong passphrase or a failed sync never delete or change notes on the device.
- A record that cannot be opened (other key, damaged) is skipped and counted, never applied.
- A refused save (someone saved first) fetches the server copy, merges it and sends again; one conflict never stops the rest.
- Restore › Replace keeps this device's sync rows; the restored notes count as new changes and are sent.
- Supabase pauses after 7 quiet days: sync shows "Could not reach the server" until the owner presses Resume in the dashboard; notes keep working.
- Known gaps (see DECISIONS "Decisions to review"): a move and an edit of the same block on two devices keep only the newer one (one clock per block, not two); two journal pages for the same day made before fixed ids both stay; card schedules are not rebuilt from review logs; changing the passphrase and key rotation are not built; erased items can stay in Drive revisions and old backups as they age out; reading progress and favourites are device settings and do not sync yet.

## Security check

- No secret in code: the Supabase publishable key and the Google client id are public by design; the Google client secret lives only in the Supabase dashboard. Sessions and the Drive pass are in localStorage (like the AI key), never in the notes database or backups.
- Server rules (`supabase/migrations/`): RLS allows only the owner's account and email to read; records change only through `sync_push` (security definer, checks the email); the "Before User Created" hook refuses any other email.
- CSP `connect-src` adds only the project's Supabase host (https and wss, for Realtime), `www.googleapis.com` and `accounts.google.com`; `script-src` adds only Google's sign-in script, loaded when the Drive pass needs renewing.
- Realtime: the socket is opened with the public key and joined with the signed-in token; the server applies the same RLS, so only the owner's row is sent. `sync_pings` holds only a number per account (no record, no size).
- AI keys (R6-2, opt-in): the `secrets` table is a normal synced record (locked with the master key); it is never written to a backup file and Replace keeps it.
- What the server still sees: account, times, number and sizes of items. Not text, titles, tags, picture names or table names.
- Limits: a script injected into the page could use the unlocked key while the app runs; anyone holding the Drive spare can guess passphrases offline, so it is only as strong as the passphrase. The design is home-made until reviewed (an outside audit costs money: owner approval).

## Tests

- Unit: `src/sync/crypto.test.ts` (Argon2id reference vector, passphrase and recovery code round trips, wrong secrets, tampered bundles, AAD binding of table/id/revision), `src/sync/engine.test.ts` (two devices through the memory connector: notes move encrypted, local notes never removed, same-block conflict with History copy, refused save, edits made while off, other key skipped, picture bytes through Drive, merge rules, every table has a rule), `src/core/orderSync.test.ts` (order key ties, suffix, fixed ids), `src/core/migration.test.ts` (upgrade to 18), `src/sync/connectors/realtime.test.ts` (join message and filter, ping parsing, live and heartbeat, reconnect after a close, signed out), `src/editor/liveApply.test.ts` (update in place with the caret kept, caret offset in the changed block, insert and remove, typing wins with their text in History, own echoes skipped).
- E2E: `e2e/sync.spec.ts` (set up on A with the printed-code check, unlock on B with a wrong then right passphrase, both notebooks present, the server state holds no readable text; device check), `e2e/syncLive.spec.ts` (two browser contexts, one shared in-test server with pings: A's edit shows on B's open page without a reload, B's caret stays, B's typing reaches A).
- Owner (real server): "SYNC REALTIME SETUP" at the top of owner-checks-pending.md.
- Owner (real accounts, iPad): see [plans/owner-checks-pending.md](../plans/owner-checks-pending.md) "SYNC SETUP".
