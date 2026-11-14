# Phase 1: the frame and Settings

Written by Fable, 14 Nov 2026. Plan: [../phase-plan.md](../phase-plan.md). Whether the build is running or paused: only [../../BUILD-STATE.md](../../BUILD-STATE.md) says (running, lean, since the restart of 14 Nov).

## What the owner gets

The new frame of the app (sidebar, top bar, scrolling, turning the device, staying signed in), the new Settings with search on every page, the storage safety notice and the new update flow, switched ON in the real app.

- **Artifact:** docs/design/shell-spec.md and Settings mock v3 (approved 12 Nov; docs/design/owner-decisions.md). Two things the owner has not yet seen as a picture and approves in the first look: the storage safety notice and the "More" sheet docked on the right.
- **Switches in this phase:** `foundation.shell`, `settings.v3`, `storage.safety`, `update.v2`, `security.m1`.
- **Already built and in the preview:** all of the above, with the owner's fixes F1, F5, F9, BUG-006 and the F7 freeze recorder.

## Tasks before the first look (lean: one builder at a time, each reviewed once by Opus)

| #   | Task                                                      | Files and notes                                                                                                                                                                                                                                                                                                                                                                                                            | Done when                                                                                                                                                                                                |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.4 | Clear the paperwork clash: merge `main` into `build/next` | working copy `ln-buildnext`. docs/PENDING.md: take main's version. docs/CHANGELOG.md and docs/DECISIONS.md: keep both sides.                                                                                                                                                                                                                                                                                               | pull request #5 has no clash; the test run starts                                                                                                                                                        |
| 0.5 | Merge the scrolling fix (F2, F3, F4, F6, F8)              | `slice/fix-scroll-frame` 142f5231 (`ln-sfix-scroll`; push it first, GitHub has it only up to 5e2c80f7); merge `build/next` into it first, then merge it alone                                                                                                                                                                                                                                                              | test run green; the preview shows one scroll bar everywhere and holds its layout after a turn                                                                                                            |
| 0.6 | Test preset                                               | new branch `slice/p1-preset`; `src/app/flags.ts` (hot file) and `src/settings/flagSettings.ts`; texts in en, es, hi. At the top of Settings › Try new features: a "Test a phase" row with a list (Phase 1, up to Phase 2A, up to Phase 2B, up to Phase 3 … Everything) and one On/Off switch. On = every switch up to that phase is on and the others off. Off = every new part off. The single switches below still work. | unit tests for the phase-to-switch table; one e2e per preset on chromium and ipad-webkit: the app loads, moves between Home, Library, Notebooks and Settings, opens a page, with no error; reviewer PASS |

Phase-to-switch table for task 0.6 (each row adds to the rows above it):

| Preset         | Adds                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| Phase 1        | `foundation.shell`, `settings.v3`, `storage.safety`, `update.v2`, `security.m1` |
| up to Phase 2A | `toolbar.v8`, `page.menus`                                                      |
| up to Phase 2B | `textbox.v2`                                                                    |
| up to Phase 3  | `notebooks.v2`                                                                  |
| up to Phase 4  | `search.v2`                                                                     |
| up to Phase 5  | `home.v2`, `library.v2`                                                         |
| up to Phase 6  | `review.v2`, `study.v2`                                                         |
| up to Phase 7  | `reader.v2`                                                                     |
| up to Phase 8  | `ai.framework`                                                                  |
| Everything     | all remaining new parts                                                         |

The "Shared …" and "Tool list" switches are not in the table; the builder turns one on in a preset only if a part needs it, and says so in the report. A preset state that does not load is a bug to fix, not a reason to skip the test.

## The owner's first look (iPad, Safari, about 20 minutes)

Address: https://build-next.learning-notes-app.pages.dev . Write down the step number and what you saw for anything that does not match.

