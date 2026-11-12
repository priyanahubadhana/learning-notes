# Are we building this the right way? (research, 13 Nov 2026)

Question: does the way we build (Opus orchestrator, Sonnet builders, Fable gates, flags, CI-green release) and the stack (React, BlockNote, Dexie, Supabase, iPad PWA) match what experts advise?

Short answer: **mostly yes.** The build method matches Anthropic's own advice closely. The two real gaps are (1) our hard rules live in prose, not in hooks, and (2) notes on an iPad are less safe than our tests can show, because the test browser is not real Safari.

Limits of this research: done in one fast pass. Anthropic pages were read directly. Boris Cherny's tips were found only in second-hand write-ups, so they are marked as such. Repo facts were checked with quick searches, not a full audit.

## 1. What we do right

| What we do                                                                                                            | Who agrees                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLAUDE.md is 65 lines and points to rule files read only when needed                                                  | Anthropic: "Aim to keep CLAUDE.md under 200 lines"; every line "takes a little of Claude's attention on every task" [costs], [best practices]                                                           |
| Spec first, then a fresh helper builds from it                                                                        | Anthropic: once the spec exists, "start a fresh session to build from it" [best practices]                                                                                                              |
| A check must pass before "done" (tests, tsc, lint, size, check:dod)                                                   | Anthropic lists tests, typecheck and CI as the enforced form of "done" [best practices]. Boris Cherny (second-hand) calls verification the most important thing, worth 2 to 3 times the quality [InfoQ] |
| Gate 2 is a reviewer that did not write the code                                                                      | Anthropic: a fresh reviewer "isn't swayed by the reasoning that produced the code" [best practices]                                                                                                     |
| Sonnet builds, Haiku does simple jobs, the big model is kept for hard cases                                           | Anthropic: "Sonnet handles most coding tasks well"; "Haiku is a good fit for subagents doing simple jobs" [costs], [best practices]                                                                     |
| Economy mode removes the sub-manager relay layer                                                                      | Anthropic: a subagent gives "parallelism or a fresh pair of eyes ... but not a smarter answer", and costs tokens and sometimes time [best practices]                                                    |
| Builders do not wait for CI; orchestrator restarts with state in a file                                               | Anthropic: the first message after a break longer than the cache lifetime "reprocesses your full context" [costs]. This is exactly the waste ECONOMY-MODE measured                                      |
| Parallel only on files that do not overlap; own worktree per slice                                                    | Anthropic's 16-agent compiler project: parallel work only pays when tasks are independent, and strong tests plus strict CI kept agents on track [C compiler]                                            |
| Small slices behind flags, release only on green CI, deny rules for force-push and .env                               | Anthropic's rule for unattended runs: know what done is, can check its own work, can only touch what it should [best practices]                                                                         |
| The app already asks for persistent storage (`src/core/storage.ts`) and Supabase migrations enable row level security | WebKit and Dexie both advise calling `navigator.storage.persist()` [WebKit storage], [Dexie]                                                                                                            |

## 2. What contradicts expert advice

| #   | Our practice                                                                                                                                                    | What experts say                                                                                                                                                                                                                                                                           | Source                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| C1  | Hard rules are prose only ("tests are never weakened", "never write secrets", mirror copy, changelog after every change). `.claude/settings.json` has no hooks. | "If something has to happen every time, make it a hook, a deny rule, or a managed setting. CLAUDE.md is for guidelines, and Claude is allowed to decide a guideline doesn't apply." Adding emphasis that still gets missed "is a sign the line belongs in a hook."                         | [best practices]                                         |
| C2  | The global rule says Fable → Opus → Sonnet/Haiku "for every task".                                                                                              | Use the main chat for quick, targeted changes and when phases share context; a fresh subagent "can end up slower than doing the task where you are". Multi-agent uses about 15 times the tokens of a chat, and "most coding tasks involve fewer truly parallelizable tasks than research". | [sub-agents], [best practices], [multi-agent]            |
| C3  | Up to 6 builders at once; gate 3 looks at screenshots in batches of 2 to 4 slices.                                                                              | The limit is review, not building: "the natural bottleneck on all of this is how fast I can review the results" (Simon Willison). He lands "one significant change at a time". Our own data agrees: about 3 rework rounds per slice.                                                       | [Willison]                                               |
| C4  | Gate 2 and gate 3 "reject a slice on any ✗" across a 16-line checklist.                                                                                         | "A reviewer that's asked to find problems will always find something. If you fix every finding, you end up with extra abstraction layers and tests for cases that can't happen." Ask for gaps that affect correctness and skip style.                                                      | [best practices]                                         |
| C5  | iPad quality is proven by Playwright `ipad-webkit` in CI on Linux.                                                                                              | That is the WebKit engine with an iPad screen size, not iPadOS Safari. It cannot show storage eviction, the 7-day rule, Home Screen behaviour, Apple Pencil pressure or Scribble. Developers report Pencil pointer bugs that exist only on real iPads.                                     | [Playwright], [Apple forum Pencil], [WebKit pointer bug] |
| C6  | "Always Apply" sends every helper to 4 design docs plus the conditions in a 377-line PENDING.md.                                                                | Point to files (we do), but give only what the task needs; long always-on context is the top cost driver.                                                                                                                                                                                  | [costs], [context engineering]                           |
| C7  | The owner (a beginner) approves by one iPad test; nobody human reads code.                                                                                      | Anthropic for unattended runs: "have a person approve the result at the end". Our substitute is tests + 2 model gates, which is reasonable, but it makes C1 and C5 matter more: the machine checks are the only real judge.                                                                | [best practices]                                         |

