# How we build (from 14 Nov 2026)

The plan is [plans/phase-plan.md](plans/phase-plan.md). The state is [BUILD-STATE.md](BUILD-STATE.md). This page is how the helpers work inside a phase. It replaces the "economy mode" pages of 13 Nov (kept in plans/archive/).

## 1. Roles: the cheapest model that can do the job does it

| Who                     | Does                                                                                                                                                                       | Never                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Sonnet**, `builder`   | one planned task, from the first test to merged                                                                                                                            | starts unplanned work            |
| **Opus, medium effort** | manages the build; reviews each task once (`reviewer`): the code against the plan and the look against the approved picture; takes a task over when Sonnet failed it twice | weakens a test to get green      |
| **Fable**               | plans each phase with the owner; solves what Opus could not                                                                                                                | does routine reviews or building |

Opus helpers are started with medium effort (the start call sets it). No Haiku in the build.

**Two ways to run:**

- **Lean (default).** The main chat is on Opus at medium effort and manages directly: no manager helper, one or two builders, no hourly pulse. Builders report to the main chat.
- **Full team (only on the owner's word).** The main chat starts one `phase-manager` (Opus) for the phase; it runs as many builders as the phase has separate tasks; the main chat checks the hourly pulse (section 9).

## 2. The path of one task

1. The manager (the main chat in lean mode, the phase manager in full mode) gives a planned task to a builder (brief in section 6).
2. The builder writes the tests first, builds until they pass, uses it for real on an iPad size, runs the local checks (section 5) and pushes its branch.
3. The reviewer checks it once: the code against the task's spec lines, and the pictures against the approved picture. A fix list goes back to the **same** builder.
4. After the reviewer's pass the builder merges, with the part switched OFF. One merge at a time on hot files.
5. The manager rewrites the task's row in BUILD-STATE.md and adds one row to docs/metrics/tasks.csv (when merged, phase, task, builder model, helper tokens, review rounds, test runs green and red, hours from start to merged).

At the end of a phase: the owner's first look on the iPad, fixes, polish to the release bar, the reviewer's check of the full picture set against the approved pictures, the full test set green, the owner's yes, then the switch ON in the live app.

## 3. Rules

1. **Only planned work.** A builder builds what its task says. New ideas go to docs/IDEAS.md; unclear points go back to the manager.
2. **Green before push.** The push guard runs the quick checks. CI confirms; it is not the first place a fault is seen.
3. **Red stops the line.** A red test on the code line is the manager's first job. Never re-run until green. Never weaken, skip or delete a test.
4. **Escalate by yourself.** The same thing failing twice moves up: Sonnet, then a builder with `model: opus`, then Fable. Log each step in BUILD-STATE.md.
5. **No queue.** Merge a task as soon as it is reviewed. Do not add builders while a reviewed task has waited more than an hour to merge.
6. **One state file.** BUILD-STATE.md is one table, rewritten in place, under 100 lines. History goes to docs/CHANGELOG.md.
7. **Never go quiet.** A phase manager ends every run with `RESTART phase-manager` or `STOPPED: <reason>`. Estimates use the measured pace and say "likely".
8. **Questions go up a ladder, and the owner is last (owner, 14 Nov).** First the plan and the approved picture answer. If they do not, the manager (Opus) decides. If Opus is unsure, Fable decides. Each decision taken this way is logged in docs/DECISIONS.md "Decisions to review" and the work goes on. The owner is asked only for: money; logins and Supabase; switching a part ON in the live app; possible data loss; a test on a real device; and a real product or design decision, meaning one that changes an approved picture, changes or drops a feature, or changes a rule.
9. **When the safety check blocks a planned action,** no helper can overrule it. The manager notes the kind of action and asks the owner once to allow that kind for good, so the same stop does not come back.

## 4. Where code goes

- **Until Phase 0 task 0.7 is done:** `build/next`, through pull request #5, which runs the tests and publishes the preview. Bookkeeping files are written on `main`; merge `main` into `build/next` right after any such push, or the pull request clashes and no test run starts.
- **After task 0.7:** small task branches merge into `main`, new parts OFF in the live app; the owner switches a phase on with the test preset.
- **Branch names start with `slice/`** (for example `slice/p1-preset`), so the push guard runs its full checks on them.
- One working copy per task (`C:\Users\pc\Downloads\ln-<name>`), reused. Never delete folders.
- **Hot files** (one builder at a time, merged alone): `src/App.tsx`, `src/core/db.ts`, `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`.

## 5. Tests

- **Before a push:** `npm run format:check`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run check:links`, `npm run check:size`, and the task's own e2e files on chromium and ipad-webkit. Run them in the task's own working copy, not in the main one.
- **Running Playwright by hand:** set `PW_PORT` to a free port first; every working copy uses port 5199 otherwise, and a second run cannot start. At most 2 iPad runs at once on this PC.
- **On the code line:** today the full set runs on every push (33 to 43 minutes). After Phase 0 task 0.8: a fast set on every merge, the full set every night and before each release.

## 6. Brief for a builder (under 200 words; point to files, never paste them)

```
Task <phase>.<n>: <one line, what the user gets>. You own it until it is merged.
Where: working copy C:\Users\pc\Downloads\<folder>, branch slice/<name>, switch <flag> (OFF).
Spec: docs/features/<file>.md lines <IDs>. Won't do: <lines>. Picture: docs/mockups/<file>.
Files: <paths>. Not yours: <hot files, other tasks>. Copy this pattern: <file:line>.
The reviewer will compare with: <the approved picture and the lines most likely to go wrong>.
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
- **Push guard** (`scripts/push-guard.mjs`, run by `.githooks/pre-push`): Prettier and `check:links` on every branch; ESLint, `tsc -b`, `check:ratchet`, related unit tests and the changed e2e files on `build/next` and `slice/` branches. Fix the cause; never `--no-verify`.
- **Pushes:** helpers may push normally; force pushes are denied (owner, 14 Nov).
- **Secret scan** on every shell command.

## 9. Hourly pulse (full team only)

`bash scripts/build-pulse.sh` prints `PROGRESS` or `STALL`. On `STALL`: message the phase manager once; if the next pulse is still `STALL`, stop it and start a fresh one.

## 10. Start and stop

- **Start, lean:** the owner says "restart" and switches the main chat to Opus at medium effort. The main chat starts the next task of docs/BUILD-STATE.md with one `builder`.
- **Start, full team:** agent `phase-manager` (Opus, medium effort) with the phase page and "Read .claude/agents/phase-manager.md and docs/BUILD-STATE.md and follow them."
- **Stop:** the owner says pause. Stop every helper, switch the pulse off, write `PAUSED` at the top of BUILD-STATE.md.
