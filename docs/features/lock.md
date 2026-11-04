# Privacy lock

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Hide a page, a notebook or a database behind a lock screen, so a casual look over the shoulder, a borrowed iPad or an unlocked laptop shows nothing. **It is a privacy lock, not encryption.** The notes are not scrambled and nothing is lost; it stops casual eyes, not an expert with access to the device or its stored data. Settings and Help say this in plain words. Real encryption stays in [encryption.md](encryption.md). Built in batch 3.

## How it works

- **What can be locked:** a page, a notebook (all its pages) or a database (and its rows). The lock is the optional flag `locked: true` on the record (`Page`, `Notebook`, `Database`): no index and **no database upgrade**, so restoring today's backups is unaffected. The flag goes with backups, restores and shared files (`share/checkRows.ts` validates it). Lists of locked things scan once, only on Settings › Lock. A lock on a notebook beats nothing below it; a page, notebook or database that is locked by any of the chain page → notebook → database is hidden (`lockRoot`).
- **Where to lock:** the page ⋯ menu (_Lock this page_), the notebook's Tab options menu (_Lock this notebook_), the database screen's ⋯ menu, the ribbon File › Protect tools (_Lock page_, _Lock notebook_, _Lock settings_) and the control panel. With no way to unlock set up yet, locking says "Set up a PIN, a password or Face ID in Settings › Lock first" and offers Settings (so nothing can be locked with no way back). The choices live in **Settings › Lock**.
- **Ways to unlock (any combination, set in Settings › Lock):**
  - **Face ID / Touch ID / Windows Hello** through a WebAuthn **platform passkey** (`core/lock/webauthn.ts`): `navigator.credentials.create` and `.get` with `authenticatorAttachment: 'platform'` and `userVerification: 'required'`. Only the credential id is kept, in this browser's storage (`lock.credentialId`), never with the notes and not in backups, so each device sets up its own. The answer of the device is accepted (there is no server to check a signature against), which is enough for a privacy lock and is said so here. If it fails or is cancelled, the lock screen shows a message and the PIN or password still works.
  - **PIN** (4 to 6 digits) and **password** (6 to 128 characters). Stored only as a salted **PBKDF2-SHA-256** hash with 210,000 rounds (`core/lock/lockCrypto.ts`, WebCrypto), compared in constant time. The hashes live in the `settings` table row `lock.config`, so **backups include the lock settings (hash only)**. A short PIN is weak whatever the rounds, which is one more reason this is not encryption.
  - Five wrong tries in a row make a wait (30 s, then doubling); a right code resets it.
- **Changing the lock** (set, change or remove a way, remove one lock, remove everything) asks for a current code or the device check first (`AuthDialog`). The first way to unlock can be set without asking.
- **Forgot (the safest honest flow):** the lock screen's _Forgot?_ opens a box that says plainly: this is a privacy lock, nothing is scrambled or lost, and the lock can be cleared. (1) If this device has its device lock set up, confirming with it opens the page at once, and a new PIN or password can then be set in Settings › Lock. (2) _Remove the lock_ clears every lock flag and every code (the notes stay exactly as they are). It needs a tick on "I understand …", shows how many things are locked, and, if a device lock exists, asks the device to confirm first. Without a device lock, anyone holding the device can do this, and the text says so. No code is ever recoverable, because only a hash is kept. Decision logged in DECISIONS.md.
- **Locking again (`app/lock/useLock.ts` `useAutoRelock`):** on leaving the locked place (the page, notebook or database; moving inside a locked notebook keeps it open), when the app is hidden or closed (`visibilitychange` hidden, `pagehide`), and after **5 minutes** without use (Settings › Lock › _Lock again after_: 1, 2, 5, 10, 15 or 30 minutes, per device). The unlocked state lives only in memory (`core/lock/lockState.ts`), so a reload or restart always starts locked.
- **While locked** the content is never read or drawn: `LockGate` / `PageGate` / `DatabaseGate` only create the real screen when unlocked. The title shows with a 🔒. Nothing else shows it:
  - **Search:** notes and cards of a locked page never match; the page title may, with a 🔒 and no text (`search/searchQuery.ts` `collect`, `hit.locked`). Saved searches and counts follow.
  - **Review:** cards of a locked page are left out of every queue until it is unlocked (`recall/reviewService.ts` `reviewable`).
  - **Sidebar, Favourites, Recent:** the title with a 🔒 (`app/pageTitle.ts`, `PageTree`, `Sidebar`). **Calendar:** a journal day or dated row that is locked shows a 🔒 on its chip (title only).
  - **Control panel** lists features and settings only, never notes.
  - **App switcher:** on `visibilitychange` to hidden the app is blanked at once (`html[data-app-hidden]`, CSS) and locked, so the snapshot iOS takes shows nothing. This is best effort: iOS may take the snapshot slightly before or after the event; checked by the owner on the iPad.
- **No lock set up (or removed):** flags are ignored, never a dead end (`hiddenPageIds` returns nothing when no way to unlock exists).

## Edge cases

- A page inside a locked notebook shows the notebook's lock screen (its title and "This notebook is locked.").
- A locked database inside a note shows a small lock instead of the table (`DatabaseBlockView`).
- Restoring a backup on another device brings the PIN and password hashes and the lock flags, but not the device lock (add it again in Settings › Lock).
- Two windows share nothing in memory: unlocking in one does not unlock the other.
- Read aloud and Reading mode stop when the page locks again.

## Security check

- Inputs validated: PIN `^\d{4,6}$`, password length, hash objects (`isSecretHash`) when read from the database or a file; the lock config is rebuilt from known fields only (`parseLockConfig`).
- No secret leaves the device; no PIN or password is stored or logged; no network. ₹0.
- Honest limits: the notes are in IndexedDB unencrypted; anyone with the device and developer tools can read them or clear the lock. The text in Settings, Help and the Forgot box says so.
- Deletes: removing the lock deletes only flags and hashes, never notes.

## Tests

- Unit: `src/core/lock/lock.test.ts` (hashing, salts, validation, config, hidden pages by page and notebook lock, unlock and relock state, removing every lock without touching notes, wrong-code wait), `src/recall/reviewLock.test.ts` (Review leaves out locked cards), `src/app/reading/readingKeys.test.ts` (texts).
- Browser: `e2e/lock.spec.ts` (plain explanation, PIN and password rules and hash-only storage, locked page shows only the lock screen, wrong code, wait after five, relock on leaving, on hiding with a blank screen and after idle time, hidden from search and Recent, Calendar lock mark, locked notebook, Settings list and remove with confirmation, Forgot flow, backup contents, phone fit in three themes), `e2e/lockDevice.spec.ts` (Chromium virtual authenticator: setup keeps only a credential id, unlock with the device, failed check then PIN, Forgot with a device lock). WebKit has no virtual authenticator: the real Face ID check on the iPad is an owner check.
