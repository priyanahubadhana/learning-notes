# Storage safety (flag `storage.safety`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: PENDING "iPad storage safety" (owner 13 Nov 2026). Mock: `docs/mockups/storage-safety-mock.html` (screenshots in `docs/mockups/storage-safety/`). Parts: [shared-parts.md](shared-parts.md) Banner (SP-56), Dialog (SH-10), Toast (SH-12). Related: [offline-and-install.md](offline-and-install.md), [backup-and-files.md](backup-and-files.md), [sync.md](sync.md) Alerts.

## Purpose

### Plain-words summary

Safari on an iPad or iPhone can clear the notes of a website that is open in a normal tab when the device runs low on space. An app added to the Home Screen is safer. This feature tells the user so, calmly, once; gives a one-tap backup; and replaces two scary failures (device full, Safari let go of the saved notes) with one quiet line that says what to do.

### Flag

`storage.safety`, OFF by default (add it to `src/app/flags.ts`). OFF = today exactly. ON = this spec. Nothing is stored except the "hide for now" times, so turning it off loses nothing.

### Levels

Beginner and Professional are identical. No Professional unlock: safety is never locked.

## How it works

Helpers already built in `src/core/storageSafety.ts`: `isSafariTab`, `currentBrowser`, `isConnectionLost`, `storageProblem`, `makeBackupDownload`, `storageNearlyFull`. They only read.

**One alert at a time.** The three new messages join the existing alerts list (`src/app/attention/attentionLevel.ts`), which already picks ONE problem and already handles ✕ and "hide for now". New codes, in this order of urgency: `storageLost` (level 2), `storageFull` (level 2), then the existing ones, and `homeScreen` last (level 3, below `update`). The existing `storage` code (90% used) keeps its text and takes its signal from `storageNearlyFull`.

**Look.** With the flag ON these three codes are drawn with the shared Banner part (`src/design/parts/Banner.tsx`): icon, one line of text, one button, ✕. Two new Banner kinds, no new colours: `install` (the default accent tint) and `storage` (the warm tint that `readonly` and `lock` already use). No red, no bright bar, no pop-up that blocks typing. The banner pushes the page down; it never covers it.

| ID    | Message           | Kind      | Text                                                       | Button                 | ✕ hides it                                    |
| ----- | ----------------- | --------- | ---------------------------------------------------------- | ---------------------- | --------------------------------------------- |
| SS-01 | Safari tab notice | `install` | Keep your notes safe: add this app to your Home Screen.    | Show how               | 7 days                                        |
| SS-02 | "Show how" pop-up | Dialog    | Add to Home Screen: 3 steps and a one-line "why"           | Back up first · Done   | ✕, Esc, tap outside                           |
| SS-03 | One-tap backup    | Toast     | Backup saved to Downloads. / Backup could not be saved.    | (Try again on failure) | by itself                                     |
| SS-04 | Storage full      | `storage` | This device is full. New changes may not save.             | Back up                | until the next start, or the next failed save |
| SS-05 | Connection lost   | `storage` | Saving is paused. Reload to carry on; your notes are safe. | Reload                 | until the next failed save                    |

Details:

- **SS-01** shows only when `isSafariTab(currentBrowser())` is true, the user is signed in, and after 2 s without typing (the existing banner rule). Never in the installed app, never in other browsers.
- **SS-02** steps: 1 Tap **Share** in Safari's bar. 2 Choose **Add to Home Screen**, then **Add**. 3 Open **Learning Notes** from its new icon and sign in. Why line: "Safari can clear notes kept in a tab when the device runs low on space. The Home Screen app keeps them. It starts empty, so back up first." Done closes the pop-up and the banner stays until ✕ (the user may not have done it yet).
- **SS-03** one tap = `makeBackupDownload(dbName)` then the app's normal file save (share sheet on iPad). No questions, no options. It is offered in three places: "Back up first" (SS-02), "Back up" (SS-04) and a row "Backup file · Back up now" in Settings › This device (`src/settings/DeviceSection.tsx`), which also shows the last backup time. After SS-04 the toast is "Backup saved." with the button "Free up space" (opens Settings › Data, as "Manage storage" does today).
- **SS-04** replaces today's once-a-minute "device full" message (`src/app/errors.ts` `onStorageFull`) while the flag is ON. Source: `storageProblem(error) === 'full'` in `reportError`.
- **SS-05** source: `storageProblem(error) === 'lost'`. Reload = `location.reload()`; the editor already keeps unsaved text across a restart. Back up is not offered here because the notes cannot be read until the reload.

