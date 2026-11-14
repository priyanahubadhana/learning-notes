# Update flow v2 (slice 10, flag `update.v2`, BUG-004)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: most new versions are small. They wait quietly in the update pill and install at a calm moment, as today. A few new versions are **must-have**: the way notes are stored changed, or a fix repairs saved data. Only those take over the screen, count down 5 seconds and install, keeping every note. This slice makes "must-have" a precise, testable rule instead of a word in the last commit message, and closes the gap where a device that skipped a version could miss a must-have update.

Sources: `docs/PENDING.md` BUG-004 and "Carry-over review"; build plan 3.3 row 10; audit D17. Much of the flow is already built (`src/app/mandatoryFlow.ts`, `src/app/MandatoryUpdate.tsx`); this slice tightens the rule, adds the reason line and the offline case, and moves the screens onto the shared parts.

## How it works

### What makes an update "must-have" (exact rule)

Today (`vite.config.ts:36-51`, `src/app/updates.ts:128-136`): a build is "required" when its **own last commit message** contains `[required-update]` or `REQUIRED_UPDATE=1` is set. `version.json` carries `{ commit, required }`. The flag describes only the newest build, so a device on version A that skips the required build B and next sees a normal build C gets only the pill, while B's storage change is still ahead of it. (In practice the Dexie upgrade then runs behind `UpgradeGate` on the next start, but the device is not made to update.)

New rule (flag on):

1. A new file `src/app/updateLevel.ts` exports `UPDATE_LEVEL` (a whole number, starts at 1) and `UPDATE_REASON` (`'storage'` or `'datafix'`).
2. The build writes `version.json` as `{ commit, required, level, reason }`. `required` keeps today's meaning for old devices (marker present **or** `UPDATE_LEVEL` changed in this commit), so devices still on today's code behave as today.
3. A device treats a newer version as **must-have exactly when `level` in the live `version.json` is greater than the `UPDATE_LEVEL` it was built with.** Missing, non-numeric or negative `level` = not must-have (fail calm: the pill). Nothing else makes it must-have.
4. `UPDATE_LEVEL` must go up by 1 when, and only when:
   - **storage:** the highest `this.version(n)` in `src/core/db.ts` changes (today 23, `src/core/db.ts:340`), or a stored record shape changes in a way old code would misread;
   - **datafix:** the release contains a migration that repairs saved data (the commit says which).
     A unit test pins a table `{ dbVersion → level }` so changing the Dexie version without bumping the level fails the build.
5. A tab whose code is older than the database on this device (another tab already upgraded it; Dexie reports a version error or a `versionchange` event) is must-have at once, with reason `storage`, even without a network check.

### Normal update (no change from today)

The pill (`src/app/UpdatePill.tsx`) shows checking, downloading with progress, installing, "Update ready", restarting, updated, offline and failed; it installs at the next safe moment (`src/app/autoUpdate.ts:46` `isSafeMoment`), never while writing. The risk bar (`src/app/UpdateBar.tsx:5`) still warns about unsaved work, low space and missing backup.

### Must-have update (flag on)

Full-screen notice (shared part **Dialog set**, alert kind, full-screen variant; portal outside `#root`, `#root` inert): title, a one-line **reason** ("Your notes are stored in a new way" / "This fixes a problem with saved notes"), "About N seconds" (from the download size and measured speed; hidden when unknown), the 5 s countdown ring, then download with a progress bar, then "Installing", then restart on the same page (`rememberPlace` / `restoreAfterUpdate`). Before installing, the rolling browser backup runs (`UpgradeGate`), as today.

## When I do X → Y (each line = one e2e test)

Beginner and Professional behave the same unless marked.

