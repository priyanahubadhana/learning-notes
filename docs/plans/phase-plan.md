# Phase plan (in force from 14 Nov 2026)

This is the plan the build follows. It replaces the order and the roles of `build-master-plan.md` (12 Nov), which stays as the catalogue of what each part contains. Why the change: [build-diagnosis-2026-11-14.md](build-diagnosis-2026-11-14.md).

**State: PAUSED.** Nothing is built until the owner says "restart".

## 1. The method (the owner's way, which worked before)

Every phase goes through the same six steps, in this order.

1. **Artifact.** The picture of the phase: a mock-up the owner has approved. No approved picture, no building.
2. **Plan with Fable.** One short phase page: what is in, what is already built, the tasks (each small enough for one builder in one day), the test list for the owner, and what will not be done. All questions go to the owner at once. The owner says yes once.
3. **Build.** Only what the plan lists. During the build the only new work is fixing bugs and reworking things that do not behave as planned. New ideas go to docs/IDEAS.md.
4. **First look.** As soon as the phase works, the owner tests it on the iPad at the preview address, with the phase switched on there. Findings are written down, one by one.
5. **Fix and polish.** The findings are fixed, then the phase is brought to the full bar (section 4).
6. **Release.** The owner says yes, and the phase is switched ON in the live app. A short look back records the pace and what to do better.

Only one phase is in steps 3 to 6 at a time. The next phase may be in steps 1 and 2 meanwhile.

## 2. Who does what

| Role          | Who                                       | Job                                                                                                                                                       |
| ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top manager   | **Fable** (the main chat)                 | Steps 1 and 2 of every phase, the brief for the phase manager, one final look per phase, hard cases, talking to the owner. Short visits during the build. |
| Phase manager | **Opus**, medium effort (`phase-manager`) | Runs one phase: hands the planned tasks to builders, orders the merges, keeps docs/BUILD-STATE.md current. Never builds.                                  |
| Reviewer      | **Opus**, medium effort (`reviewer`)      | Checks each finished task once against the plan and the first-look bar.                                                                                   |
| Builders      | **Sonnet** (`builder`)                    | One planned task each, from the first test to merged.                                                                                                     |

How the helpers work day to day: [docs/HOW-WE-BUILD.md](../HOW-WE-BUILD.md).

## 3. Speed

The diagnosis showed that building was never the slow part; getting work merged, tested and in front of the owner was. So speed comes from these, in order of effect:

1. **A fast test set guards each merge** (about 10 minutes; today 33 to 43). The full set runs every night and before each release.
2. **One code line.** Small tasks merge into `main` behind switches that are OFF in the live app. No side branch, no queue of finished parts, no clashing paperwork.
3. **Small tasks.** A task is one screen or one behaviour, a day at most. Builders understood small tasks; they did not understand whole areas.
4. **As many builders as the phase has separate tasks.** There is no fixed number. The phase manager starts another builder whenever a planned task is free and touches files nobody else is in. It stops adding builders when a reviewed task has waited more than an hour to merge, because then the merging is the limit, not the building.
5. **The owner's test comes early**, so the costly polish is done once, on the right thing.
6. **Preparing ahead by one phase only.** While the owner tests phase N, builders may fix the known problems of phase N+1. Nothing further ahead.

Pace is measured, not promised: `scripts/build-pulse.sh` keeps one line an hour, and each phase ends with its real numbers.

## 4. Quality: two bars, the second one unchanged