0. **Make sure the iPad runs the newest version** (the app keeps a saved copy for offline use, and a new version waits for your OK). Open Settings, then About, and read "Version …". It must match the one Claude names when it says the preview is ready (14 Nov: `9439c2b`). If it does not: tap "Update" when the notice shows, or tap "Check for updates now" in About and then the pill; if nothing shows, close the tab completely and open the address again. Never clear the website's data: notes not yet synced live there. After signing in, also check the address bar still starts with `build-next.`.
1. Open the address. **You should see:** the app loads in a few seconds, no error page.
2. Go to Settings, then Try new features. Choose "Phase 1" in "Test a phase" and switch it On. **You should see:** the new frame and the new Settings at once.
3. Close Safari completely and open the address again. **You should see:** you are still signed in (F1), the preset is still On, your notes are there.
4. Move between Home, Library, Notebooks and Settings. **You should see:** each opens at once; the back arrow returns to where you were.
5. In the left list of notebooks and pages, drag from a row, then from empty space. **You should see:** it scrolls the same easy way both times (F2), with a small clear scroll bar that shows where you are (F3).
6. Open a long page and scroll it, then scroll its page list on the left. **You should see:** the same scroll bar in both places; the page's bar is not too big (F6).
7. Turn the iPad sideways, then upright, twice. **You should see:** nothing cut off, the top bar and the tool bar still complete, the page at its normal width (F8).
8. Hold the iPad upright, open a page, tap into a text box so the keyboard shows. **You should see:** the ⚙ gear at the bottom of the left strip is still visible and opens its menu (BUG-006).
9. Tap the three dots at the top of a page. **You should see:** a sheet docked on the right at full height. Tell Claude if you like it there.
10. Open Settings and tap each section. **You should see:** the new layout; the search box stays at the top of every page while you scroll (F9).
11. In the Settings search, type "frame", then "dark". **You should see:** matching settings, including switches from Try new features.
12. Open Settings, then **Let AI use my notebooks** (the new name of the Claude section; searching "Claude" also finds it); tap Inbox, then Activity. **You should see:** three tabs; Inbox says "Nothing is waiting"; nothing breaks.
13. Open Settings, then **Help & tour** (block "About this app"); tap Check for updates now. **You should see:** only a small pill; nothing downloads by itself.
14. In the same block (Settings › Help & tour › About this app), tap "Pretend a must-have update". **You should see:** a full-screen notice counts down 5 seconds, downloads, and the app reopens on the same page.
15. Reload the page. **You should see:** a calm notice "Keep your notes safe: add this app to your Home Screen" with Show how and Back up first. Tap both. **You should see:** three short steps; then "Backup saved." and a file in Downloads. Tell Claude if the notice looks right.
16. Use the app for ten minutes as you normally would. **You should see:** no freeze (F7). If it freezes, note what you had just tapped.
17. In "Test a phase", switch Off. **You should see:** the old screens come back at once.

## After the first look

- Fix each finding (one or two builders, each reviewed once), then the owner re-checks those steps.
- Polish to the release bar: sepia and PC pictures compared with the approved pictures, accessibility, size budget, the full test set green.
- Open items of this phase: the calm redo of the Settings preview picture (mock condition S1); the cause of the freeze (F7), if the recorder caught it; the four small scroll follow-ups (docs/design/owner-decisions.md "Priority 4").
- Old waiting tests (9 to 12 Nov): those for screens this phase replaces are dropped; the rest stay in docs/plans/owner-checks-pending.md (owner, 14 Nov).

## Release

1. Task 0.7: the preview's code goes into `main` with every new part OFF (full test set green first); `build/next` is retired.
2. The owner opens the real app, chooses "Phase 1" in "Test a phase" and switches it On, on each device.
3. Look back: the numbers of this phase go into docs/metrics/phase-results.md.

## Won't do in this phase

Tool bar changes, text box, Notebooks, Search, Home, Library, Review, Reader, AI. The fast test set (task 0.8). Settings previews and the guided tour (Phase 10).

## Decided (no question left for the owner)

- **Unlock switch name (decided by Fable under the question ladder, 14 Nov):** the update details in About use the existing "about.version" switch; no new "about.updateDetails" switch. Fewer switches, nothing changes on screen.