None of these is a reason to stop the build. C1 and C5 are the ones that can let a real defect through.

## 3. Risks we have not covered

### iPad storage (the biggest one)

1. **Safari tab = notes can be wiped after 7 days.** "ITP deletes ... all other script-writeable storage after 7 days of no user interaction" with the site. That includes IndexedDB (where Dexie keeps the notes) and the service worker cache. Only an app added to the Home Screen is exempt. [ITP]
2. **Even on the Home Screen, storage is "best effort" unless persistence is granted.** WebKit may delete a whole site's data, least recently used first, under storage pressure. Safari decides on its own whether to grant `persist()`; being a Home Screen app is one signal, and there is no prompt. We call `persist()` but do not tell the user when the answer is "no". [WebKit storage]
3. **Until sync is live, the iPad copy is the only copy.** Accounts are required, but if sync is not yet shipping, risks 1 and 2 mean real data loss. Dexie's own docs say sync is what makes eviction survivable. [Dexie]
4. **Safari and the Home Screen app do not share data.** A user who writes notes in Safari and then installs the app sees an empty app. Only sync (or an export/import step) carries the notes over. [WebKit bug 181849]
5. **iOS bug: "Connection to Indexed Database server lost".** Reported from iOS 17.4, still reported on iOS 18 and in October 2025, including by Dexie's author. Dexie's reopen does not recover; unsaved data is lost; sometimes only restarting the app or device helps. The repo has no handling for this error. [WebKit bug 273827]
6. **Quota errors.** Writes throw `QuotaExceededError` when space runs out; images and ink make this likely on a full iPad. [Dexie]

### Apple Pencil in a web app

7. Pencil samples at 240 Hz, the page draws at 60 Hz; pointer events are dropped on slow frames, and `getCoalescedEvents()` support in Safari is recent and uneven. Scribble changes which pointer events fire. Fixed-position bars can jump when the keyboard opens. None of this shows up in CI. [Apple forum 240Hz], [Apple forum Scribble], [WebKit pointer bug]

### BlockNote

