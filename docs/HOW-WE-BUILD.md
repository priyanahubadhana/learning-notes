# How we build (from 14 Nov 2026)

The plan is [plans/phase-plan.md](plans/phase-plan.md). The state is [BUILD-STATE.md](BUILD-STATE.md). This page is how the helpers work inside a phase. It replaces the "economy mode" pages of 13 Nov (kept in plans/archive/).

## 1. Roles

| Role          | Who                                      | Does                                                                                                              | Never                                   |
| ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Top manager   | **Fable**, the main chat                 | the artifact and the phase page, the brief for the phase manager, one final look per phase, hard cases, the owner | builds                                  |
| Phase manager | **Opus, medium effort**, `phase-manager` | hands out the planned tasks, orders merges, keeps BUILD-STATE.md                                                  | builds, merges, fixes tests, reads logs |
| Reviewer      | **Opus, medium effort**, `reviewer`      | one read-only check of each finished task                                                                         | edits code                              |
| Builder       | **Sonnet**, `builder`                    | one planned task, from the first test to merged                                                                   | starts unplanned work                   |

Opus helpers are started with medium effort (the start call sets it). No Haiku in the build.

## 2. The path of one task

1. The phase manager gives a planned task to a builder (brief in section 6).
2. The builder writes the tests first, builds until they pass, runs the local checks (section 5) and pushes its branch.
3. The reviewer checks it once against the task's spec lines and the first-look bar (phase plan, section 4). A fix list goes back to the **same** builder.
4. After the reviewer's pass the builder merges, with the part switched OFF. One merge at a time on hot files.
5. The phase manager rewrites the task's row in BUILD-STATE.md.

At the end of a phase: the owner's first look on the iPad, fixes, polish to the release bar, Fable's final look (once, on a full picture set), the full test set green, the owner's yes, then the switch ON in the live app.

## 3. Rules

1. **Only planned work.** A builder builds what its task says. New ideas go to docs/IDEAS.md; unclear points go back to the phase manager.
2. **Green before push.** The push guard runs the quick checks. CI confirms; it is not the first place a fault is seen.
3. **Red stops the line.** A red test on the code line is the phase manager's first job. The same test red twice goes to a builder with `model: opus` for the root cause; if that fails, to Fable. Never re-run until green. Never weaken, skip or delete a test.
4. **Fill free tasks.** Start a builder for every planned task that is free and touches files nobody else is in. Stop adding builders while a reviewed task has waited more than an hour to merge.
5. **One state file.** BUILD-STATE.md is one table, rewritten in place, under 100 lines. History goes to docs/CHANGELOG.md.
6. **Never go quiet.** The phase manager ends every run with `RESTART phase-manager` or `STOPPED: <reason>`. Estimates use the measured pace and say "likely".
7. **Ask the owner only for:** money, logins and Supabase, switching a part ON in the live app, possible data loss, a test on a real device, a real product decision. Otherwise take the safest option and log it in docs/DECISIONS.md "Decisions to review".

## 4. Where code goes

- **Until Phase 0 task 0.6 is done:** `build/next`, through pull request #5, which runs the tests and publishes the preview. Bookkeeping files are written on `main`; merge `main` into `build/next` right after any such push, or the pull request clashes and no test run starts.
- **After task 0.6:** small task branches merge into `main`, new parts OFF in the live app and ON by default at the preview address.
- One working copy per task (`C:\Users\pc\Downloads\ln-<name>`), reused. Never delete folders.
- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.

## 5. Tests

- **Before a push:** `npm run format:check`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run check:links`, `npm run check:size`, and the task's own e2e files on chromium and ipad-webkit.
- **Running Playwright by hand:** set `PW_PORT` to a free port first; every working copy uses port 5199 otherwise, and a second run cannot start. At most 2 iPad runs at once on this PC.
- **On the code line:** today the full set runs on every push (33 to 43 minutes). After Phase 0 task 0.4: a fast set on every merge, the full set every night and before each release.

## 6. Brief for a builder (under 200 words; point to files, never paste them)

```
Task <phase>.<n>: <one line, what the user gets>. You own it until it is merged.
Where: working copy C:\Users\pc\Downloads\<folder>, branch <name>, switch <flag> (OFF).
Spec: docs/features/<file>.md lines <IDs>. Won't do: <lines>. Picture: docs/mockups/<file>.
Files: <paths>. Not yours: <hot files, other tasks>. Copy this pattern: <file:line>.
The final look will judge: <Fable's lines>.
Done when: <tests>. Follow .claude/agents/builder.md.
```

## 7. Faults that kept coming back (every builder checks its own work against this list)

- a thin scroll bar under any row that is cut off; one shared scroll bar everywhere;
- a toast sits above the phone tab bar, never on it;
- the sidebar is closed on iPad upright; the layout after turning the device equals a fresh load;
- shared parts only: no browser drop-downs, radio dots or resize grips; Lucide icons only; one button style per panel;
- no key names on touch screens; a ✕ on every field and pop-up; the focus ring shows for the keyboard only;
- pictures taken after the last source edit, with real data, tips and toasts closed.

## 8. Guards

- **Test guard** (`.claude/hooks/guard-tests.mjs`): blocks `.only`, fewer `expect()` calls and emptied test files; a higher timeout, a skip or a deleted test file needs a `test-guard-reason:` line that the owner or Fable approved.
- **Push guard** (`scripts/push-guard.mjs`, run by `.githooks/pre-push`): Prettier and `check:links` on every branch; ESLint, `tsc -b`, `check:ratchet`, related unit tests and the changed e2e files on `build/next` and task branches. Fix the cause; never `--no-verify`.
- **Secret scan** on every shell command.
- **Backup copy** to "gdrive notes": a hook does it by itself when a helper stops. Do not run it by hand.

## 9. Hourly pulse (main chat, only while a phase is being built)

`bash scripts/build-pulse.sh` prints `PROGRESS` or `STALL`. On `STALL`: message the phase manager once; if the next pulse is still `STALL`, stop it and start a fresh one.

## 10. Start and stop

- Start: agent `phase-manager` (Opus, medium effort) with the phase page and "Read .claude/agents/phase-manager.md and docs/BUILD-STATE.md and follow them."
- Stop: the owner says pause. Stop every helper, switch the pulse off, write `PAUSED` at the top of BUILD-STATE.md.