### When lines (one test each)

| ID     | When I …                                                          | Then …                                                                                         |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SS-01a | open the app in a Safari tab on iPad, signed in, flag ON          | after 2 s without typing the calm banner shows with "Show how" and ✕; the page moves down      |
| SS-01b | open the installed app, or Chrome on a PC                         | no banner                                                                                      |
| SS-01c | tap ✕ on the banner                                               | it goes; it stays away for 7 days, also after a reload                                         |
| SS-01d | have a sync problem at the same time                              | only the more urgent banner shows; the Home Screen notice waits                                |
| SS-02a | tap "Show how"                                                    | the pop-up opens with 3 steps, the why line, "Back up first", "Done" and ✕; focus is inside it |
| SS-02b | press Esc, tap ✕, tap outside or tap Done                         | it closes and focus returns to "Show how"                                                      |
| SS-03a | tap "Back up first", "Back up" or "Back up now"                   | one backup file is saved with no further question; toast "Backup saved to Downloads."          |
| SS-03b | the backup cannot be made                                         | toast "Backup could not be saved." with "Try again"; nothing else changes                      |
| SS-03c | tap "Back up now" twice quickly                                   | one file, not two (the button is busy until done)                                              |
| SS-03d | make a backup                                                     | no note, setting or history step changes (Undo list is the same as before)                     |
| SS-04a | a save fails because the device is full                           | the warm banner shows once with "Back up" and ✕; no repeated toasts                            |
| SS-04b | tap "Back up" on it                                               | the backup saves; toast "Backup saved." with "Free up space"                                   |
| SS-04c | tap ✕, then another save fails                                    | the banner returns                                                                             |
| SS-05a | a save fails because Safari closed the database                   | the warm banner shows with "Reload" and ✕; the words I typed are still on screen               |
| SS-05b | tap "Reload"                                                      | the app reloads, my words are still there and the banner is gone                               |
| SS-06  | turn the flag OFF                                                 | none of the above appears; today's messages are back                                           |
| SS-07  | use light, dark and sepia; iPad landscape and portrait, phone, PC | text wraps (up to 3 lines on a phone), nothing is clipped, buttons are at least 44 pt          |
| SS-08  | use a keyboard or a screen reader                                 | banner is a labelled region read politely; Tab reaches button then ✕; the toast is announced   |
| SS-09  | am offline                                                        | everything above works the same                                                                |

## Edge cases

- Full and lost together: `storageLost` wins (a reload comes first).
- Reload does not help (the database still will not open): the existing retry screen in `src/App.tsx` takes over; it already offers Save everything.
- Backup while the device is full: the file is built in memory and handed to the browser; if that fails too, SS-03b.
- A very large library: the button shows busy; no spinner over the page.
- Private browsing or blocked `localStorage`: ✕ hides the banner for this visit only.
- iPhone Safari: same notice; step 1 says "Safari's bar" (bottom on iPhone, top on iPad).
- Texts go through `t()` in English, Hindi and Spanish.

## Decisions to review

- D1: the three codes use the shared Banner part while the older alerts keep `AttentionBanner`. Reason: new work must use shared parts; moving the old alerts over is a separate slice.
- D2: storage full is a calm warm banner, not the bright level-2 bar. Reason: owner asked for calm; the urgency order is unchanged.

## Won't do

- No "Add to Home Screen" button that installs by itself (Safari does not allow it).
- No automatic or scheduled backups here (see backup-and-files.md).
- No deleting or cleaning of data to free space; "Free up space" only opens Settings.
- No asking the browser to protect storage in a new way (`persist()` stays as in offline-and-install.md).
- No notice in Chrome, Edge, Firefox or the installed app.
- No moving notes from the Safari tab into the Home Screen app by itself (sign-in and the backup file do that).
- No restyling of the other alerts.

## Security check

- Inputs: none typed. Error text is only matched, never shown.
- The backup file holds the user's notes; it is saved only by the user's tap, only to their device, never uploaded. Same contents and format as the existing backup.
- Deletes: none. Secrets: none. No new dependency, no network call.

## Tests

Unit: `src/core/storageSafety.test.ts` (exists), `attentionLevel.test.ts` (order of the new codes, snooze), Banner kinds. e2e `e2e/storageSafety.spec.ts`: one test per When line (Safari tab faked through the user agent; full and lost faked by throwing `QuotaExceededError` / `DatabaseClosedError`). Screenshots for gate 3: every banner, the pop-up and both toasts in light, dark and sepia at iPad landscape, iPad portrait, phone and PC.
