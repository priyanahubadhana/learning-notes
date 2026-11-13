# How the build runs (simple system, in force from 13 Nov 2026, 20:00 IST)

Owner, 13 Nov: "The way we are following the system, it is not working at all. Let Opus follow the plan and let the cheaper model do the work. This time it must work." This page replaces the 13-section economy mode of the same day (old text: `git show 780c28fe:docs/ECONOMY-MODE.md`). Quality rules and tests are unchanged (rules/quality.md).

## 1. Why the old way failed (measured 13 Nov)

| Cause                                                                                     | Evidence                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One manager did every brief, gate, merge, CI read and docs line itself, one after another | slice branches with new work per 3 hours: 13 to 16 on 12 Nov, 4 to 6 on 13 Nov; commits per 3 hours: 68 to 97, then 17 to 37; 7 manager restarts                         |
| Work was cut into 60-turn pieces, so every fix needed a new brief and a new builder       | 51 sub-manager launches for 17 slices before; on 13 Nov each slice went round gate 2, gate 3 and CI 2 to 4 times                                                         |
| Fable's look was a merge gate and became a design loop                                    | 10 visits, 19 FAIL and 9 PASS; Library failed 4 times, toolbar 1d 3 times in 2 hours; pictures came in pieces or were stale; branches fell 115 to 186 commits behind     |
| CI was the only judge                                                                     | 1 green run in the last 12; `build/next` red 12:36 to 16:49 (6 red runs, 27 minutes each, one at a time); most were format, lint or timing faults a local run would show |
| Rules grew while the build ran                                                            | 24 commits to rule and agent files in one day; this page reached 230 lines with "section 11 wins over older lines"; the state file said "read the bottom first"          |
| Haiku helpers stalled on waiting jobs                                                     | "Haiku mechanics stopped twice while waiting on CI" (state file, run 3)                                                                                                  |
| Estimates were best cases                                                                 | "2 to 4 hours" all day; measured pace was 0.4 merges an hour                                                                                                             |

## 2. Who does what

Opus and Sonnet only. No Haiku in the build.

| Role      | Who                                    | Job                                                                                                                     |
| --------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Manager   | **Opus**, `economy-orchestrator`       | follows docs/plans/build-master-plan.md in the order of docs/BUILD-STATE.md; briefs; keeps the state file; never builds |
| Builders  | **Sonnet**, `economy-builder`, up to 8 | one whole slice each, from the first test to merged, including texts, formatting, pictures and its own fixes            |
| Review    | **Opus**, `economy-gate2`              | gate 2: one read-only check of a finished slice                                                                         |
| Design    | **Fable**, `economy-gate3`             | two looks per slice only: the design check before building and the final look. Hard cases after Opus failed             |
| Main chat | Fable, thin                            | starts the manager, runs the hourly pulse (section 5), talks to the owner                                               |

## 3. The path of one slice (4 steps)

1. **Design check (Fable, before building).** One visit per group of briefs: each brief against its spec and approved mock-up. The reply is a short list per brief of what the final look will judge.
2. **Build (Sonnet, gate 1).** One builder owns the slice: tests first; its own spec files green on chromium and ipad-webkit; lint, tsc, size, dod, ratchet; texts in all languages; `build/next` merged into its branch; a full picture set with an index; the checklist and the repeat-fault list ticked with proof. Fix lists go back to the **same** builder.
3. **Review and merge (Opus gate 2, then the builder merges).** Gate 2 passes the head commit; the builder merges into `build/next` with the part switched **OFF**, runs the local checks, pushes. One merge at a time; up to 3 merges per CI run; a slice that touches a hot file merges alone.
4. **Final look (Fable, gate 3).** Once, on the full picture set. PASS = the part is "ready for the owner" and goes into the iPad checklist. Until then it is merged but OFF, is not in the checklist and is never switched ON by default.

All 3 gates still stand before the owner sees a part (rules/quality.md section 5). The one change: the final look no longer holds the merge of a part that is switched OFF, as on 12 Nov, so branches stay short-lived.

## 4. The eight rules