- **First-look bar** (before the owner's first test of a phase): it works; Beginner and Professional; light and dark; iPad upright and sideways, and phone; the key flows have tests; ten minutes of real use in Safari on an iPad size shows no break (sign-in stays, turning the device, scrolling, no freeze).
- **Release bar** (before a phase is switched ON in the live app): the full Definition of Done in rules/quality.md, as it is today: sepia and PC as well, every screen pictured, accessibility, size budget, nothing lost against the inventory, Fable's final look, the full test set green.

No test is weakened, skipped or deleted. No feature is dropped. The design rules do not change.

## 5. Phase order

Three orders were compared.

|                                                    | Order A (Fable, first proposal)                     | Order B (owner, first message)           | Order C (owner, second message)                                      |
| -------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Order                                              | frame + notebooks + search + settings, then writing | frame, toolbar, settings, notebook, rest | frame, Pencil + text box + toolbar, notebook, search, settings, rest |
| Top priority (writing on the page) arrives         | third or later                                      | second                                   | second                                                               |
| First release                                      | slower (four areas at once)                         | fast                                     | fast                                                                 |
| Settings in time for the toolbar's unlock switches | yes                                                 | no (settings after toolbar)              | no (settings last)                                                   |
| Builders get small, clear phases                   | no                                                  | yes                                      | yes                                                                  |

**Chosen: Order C, with one change: Settings travels with the frame.** Settings holds the "Professional features" switches and the "Try new features" list that every later phase needs, and it is already built and reviewed, so bringing it forward costs one extra part of the owner's first test. The writing phase is split in two so its built half reaches the owner while its new half is being built.

| Phase | What the owner gets, switched ON in the live app                                                                                               | State today                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 0     | Reset: clean rules, fast tests, one code line. No features.                                                                                    | rules cleaned 14 Nov; the rest is section 6       |
| 1     | **The frame and Settings**: sidebar, top bar, scrolling, turning, staying signed in, storage safety, the update flow, new Settings with search | built; owner found F1 to F9, BUG-006; fixes built |
| 2A    | **Writing tools**: the tool bar, favourites, page menus, the format bar                                                                        | built; two parts parked                           |
| 2B    | **Text box and Pencil**                                                                                                                        | not built; the largest new piece                  |
| 3     | **Notebooks**                                                                                                                                  | built                                             |
| 4     | **Search**                                                                                                                                     | built                                             |
| 5     | **Home and Library**                                                                                                                           | built                                             |
| 6     | **Review and Study**                                                                                                                           | mostly built; two parts parked                    |
| 7     | **Reader**                                                                                                                                     | built, parked, not yet seen by the owner          |
| 8     | **AI and the Claude connector**                                                                                                                | partly built; online part needs Supabase steps    |
| 9     | **Things inside a page; pictures, PDF, audio**                                                                                                 | not built; needs its artifact first               |
| 10    | **Safety and data; system layer; welcome and tours**                                                                                           | not built; needs its artifact first               |

## 6. Phase 0: reset (no features)

| #   | Task                                                                                                                                                                                                         | Who               | Needs the owner                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------- |
| 0.1 | Rules, helper files, memory notes, PENDING, HANDOFF and BUILD-STATE rewritten so they agree                                                                                                                  | Fable             | done 14 Nov                                                 |
| 0.2 | Opus thinking effort from low to medium                                                                                                                                                                      | Fable             | done 14 Nov if the setting could be changed; else the owner |
| 0.3 | Merge the reviewed scrolling fix (F2, F3, F4, F6, F8; `slice/fix-scroll-frame` 5e2c80f7) into `build/next`                                                                                                   | builder           | no                                                          |
| 0.4 | Fast test set for each merge; full set nightly and before a release; docs formatting checked apart from the app                                                                                              | builder, reviewer | no                                                          |
| 0.5 | Find the cause of the three iPad tests that fail on this PC every time (textBoxFree:461, toolsRefresh:60, undoHistory:210)                                                                                   | Opus builder      | no                                                          |
| 0.6 | One code line: when `build/next` is green on the full set, release it to `main` with every new part OFF, then retire `build/next`. The preview address then shows `main` with the current phase switched on. | builder, reviewer | **yes: it changes the live app's code (parts stay off)**    |
| 0.7 | The hourly pulse script reads the phase board                                                                                                                                                                | builder           | no                                                          |
| 0.8 | List the unused working copies for removal, one by one                                                                                                                                                       | builder           | yes, before anything is removed                             |

## 7. The phases in detail

Each phase gets its own page (`docs/plans/phases/phase-<n>.md`) in step 2, written by Fable just before it starts. This section fixes what belongs where, so nothing is lost.

### Phase 1: the frame and Settings

- **Artifact:** shell spec (docs/design/shell-spec.md), Settings mock v3 (approved 12 Nov).
- **Built and in the preview:** the frame (`foundation.shell`), shared parts steps 1 and 2, Settings v3 (`settings.v3`), storage safety (`storage.safety`), the update flow (`update.v2`), security upgrade (`security.m1`), fixes F1, F7 recorder, F9, BUG-006.
- **To do:** scrolling fix from Phase 0; shared parts step 3 (parked, `slice/0g-parts-3` 9840315e); the freeze (F7): cause still unknown, recorder is running on the preview; the calm redo of the Settings preview picture (mock condition); the owner's decisions waiting in docs/PENDING.md.
- **Owner's test:** the first-preview checklist parts 1, 2, 6, 10 and steps 43, 44; re-check F1 to F9.

### Phase 2A: writing tools

- **Artifact:** toolbar mock v8, favourites and long-press strip (approved 12 Nov).
- **Built and in the preview:** tool bar steps 1a to 1d (`toolbar.v8`), page menus 12a, 12b (`page.menus`).
- **Parked, reviewed:** tool bar 1e, 1f and BUG-003 (`slice/1-toolbar-v8` 19e158cf); page menus rest (`slice/12-page-menus-rest` 627f07cf).
- **Open problems:** BUG-002 (format bar leaves the screen), BUG-003 (hide the bar while writing), the "more tools" arrow over Backspace.
- **Owner's test:** checklist parts 7 and 8.

### Phase 2B: text box and Pencil

- **Artifact:** the Box card in toolbar mock v8 and the owner's text box decisions of 11 Nov (docs/design/owner-decisions.md). Step 2 first checks that these are a complete picture; if a part is missing, a small mock-up is made and approved before building.
- **Decided (12 Nov):** keep the layout engine and the saved pages; rebuild only the touch, select and drag layer on the new foundation (`textbox.v2`).
- **Open problems to solve here:** the cursor lands in the wrong place or jumps; Pencil double-tap does not select; only the whole box shows as selected (solid 1.5 px border, corner dots); the ≡ grab tab; drag is exclusive; handles (44 pt, nearest handle wins, dots outside the box, a short hold before the drag); never wrap letter by letter; minimum width is the longest word; the glide into place after a drop; two writing hints overlapping; BUG-001 (checklist shows "Not saved yet"); Scribble on a real iPad.
- **Open questions for step 2:** boxes side by side at the same height; rotation (parked with layers).

### Phase 3: Notebooks

- **Artifact:** Notebooks mock (approved 12 Nov). **Built:** `notebooks.v2`, in the preview. **To do:** F4 (remove Review, All cards, All summaries rows; in the scrolling fix), the owner's findings. **Owner's test:** checklist steps 15 to 19 and 36.

### Phase 4: Search

- **Artifact:** Search mock (approved 12 Nov). **Built:** `search.v2`, with F5. **Owner's test:** steps 20, 21.

### Phase 5: Home and Library

- **Artifact:** Home dashboard mock and Library mock v2 (approved 12 Nov, with conditions). **Built:** `home.v2`, `library.v2`, in the preview. **Owner's test:** checklist parts 3 and 4.

### Phase 6: Review and Study

- **Artifact:** Review mock (approved), Study tabs (batch 4, Fable's picks: the owner sees it first in step 1). **Built:** Review 8a, 8c. **Parked, reviewed:** Review rest (`slice/8b-review-rest` bfb6298d), Study tabs (`slice/15-study-v2` c1180092). **Owner's test:** steps 38, 39, 45.

### Phase 7: Reader

- **Artifact:** Book annotations and Reader mock (approved 12 Nov, six conditions). **Parked, reviewed:** `slice/7-reader-v2` 2f78926f (8 follow-ups). **Open problems:** the sidebar covers the reader's ✕; the top bar looks blurry; the two bars must hide and return on their own; Listen long-press. The reader presets (Read, Light study, Deep study) stay under Later.

### Phase 8: AI and the Claude connector

- **Artifact:** AI mode mock v4 (approved 12 Nov), docs/design/ai-tool-framework.md. **Built:** framework steps 1 to 5c, the Build screen, connector A (tested by the owner 13 Nov). **Parked, reviewed:** framework step 6 (`slice/9-ai-framework-6` 0d94407d), cost additions (`slice/9-ai-cost` 14b9e748). **Not built:** framework steps 7 and 8. **Needs the owner:** the online connector's Supabase steps; a test key typed into Settings by the owner.

### Phases 9 and 10

Not built. Their pictures were Fable's own picks (batches 2, 3, 5, 6), which the owner has not seen. Step 1 comes first: the owner sees and approves an artifact for each before any building.

## 8. Before the restart

1. The owner reads this plan and says yes, or changes the order.
2. The owner answers the open yes-or-no points in docs/PENDING.md "Needs you".
3. Fable writes the Phase 0 and Phase 1 pages and starts one Opus phase manager.