8. Typing lag grows with the number of blocks (issue #2595, about 50k characters), and React custom blocks have caused endless re-renders on mobile (PR #2830, open June 2026). We are on 0.56, still pre-1.0, so upgrades can break things. [BlockNote 2595], [BlockNote 2830]

### Supabase

9. **Free plan pauses a project with too little activity in a week**, and a paused project is offline until restored by hand. Free plan backups are limited. This does not fit "millions of users" at ₹0. [Supabase pausing]
10. **Row level security mistakes are the number one way AI-built Supabase apps leak data** (about 16,000 exposed databases in one 2026 study; CVE-2025-48757). Tables made by SQL do not get RLS automatically. Our migrations enable it, but nothing in CI proves every table has it. [UpGuard], [Cybernews]

### Build process

11. 48 worktrees exist. Each is a full copy; stale ones invite a helper building on old code.
12. Anthropic notes errors compound in agent chains: one wrong step can send an agent down "entirely different trajectories". Our guard (2 tries, then hand up) is right; keep it. [multi-agent]

## 4. Recommendations, ranked by impact

| #   | Recommendation                                                                                                                                                                                                                                                                        | Why                                                                          | Mark                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | **Add a real-iPad storage and Pencil checklist to the owner's one iPad test**: installed to Home Screen; storage shows "protected"; notes still there after closing the app; Pencil strokes smooth while typing nearby; Scribble on and off.                                          | Closes C5 with no code. CI cannot see these.                                 | **Safe to apply now** (a docs line in the test list)                              |
| 2   | **Handle "Connection to Indexed Database server lost" and `QuotaExceededError`**: catch them in one place, keep the unsaved text in memory, show a calm "Reload to keep working" message, add a unit test. Show the `persisted()` answer and space used in the existing health check. | Risks 2, 5, 6. Small, one area, behind no behaviour change when all is well. | **Safe to apply now** (as a normal slice with spec lines)                         |
| 3   | **Narrow the gate 2 brief**: "report gaps against the spec and anything that breaks behaviour; skip style", and make sure `economy-gate2` has read-only tools in its file header so the limit is enforced, not asked for.                                                             | C4. Fewer rework rounds, which is our largest measured cost.                 | **Safe to apply now** (brief wording; no rule changes)                            |
| 4   | **Add a CI check that every table in `supabase/migrations` has row level security on**, and fail the build if not.                                                                                                                                                                    | Risk 10. A script, free.                                                     | **Safe to apply now**                                                             |
| 5   | **Remove merged or stale worktrees** (`git worktree prune`, then remove those whose branch is merged).                                                                                                                                                                                | Risk 11.                                                                     | **Safe to apply now**                                                             |
| 6   | **Move 3 or 4 no-exception rules into hooks**: a Stop hook that runs tsc + lint; a PreToolUse hook that blocks edits which delete or skip tests; a secret scan before commit; the mirror copy as a hook. Keep the set small.                                                          | C1. This is Anthropic's main advice and our main gap.                        | **Needs the owner** (changes `.claude/settings.json`, which is part of the rules) |
| 7   | **Decide the storage promise before real users**: (a) the app asks people to "Add to Home Screen" and warns in a Safari tab that notes may be removed after 7 days; (b) sync, or at least a one-tap export, ships before anyone is told their notes are safe.                         | Risks 1 to 4.                                                                | **Needs the owner** (user-facing words and order of phases)                       |
| 8   | **Change "every task" in the global hierarchy to "build and large tasks"**; small fixes run in one chat. Approve ECONOMY-MODE section 7 at the same time.                                                                                                                             | C2.                                                                          | **Needs the owner** (rule change)                                                 |
| 9   | **Start at 3 or 4 builders, go to 6 only if rework stays under 2 rounds per slice** on day 1.                                                                                                                                                                                         | C3. Owner already chose 6, so this is a second look.                         | **Needs the owner**                                                               |
| 10  | **Supabase plan**: free is fine for building and the owner's own use; a paid plan (about $25 a month) is needed before public users, for no pausing and real backups. Until then keep a daily ping so the project is not paused.                                                      | Risk 9.                                                                      | **Needs the owner** (money)                                                       |
| 11  | **Add a BlockNote long-note speed test** (a 500-block note, typing delay budget) to CI, and pin BlockNote to an exact version.                                                                                                                                                        | Risk 8.                                                                      | Safe to apply now                                                                 |
| 12  | **Slim "Always Apply"** into one short checklist file per role, built from the 4 design docs.                                                                                                                                                                                         | C6.                                                                          | Needs the owner (rule change), low urgency                                        |

## Sources

Anthropic

- [best practices] https://code.claude.com/docs/en/best-practices
- [costs] https://code.claude.com/docs/en/costs
- [sub-agents] https://code.claude.com/docs/en/sub-agents
- [multi-agent] https://www.anthropic.com/engineering/multi-agent-research-system
- [context engineering] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- [C compiler] https://www.anthropic.com/engineering/building-c-compiler
- [InfoQ] https://www.infoq.com/news/2026/01/claude-code-creator-workflow (second-hand report of Boris Cherny's workflow)

Builders

- [Willison] https://simonwillison.net/2025/Oct/5/parallel-coding-agents/

Stack

- [ITP] https://webkit.org/tracking-prevention/
- [WebKit storage] https://webkit.org/blog/14403/updates-to-storage-policy/
- [WebKit bug 273827] https://bugs.webkit.org/show_bug.cgi?id=273827
- [WebKit bug 181849] https://bugs.webkit.org/show_bug.cgi?id=181849
- [Dexie] https://dexie.org/docs/StorageManager
- [Playwright] https://playwright.dev/docs/browsers
- [Apple forum 240Hz] https://developer.apple.com/forums/thread/689375
- [Apple forum Scribble] https://developer.apple.com/forums/thread/662874
- [Apple forum Pencil] https://developer.apple.com/forums/thread/776468
- [WebKit pointer bug] https://bugs.webkit.org/show_bug.cgi?id=210454
- [BlockNote 2595] https://github.com/TypeCellOS/BlockNote/issues/2595
- [BlockNote 2830] https://github.com/TypeCellOS/BlockNote/pull/2830
- [Supabase pausing] https://supabase.com/kb/faqs/platform/free-project-pausing
- [UpGuard] https://www.upguard.com/blog/everything-everywhere-systemic-data-exposure-in-supabase-apps
- [Cybernews] https://cybernews.com/news/16000-supabase-databases-exposed/

Not verified in this pass: the exact Playwright wording (the point that its WebKit build is not Safari is long-standing), Boris Cherny's original posts, and whether iPadOS 26 changes any storage rule. Re-check before acting on rows 7 and 10.