1. **Usable result first.** The next preview the owner can use on the iPad comes before any new slice. A green `build/next` publishes it.
2. **Fill the lanes first.** At every wake-up the manager first counts running builders against free slices whose files do not overlap, and starts builders before anything else. At most 2 builders run ipad-webkit tests at once.
3. **The manager does not do the work.** No building, merging, test fixing or reading of source and logs. It reads reports (under 150 words), decides, briefs, and updates the state file. It watches CI with one background command (`gh run watch <id> --exit-status`), not a helper.
4. **Green before push.** The push guard runs the quick checks. Before a push to `build/next` the builder also runs `npm run format:check`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run check:links`, `npm run check:size` and every e2e file the merge touched on chromium **and** ipad-webkit. CI confirms; it is not the first place a fault is seen. One run at a time per branch.
5. **Red stops the line.** A red `build/next` is the manager's first job. The same test red twice goes to an Opus builder for the root cause. Never re-run until green; never weaken, skip or delete a test.
6. **The final look happens once.** No index, no visit (every screen × size × theme × level, taken on the head commit). Fable opens every screen kind and lists every fault in one pass, each marked "must fix" or "follow-up". The second look checks the must-fix list and anything those fixes touched. A second FAIL: Fable writes the exact fix and an Opus builder does it.
7. **Escalate by yourself:** Sonnet → Opus → Fable, after 2 failures of the same thing. After 3: undo the slice, write docs/FAILED.md, move on.
8. **Never go quiet.** The state file is one table, rewritten in place after every merge and gate result, under 100 lines; history goes to docs/CHANGELOG.md. The manager restarts only when its context is heavy (about 150,000 tokens) and always ends with one line: `RESTART economy-orchestrator` or `STOPPED: <reason>`. Time estimates use the measured pace and say "likely", never the best case.

## 5. Hourly pulse (main chat)

Run `bash scripts/build-pulse.sh` once an hour. It prints the `build/next` head, the last CI runs, merges and active slice branches in the last 60 minutes and the age of the state file, then `PROGRESS` or `STALL`. On `STALL`, or when a milestone time in docs/BUILD-STATE.md has passed: message the manager once with the pulse output; if the next pulse is still `STALL`, stop it and start a fresh one.

## 6. Briefs

Point to files; never paste them. Under 200 words.

Builder:

```
Slice <id>: <one line, what the user gets>. You own it until it is merged.
Where: worktree C:\Users\pc\Downloads\<folder>, branch slice/<name>, flag <flag> (OFF).
Spec: docs/features/<file>.md IDs <IDs>. Won't do: <lines>. Mock-up: docs/mockups/<file>.
Files: <paths>. Not yours: <hot files, other lanes>. Copy this pattern: <file:line>.
Design check says the final look will judge: <Fable's lines>.
Done already: <SHAs>. Follow .claude/agents/economy-builder.md.
```

Gate 2: `Gate 2 for slice <id>: worktree <folder>, branch slice/<name> at <SHA>, spec docs/features/<file>.md. Builder report: <paste>.`

Design check: `Design check for briefs <ids>: <brief text>; specs <files>; mock-ups <files>.`

Final look: `Final look for slice <id> at <SHA>: picture index <path>; mock-up <file>; design-check lines <lines>.`

## 7. Repeat-fault list (every builder ticks it before the final look)

- a thin scroll track under any row that is cut off;
- a toast sits above the phone tab bar, never on it;
- the sidebar is closed on iPad portrait;
- shared parts only: no browser drop-downs, radio dots or resize grips; Lucide icons only; one button style per panel;
- no key names on touch screens; the focus ring shows for the keyboard only;
- pictures in Light, Dark and Sepia, with real data, tips and toasts closed, taken after the last source edit;
- both levels (Beginner, Professional); iPad landscape and portrait, phone, PC.

## 8. Guards (unchanged, owner approved 13 Nov)

- **Test guard hook** (`.claude/hooks/guard-tests.mjs`). Always blocked: new `.only`, fewer `expect()` calls, emptied test files. Blocked unless the same or the previous line carries `test-guard-reason: <at least 5 words>`: a higher timeout or retry count, `test.slow`, `grepInvert`, `testIgnore`, new `.skip(` / `.fixme(`, deleting a test file. A builder uses a reason only when the owner or Fable approved it; the commit message repeats it.
- **Push guard** (`scripts/push-guard.mjs`, run by `.githooks/pre-push`). Every branch: Prettier on changed files and `check:links`. `build/next` and `slice/*` also: ESLint, `tsc -b`, `check:ratchet`, related Vitest tests, Playwright chromium on changed e2e specs (at most 6). A block prints `PUSH BLOCKED by the push guard: <step>`: fix the cause, never `--no-verify`. Escape only with an approved line `push-guard-skip: <at least 5 words>` in the tip commit message.
- **CI:** the pull request of `build/next` (#5) is the judge and publishes the preview. Build-time docs (BUILD-STATE, PENDING, CHANGELOG, DECISIONS) are written on `main` only; `main` is merged into `build/next` before a CI batch. A hand-started run is green when every job except the weekly, warning-only `webkit` job passed. Red batch: the failing test names its slice; if unclear, take the last merge out and run again.
- **Always waits for the owner:** money, Supabase changes, switching a part ON for daily use, anything that could delete or lose the owner's data. Everything else: safest option, logged in docs/DECISIONS.md "Decisions to review".

## 9. Start, stop, go back

- Start: agent `economy-orchestrator` (Opus) with `Continue the build. Read .claude/agents/economy-orchestrator.md and docs/BUILD-STATE.md from disk and follow them.` After `RESTART economy-orchestrator`, start it again with the same line.
- Go back to the 12 Nov setup: stop it and start `fable-manager` with `Continue the build from docs/BUILD-STATE.md per docs/plans/build-master-plan.md`. Nothing in the code needs undoing.
- Once a week: note `/usage`, and confirm Monday's `webkit` run happened (`gh run list --workflow ci.yml --event schedule --limit 1`).
