# Speed-up verdict (Fable, 13 Nov 2026)

Question: do Opus's 4 workflow/order changes keep the 3 gates, every test, the Definition of Done and the design rules intact (rules/quality.md, docs/ECONOMY-MODE.md sections 11 and 12, docs/plans/build-master-plan.md), and may the orchestrator apply them?

Short answer: yes to all 4, each with conditions. None removes, skips or weakens a test, and none touches a gate. Nothing was changed by this review.

Read for this verdict: `.github/workflows/ci.yml` on `main`, the three docs' gate/test/CI sections, and `origin/build/next...origin/slice/perf-start` (6 files, +398 / -55).

## 1. e2e and pencil-webkit wait for `checks` (`needs: checks`)

**APPROVE WITH CONDITION**

- Quality risk: none to the tests (the same jobs run on every run that passes `checks`); the only loss is that a run red in `checks` no longer shows its end-to-end failures in the same run.
- Conditions:
  1. "Green" is read job by job: every one of `checks`, `e2e` (4 parts) and `pencil-webkit` (2 parts) must say **success**. A **skipped** job is never green. `deploy` keeps `needs: [checks, e2e, pencil-webkit]` unchanged.
  2. Keep each job's own `if:` line as it is; only add `needs: checks`.
  3. Fix the comment above `pencil-webkit` ("It runs beside `checks`, so it adds no waiting time"), which becomes untrue.
  4. The "+2 min on green runs" figure is a guess: green runs wait for the whole `checks` job (install, audit, lint, unit tests, build, size). Measure it on the first run; if it is over 6 minutes, report back before keeping the change.

## 2. Cache the Playwright browsers

**APPROVE WITH CONDITION**

- Quality risk: a stale or half-saved browser could make tests run on the wrong build, or fail for reasons that are not the code.
- Conditions:
  1. Cache key = runner OS + browser name (chromium / webkit) + the exact Playwright version from `package-lock.json`. No `restore-keys` fallback, so a version bump always downloads fresh.
  2. The cache holds only the browser folder (`~/.cache/ms-playwright`). The Linux system packages are still installed on every run (`npx playwright install-deps <browser>`), and on a cache miss the present install-with-retries step runs unchanged.
  3. The cache action is pinned to a commit SHA like every other action in the file (rules/security.md).
  4. No test command, shard count, timeout or retry number changes in the same commit.

## 3. Do not start the weekly `webkit` job on hand-started runs

**APPROVE WITH CONDITION**

- Checked: `webkit` runs `npm run test:e2e:webkit` = the whole suite on desktop Safari (project `webkit`). `pencil-webkit` runs only the `ipad-webkit` list. So `webkit` **is** the only run of most specs in WebKit; it must keep running. The Monday schedule (`cron: '0 3 * * 1'`) stays, so no test loses its only run. The job is warning-only (`continue-on-error`) and is not a gate.
- Quality risk: if the Monday run were ever lost, the full-suite WebKit run would vanish without anyone noticing.
- Conditions:
  1. Only the `webkit` job's `if:` changes. The `schedule` trigger and the job stay. `checks`, `e2e`, `pencil-webkit` and `visual-baselines` are untouched.
  2. Keep a way to start it by hand: a `workflow_dispatch` tick-box (for example `full_webkit`, off by default) that turns the job on. Do not simply delete the hand-start path.
  3. ECONOMY-MODE section 11 rule 7 says today "not skipped by editing anything". This is a change to that written rule: reword rule 7 in the same commit and log it in docs/DECISIONS.md under "Decisions to review" for the owner.
  4. Weekly housekeeping (ECONOMY-MODE section 10) gets one line: "confirm Monday's `webkit` run happened and read its warnings".

## 4. Merge `slice/perf-start` first and alone

**APPROVE WITH CONDITION**

- Checked `playwright.config.ts`: the only change is one added line, `/startSpeed/`, in the `ipad-webkit` list. It adds a test. No timeout, retry, `testIgnore`, `grepInvert`, skip or fixme is added or raised anywhere in the config.
- Checked `e2e/startSpeed.spec.ts` (new): it asserts ready in under 4,000 ms and that all starters arrive (16 pages, 112 blocks) and that a second start adds nothing. The 40,000 and 60,000 ms values are upper waits inside a new test, not raised limits on an old one; the 4 s assertion is the real bar. Acceptable.
- Merging alone with its own CI run is not just allowed, it is required: the slice touches `src/App.tsx`, a hot file (ECONOMY-MODE section 11 rule 4). Going first is sensible because every later WebKit test starts faster.
- Quality risk: starters now arrive in the background, so a person who opens the template list in the first second or two could see a short or empty list.
- Conditions:
  1. Gate 2 passes on the exact commit being merged, including the 2 missing tests, with no skipped test.
  2. Gate 2 also confirms, with a test, that the template list shown during seeding fills in by itself (or waits), the same way "new page with the study template" already waits in `App.tsx`. If it does not, that is a fix before merge, not after.
  3. Gate 3: no screen is redrawn, so no full screenshot set is needed; one cold-start picture pair on `ipad-webkit` (first frame, and template list opened at once) is enough to show no empty flash or jump. A later commit re-opens the gates as usual.
  4. Its own full CI run on `build/next`, green job by job, before the next batch is merged. One run at a time (rule 6).

## What stays exactly as it was

3 gates on every slice; Fable's two checks per slice; every test and every shard; the test guard (section 12); "fix the cause, never re-run until green"; the Definition of Done; the size budget; nothing reaches `main` without a green run.