- **U1** When a newer version with the same `level` is found → the pill says "Update ready"; no full-screen notice; the app installs it at the next quiet moment, never while I am writing or drawing.
- **U2** When a newer version with a higher `level` is found → a full-screen notice appears over everything within 1 s, shows the reason line and counts down 5, 4, 3, 2, 1, then downloads.
- **U3** When I skipped a must-have version (live `level` is 2 above mine, newest commit has no marker) → I still get the full-screen notice (U2), not the pill.
- **U4** When `version.json` has no `level`, a text `level` or a lower one → only the pill shows (U1).
- **U5** When the countdown runs and I tap "Not now" (pause) → the countdown stops, the screen says "Paused. The app needs this update to keep your notes safe." with "Update now"; the app stays blocked behind it.
- **U6** When the download is running and I tap "Cancel" → the download stops, the screen shows "Paused" (U5); "Update now" starts again from 0.
- **U7** When the download finishes → the screen says "Installing…" with all taps and keys blocked (Esc does nothing); the app restarts on the page I was on, with the scroll place kept.
- **U8** When I have typing that is not saved yet as it reaches "Installing" → it waits up to 5 s for the save; if the save still fails, it shows "Your last change is not saved yet" with "Try again" and does not restart.
- **U9** When the restart does not happen within 6 s → the screen shows "The update did not finish" with "Try again"; nothing is lost.
- **U10** When I am offline as a must-have update is found (or I go offline during the download) → the notice says "Connect to the internet to finish this update. Your notes are safe." The countdown waits and starts by itself when I am back online.
- **U11** When a second tab has already upgraded the stored notes → this tab shows the full-screen notice with the storage reason, without a network check, and does not write to the database.
- **U12** When the update has installed → the pill says "Updated to <version>" for 4 s (the "What's new" card belongs to [system-v2](system-v2.md) Y-W1).
- **U13** When the flag is off → behaviour is exactly today's (marker-only rule), pixel for pixel.
- **U14** (Professional, unlock `about.version`) When I open Settings › About → I see my version, its `level`, "Check for updates now" and the last check time; a check that finds a must-have version starts U2.
- **U15** (Professional, proposed unlock `about.updateDetails`) When I tap the reason line on the notice → a pop-up explains what changed in storage or which data is repaired, in plain words.
- **U16** When reduced motion is on → the countdown ring and progress do not animate; the numbers still change each second.
- UV-18 When I tap "Pretend a must-have update" in About → the notice counts down, downloads and the app reopens on the same page (the real ending, not a marker).
- UV-19 When I check for new files → the list is exactly what the offline copy saves (same kinds, ignores, size limit); a file the copy never saves is never "missing". With every listed file already saved, the download step shows 0 files and moves on at once.
- UV-20 When a file does not arrive (no byte for 20 s, or one file takes over 60 s) → the screen moves to "The update did not finish" with "Try again" (or the offline note when offline); never stuck on "downloading".
- **U17** When I use a screen reader → the notice is an `alertdialog`, the countdown is announced once at 5 and once at "Downloading", not every second.

## Shared parts used (plan 3.2 row 0g)

Dialog set (alert, full-screen variant), Status pill stack (the update pill), Banner (risk bar becomes a Banner), Toast queue (none needed here), Overlay manager (top layer, focus kept inside), Event router (blocks keys while installing).

## Sizes, spacing, motion

- Notice: full screen, `bg` token, content column max 420 px, centred; title 22 px semibold, reason 15 px, muted line 13 px. Buttons min 44 px tall, min 112 px wide, radius 12 px, 12 px gap. Primary = accent fill, second = tonal.
- Countdown ring 56 px, 4 px stroke, accent; number 20 px tabular.
- Progress bar 6 px track (slider track from the design study), accent fill, value pill beside it.
- Motion: notice fades in 200 ms cubic-bezier(.2,.8,.2,1) with scale .96 → 1; phase text cross-fades 150 ms; reduced motion = instant.

## States

- Empty: none (the notice exists only with a must-have update).
- Error: download failed / install failed / save failed, each with plain words, "Try again" and (Professional) "Copy details".
- Offline: U10.
- Phone: same column, 16 px side margins, buttons stack full width.
- Dark: tokens only; the ring and bar keep 3:1 contrast.

## Nothing lost

| Today's feature                                                  | Where today (`src/`)                                 | New home                            |
| ---------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| Update pill phases (checking … failed)                           | `app/UpdatePill.tsx:8-58`, `app/updateStatus.ts`     | Status pill stack, same phases      |
| Safe-moment install (idle, foreground, poll)                     | `app/autoUpdate.ts:16-109`                           | unchanged                           |
| Risk bar (unsaved, space, backup; Update anyway, Later)          | `app/UpdateBar.tsx:5-41`                             | Banner part, same texts and buttons |
| Remember and restore place after update                          | `app/autoUpdate.ts:120`, `:140`                      | unchanged (U7)                      |
| "Restarting…" pill, 5 s cap                                      | `app/autoUpdate.ts:296-321`                          | unchanged                           |
| Mandatory flow: countdown, download, pause, retry, install, fail | `app/mandatoryFlow.ts:17-173`, `MandatoryUpdate.tsx` | full-screen notice, U2 to U9        |
| Required marker in commit message                                | `vite.config.ts:36-51`                               | kept as `required` for old devices  |
| Required read from live `version.json`                           | `app/updates.ts:100-136`                             | plus `level` rule (rule 3)          |
| Update check throttling and triggers                             | `app/updates.ts:249-293`                             | unchanged                           |
| Storage upgrade screen + rolling browser backup                  | `app/UpgradeGate.tsx:74`                             | unchanged; runs before install      |
| Check for updates now                                            | `settings/AboutSection.tsx`                          | Settings › About (U14)              |
| Other-tab apply message                                          | `app/updateChannel.ts:16`                            | unchanged; also carries U11         |
| Test hook `learning-notes:test-required-update`                  | `main.tsx:203`                                       | kept (e2e)                          |

## Won't do

- No forced update for a normal version; no update while writing.
- No server or Supabase change; `version.json` stays a static file.
- No "skip this must-have update" choice (it could damage stored notes).
- No update channel switcher in this slice (stays as today).

## Sub-slices (one commit each)

1. **10a rule** (D17): `src/app/updateLevel.ts`, `vite.config.ts` version stamp, `src/app/updates.ts` level compare, `src/core/db.ts` untouched except an exported `DB_VERSION` constant, unit tests `updateLevel.test.ts`. Tests U3, U4.
2. **10b other-tab guard** (D17): `src/core/db.ts` `versionchange` / version-error handler → `src/app/updates.ts` must-have trigger; `src/app/updateChannel.ts`. Test U11.
3. **10c notice** (D17): `src/app/MandatoryUpdate.tsx`, `src/app/mandatoryFlow.ts` (offline wait, reason), `src/app/mandatoryState.ts`, i18n `update.req.*` (en, es, hi). Tests U2, U5 to U10, U16, U17.
4. **10d About + details** (D17): `src/settings/AboutSection.tsx`. Tests U14, U15.
5. **10e flag + screenshots**: `src/app/flags.ts` entry, screenshot set, U1, U12, U13.

## Tests

- Unit: level compare (equal, higher by 1 and by 2, missing, text, negative); db-version → level pin; offline wait; reason text per kind; flag off = marker rule.
- e2e (Chromium + `ipad-webkit`): U1 to U17, with a mocked `version.json` route and the test hook.
- Screenshots: notice in countdown / downloading / paused / installing / failed / offline × light / dark × iPad landscape / portrait / phone / PC.
- Accessibility: alertdialog, focus on the primary button, contrast.

## Owner iPad check (3 steps)

1. Turn on `update.v2` in "Try new design"; on the preview link, open Settings › About and tap "Check for updates now": a normal update shows only the pill.
2. Use the hidden test button "Pretend a must-have update" (Settings › Advanced, preview only): the full-screen notice counts down 5 s, downloads and reopens on the same page.
3. Turn Wi-Fi off and repeat step 2: the notice says to connect; turn Wi-Fi on: it continues by itself.

## Decisions to review

- **Offline must-have (U10) - decided safety rule:** an offline must-have update NEVER locks a person out of their notes. The notice shows only when online; offline it is a small bottom note ("Connect to the internet to finish this update. Your notes are safe.") and the app stays usable. The countdown starts by itself when the network is back (also if the network drops during the countdown or download). This replaces the earlier wording "the app stays blocked until online".
- **Skipped versions (rule 3):** a number that only goes up replaces "the newest commit says required". Old devices keep today's rule through the `required` field.
- **Other tab (U11):** treated as must-have without a network check, because old code writing to a newer database can damage notes.
- **New unlock id** `about.updateDetails` is still proposed (not yet in `docs/mockups/pro-features.md`). Until the owner agrees, U15 (tap the reason line) uses the existing unlock `about.version`, so no list or count changes.
- The pause button is called "Not now" during the countdown and "Cancel" during the download, but both lead to the same "Paused" screen; the app stays blocked, as BUG-004 says.
