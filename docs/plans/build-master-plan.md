# Build master plan (12 Nov 2026)

Author: Fable (lead architect and build orchestrator). Status: PLAN ONLY. Nothing here is built yet. Execution starts when the owner says "start the build".

## In plain words (for the owner)

- **What this is.** One plan for the whole rebuild: first finish the design pictures (mock-ups) for everything that has none, then build the real app area by area.
- **How it runs.** At night, while you sleep, I (Fable) hand work to three Opus sub-managers, who hand it to Sonnet and Haiku builders. Several builders work at once when they touch different files.
- **What you do.** In the morning you get one short report with links. You look at the new mock-ups, tap around, and say OK or what to change. An area is only built after you approved its mock-up. Areas you already approved are built meanwhile, so nobody waits.
- **What stays safe.** The live app does not change overnight. All new code goes to a separate branch (a side copy of the code) and every new part sits behind an on/off switch that starts OFF. The live app changes only when you say "release".
- **When I will ask you.** Only for: money, releasing to the live site, a change on the Supabase database, or something truly unclear. For everything else I take the safest option and write it in `docs/DECISIONS.md` under "Decisions to review".
- **If something breaks.** Every step is saved to GitHub. A power cut, a closed window or the usage limit loses at most a few minutes. When the limit resets, work carries on by itself (the Claude window must stay open; if it was closed, type **continue**).
- **Three things I need from you first** are in section 8 (open questions). The most important: how releases should work, whether Fable may run overnight if it costs credits, and the GitHub test minutes.

Rules this plan follows: `CLAUDE.md`, `rules/quality.md` (the 7 quality rules and the 3 gates), `rules/building.md`, `rules/sessions.md`, `docs/CONTINUITY.md`, `docs/design/token-efficiency.md`, the APPROVED sections and "Carry-over review" in `docs/PENDING.md`, `docs/plans/app-audit-2026-11-12.md` (the audit, 6 batches) and `docs/design/ai-tool-framework.md`.

---

## 1. Facts this plan is built on (checked in the code, 12 Nov)

| Fact                                                                                                                                                                                              | What it means for the plan                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A push of app code to `main` runs the tests and then **deploys to the live site by itself** (`.github/workflows/ci.yml`, job `deploy`). Pushes that touch only `docs/` or `.md` files do not run. | Unattended builds must never push app code to `main`. They go to the branch `build/next`. Docs and mock-ups may go to `main`. |
| Tests also run for any pull request.                                                                                                                                                              | One draft pull request `build/next → main` gives full tests on every push, with no deploy.                                    |
| A full test run takes about 30 minutes (HANDOFF).                                                                                                                                                 | Builders test on the PC; the full run happens once per finished slice, not per commit. See question 3 (free test minutes).    |
| `src/` has about 359 `addEventListener` calls and 83 files that handle pointer presses. Bases already exist: `src/app/inputMachine.ts`, `gestureReset.ts`, `popups.ts`, `penTap.ts`.              | The 4 root causes are real. The foundation grows the existing bases into the routers; it does not start from nothing.         |
| No file in `src/` checks Beginner or Professional (audit, finding 1).                                                                                                                             | The level and the per-feature unlock switches are part of the foundation.                                                     |
| There is no shared Sheet, alert dialog or toast queue (audit, finding 5).                                                                                                                         | Shared parts come first (quality rule 1).                                                                                     |
| The local database (Dexie) is at version 23 (`src/core/db.ts`).                                                                                                                                   | New tables take version 24 onwards. Only one lane may change the database at a time; Fable gives out the numbers.             |
| 19 old worktree folders and about 28 old branches exist; `tbv2`, `textbox-p1` and `bugs-001-003-004` are already merged.                                                                          | The pre-flight lists them for the owner. Nothing is deleted without asking.                                                   |

### Text box v2: reuse or restart?

**Decision: keep the engine, rebuild the hands.**

- **Keep (reuse as is):** the saved data shape and the layout engine: `src/paper/boxService.ts`, `grid.ts`, `boxes.ts`, `boxState.ts`, `guides.ts`, `layoutPlan.ts`, `paginate.ts`, `src/core/boxStyle.ts` and their unit tests (`freeBox`, `grid`, `guides`, `boxState`, `boxRepair`, `layoutDrop`…). They are pure, tested, and the owner's notes never fault them. Reusing them means no data change and no risk to existing pages.
- **Rebuild (restart):** everything the finger and Pencil touch: `src/paper/BoxFrame.tsx`, `BoxBar.tsx`, `BoxStylePopover.tsx`, `boxHandles.ts`, `activeBox.ts`, and the pointer code inside `src/paper/PaperFrame.tsx` (2,399 lines, 38 handlers).
- **Why.** Every open text box complaint (cursor jumps, Pencil double-tap, too many highlights, drag not exclusive, faint border, small handle) is a touch, gesture, selection or pop-up problem. Those are exactly the 4 root causes. Patching the half-built v2 on top of today's scattered handlers would repeat the same bugs. The approved toolbar v8 "Box card" also replaces the old box pop-over, so that part would be thrown away anyway.
- **Cost.** About 3,000 lines rewritten, about 2,500 lines and all their tests kept.

---

## 2. Phase A: the remaining mock-ups (batches 1 to 6)

Source: `docs/plans/app-audit-2026-11-12.md` section 5 (covers, improvements, Beginner / Professional split and spec lines per batch). This section only adds the owner's answers, my picks and the way of working.

### 2.1 How a batch runs

1. One worktree and branch per batch (`mock/b1-writing`, `mock/b2-objects`, `mock/b3-media-reading`, `mock/b4-study`, `mock/b5-safety`, `mock/b6-system`). Sources in `docs/mockups/b<N>-<name>/` with `STATUS.md`, a coverage probe and a function test (same method as toolbar v6 to v8).
2. Each mock-up opens in Beginner, with a Beginner / Professional toggle, iPad landscape and portrait, phone, PC, light and dark, and uses the approved shell and the v8 card system (`docs/mockups/toolbar-v8/design-study.md`).
3. Three gates: Sonnet builds and probes → the QA sub-manager checks coverage ("nothing lost", file:line) and the spec lines → Fable looks at the screenshots.
4. **Published for the morning:** the mock-up goes up as a private claude.ai artifact. `docs/PENDING.md` gets a section "For the owner this morning" with the link, 3 things to try, and the batch's open questions with my pick.
5. **Owner review:** the owner comments on the artifact or in chat. Comments are applied the next night. On "approved", the conditions go into PENDING, the folder is merged, and the spec lines move to `docs/features/<feature>.md`.
6. **Build gate:** an area's build slice starts only after its mock-up is approved. Until then the build lanes work on the foundation and on the areas already approved (toolbar v8, Settings, Home, Library, Reader, Review, Search, Notebooks, AI mode). No lane waits for the owner.

Order: batch 1 first, alone (it defines the new shared parts on a "Parts" page). Then batches 2 + 3 together, then 4 + 5 together, then 6 last (it needs the phone pass of the others).

### 2.2 Batch 1: writing on the page (owner's answers, final)

| Topic                                     | Decision                                                                                                                                                                                                | From           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| "/" menu                                  | Notion-like. Beginner: a short list (about 12 items in 3 groups) with **Show all** at the bottom. Search as you type; last used on top.                                                                 | owner          |
| Long-press and right-click                | The same menu from a right-click (PC) and a long-press (touch, Pencil). Drawn as a **horizontal strip** at the point (Cut, Copy, Paste ▾, Delete, ⋯), like the iPad's own strip. ⋯ opens the full list. | owner          |
| Paste                                     | **Keeps the original look by default.** No question before pasting. The menu has **Paste ▾** (as plain text, as a text box, as a quote…). Settings has "Paste as" to change the default.                | owner          |
| "Pasted as" chip                          | Today's app has this chip. To drop nothing, it stays as a Professional switch that is off at the start.                                                                                                 | Fable (review) |
| Page ⋯                                    | An organised **side sheet** (docked right, full height; full screen on a phone) grouped by Page, View, Share, Protect, Tools. Beginner 8 items, Professional all 22 with a pinned row.                  | owner          |
| Stars and own blocks                      | Professional can star "/" items (a Favourites group on top) and save their own styled blocks ("My blocks").                                                                                             | owner          |
| New-page start card                       | Shown until the person picks "Always start with…" (my pick; not answered yet, question 6).                                                                                                              | Fable          |
| Block handle, breadcrumb, tabs, templates | As in the audit's "Recommended split".                                                                                                                                                                  | audit          |

New shared parts designed on the batch 1 "Parts" page: Context menu (the strip), Command list, Sheet, Dialog set, Toast queue, Banner.

### 2.3 Batches 2 to 6: my picks (the mock-ups are drawn with these; the owner changes them on review)

| Batch                   | Picks used                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 Things inside a page  | A table gets "Turn into database". A row opens in a side panel (Professional; full page stays in Beginner). Beginner shows Table, Board, Calendar; the rest under "More views". One Calendar screen for every database's dates and journal days. Mind map gets zoom, folding and colours. Missing database basics (select several rows, reorder columns, search rows) are designed now. |
| 3 Pictures, PDF, audio  | Reading mode for notes and the book Reader become one reading experience. Scan: a look per page. Audio: speed, rename, export. Beginner picture tools: Crop and Rotate only. Also here (carry-over): layers, shrink a box to scale its text, snapshot Lasso.                                                                                                                            |
| 4 Study                 | "All cards" merges into the Review space. "My summary" lives only in the Summary tab. Prompt library and AI workflows become one library. Slides and Memory helpers are Professional, off until unlocked. A card made in a page uses the Review editor and its 8 types.                                                                                                                 |
| 5 Safety, account, data | Trash empties after 30 days (setting). Two-device clash: keep both and show a small notice. Beginner History: a simple list by day. One Share / Export sheet. One password rule (8 characters; PIN 6 digits). The sync dot opens one status card. Security mediums are designed here too.                                                                                               |
| 6 System layer          | Command palette (Ctrl+K) in Professional. Shortcut list with editable keys in Professional. In-app reminders now, phone notifications later with the native apps. Toasts stack up to 3. One "What's new" card after an update. Update bar (carry-over). BUG-004 flow shown here but built early.                                                                                        |

Not in any batch (parked by the owner): Custom Views, Study modes, first-launch welcome and tours.

---

## 3. Phase B: the build

### 3.1 Rules for every slice

**Where code goes.** Branch `build/next`, with one draft pull request to `main` so the full tests run and nothing deploys. Each slice is built in its own worktree and branch (`slice/<id>-<name>`), then merged into `build/next` by the Build sub-manager, one merge at a time, each rebased first.

**Spec first.** The slice's first step: the owning sub-manager writes `docs/features/<feature>.md` from the approved mock-up and its PENDING conditions ("When I do X → Y" lines plus "Won't do"), and Fable reviews it. The lines below are the core; the feature file holds the full list.

**Definition of Done (the same for every slice, from `rules/quality.md` 3).**

- Works in Beginner and Professional; each Professional feature has its own unlock switch in Settings › Professional features.
- Light and dark; iPad landscape and portrait, phone, PC; offline.
- Undo / Redo; ✕ on fields and dialogs; plain words, the same in both levels; visible feedback on every change; explanations open as pop-ups.
- Pencil and touch: targets at least 44 pt; no accidental typing, selecting or drawing.
- Nothing lost: every feature in the inventory (file:line) is probed in the new build.
- Accessible (labels, contrast, keyboard); first load at most 320,000 B.
- Uses only shared parts, the routers, the selection store and the overlay manager. No private copies, no raw listeners (the lint check fails).
- Each bug fixed on the way has a "why it happened" line and a new test.

**Tests (the same for every slice).** Unit tests; end-to-end tests on Chromium and `ipad-webkit`, one per spec line; screenshot comparison (Beginner / Professional × light / dark × iPad landscape / portrait / phone / PC); accessibility check; size budget; the "nothing lost" probe. A red test stops that lane. Tests are never weakened.

**Three gates.** Builder runs the tests → QA sub-manager checks the Definition of Done and spec → Fable looks at the screenshots → then the owner's single iPad test.

**Flag.** Every slice has one switch in a new file `src/app/flags.ts` (name given per slice). OFF = today's screen, unchanged. ON = the new one. Flags start OFF; the owner can turn one on for himself from a hidden "Try new design" list in Settings.

**Rollback (three levels, the same for every slice).**

1. Turn the flag off: instant, no data touched.
2. `git revert` the slice's single merge commit on `build/next`.
3. Data: changes only add fields or tables, never rename or remove; `upgradeBackup` runs before any database version change; old fields stay for one release.

### 3.2 Slice 0: the foundation

No visible change for users. Flags: `foundation.*`, all off until an area uses them.

| Part                              | What it is, in plain words                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Where (proposed)                                                               | Needs     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------- |
| 0a Flags and level                | The on/off switches for slices; the Beginner / Professional level; the per-feature unlock list (169 items from `docs/mockups/pro-features.md`).                                                                                                                                                                                                                                                                                                                                          | `src/app/flags.ts`, `src/settings/level.ts`                                    | none      |
| 0b Test tools                     | Screenshot comparison, the Definition of Done check script, the "nothing lost" probe, and a lint check that counts raw listeners and z-index values outside the routers. The count may only go down (grows from `src/app/listenerCount.ts`).                                                                                                                                                                                                                                             | `e2e/`, `scripts/`, `eslint` config                                            | none      |
| 0c Event router (root cause 1)    | One place that listens to the keyboard, pointer, focus and "app went to the background". Features ask it for events instead of listening themselves.                                                                                                                                                                                                                                                                                                                                     | `src/app/input/eventRouter.ts`                                                 | 0b        |
| 0d Gesture router (root cause 2)  | One judge that decides who owns a touch: draw, scroll, select, drag or long-press. A drag is exclusive: nothing else reacts until the drop. Grows from `inputMachine.ts`, `gestureReset.ts`, `penTap.ts`, `palmGuard.ts`.                                                                                                                                                                                                                                                                | `src/app/input/gestureRouter.ts`                                               | 0c        |
| 0e Selection store (root cause 3) | One truth for "what is selected": text, a box, ink, a picture, table cells, rows. Only one kind at a time. Every bar and menu reads it.                                                                                                                                                                                                                                                                                                                                                  | `src/app/selection/store.ts`                                                   | 0c        |
| 0f Overlay manager (root cause 4) | One owner for everything that floats: menus, cards, sheets, dialogs, toasts, pills. Fixed layer order, one open at a time, Esc and tap-outside, "open beside, never over", focus kept inside dialogs. Grows from `popups.ts`.                                                                                                                                                                                                                                                            | `src/app/overlay/`                                                             | 0c        |
| 0g Shared parts                   | Step 1 (approved designs, can start at once): tokens, card / ▾ frame (304 and 376 px), tab row, ✕ field, Tag picker, drag with drop-line and ▲▼, Arrange sheet, Empty state, Object bar, Time range bar. Step 2 (after batch 1 is approved): Context menu strip, Command list, Sheet, Dialog set, Toast queue, Banner. Step 3 (after batches 3, 5, 6): Tool frame, Wizard steps, Status pill stack, Before / after view. A "Parts" gallery page shows them all for the screenshot tests. | `src/design/parts/`, gallery at the existing `src/design/DesignTokensPage.tsx` | 0f        |
| 0h Shell                          | Sidebar, top bar, tab row, Undo / Redo, as in `docs/design/shell-spec.md`.                                                                                                                                                                                                                                                                                                                                                                                                               | `src/app/shell/`                                                               | 0g step 1 |
| 0i Tool registry base             | (1) The app's own tool list (`src/app/tools/toolRegistry.ts`) gains for every tool: level, unlock switch, where it shows, can-be-favourite, and a missing-icon fallback plus a test that every icon exists. The toolbar, "/" menu, Command palette and Settings read this one list. (2) AI framework slice 0: registry format, `catalog.gen.json` and its sync script, plan schema, validator, the six existing write tools as registry tools.                                           | `src/app/tools/`, `src/aitools/`                                               | none      |

How old code moves over: nothing is switched in one go. Each area slice moves its own listeners, selection and pop-ups onto the foundation when it is rebuilt. The lint count shows progress.

Core spec lines for slice 0:

- When a drag starts → no tap, toolbar, menu or new box reacts anywhere until the drop.
- When the iPad drops a "finger lifted" event → the gesture ends by itself within 4 s and no tool stays stuck.
- When I select a box → text, ink and picture selections clear; only the whole box shows as selected.
- When a second pop-up opens → the first closes; a toast never covers a title; a card opens beside its target.
- When a tool has no icon → a fallback icon shows and a test fails.
- Won't do: any change the user can see with all flags off.

Extra tests: fault tests for dropped pointer events; 10,000 random broken plans against the validator (framework section 15); every flag off = today's screenshots, pixel for pixel.

### 3.3 Area slices (approved mock-ups: can start as soon as slice 0 parts they need are in)

| #   | Slice and flag                                       | Core spec lines ("When I do X → Y")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Extra Done / tests                                                                                                                  |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Toolbar v8** `toolbar.v8` (with BUG-003)           | Tap a tool again → its card opens (304 or 376 px) beside it. Pen is one tool with pen types inside. Favourites show on the Pen row and the Text row; a dashed tile saves the current style. Professional: "+" pins any setting; overflow goes to "⋯ more pinned ▾", never sideways scroll. Change a setting → the changed part glows and a toast offers Undo. Layouts: Beginner, Professional, 3 own, per-device copies, Reset. "Keyboard stays hidden" on → no keyboard bar pops up. "Hide toolbar while writing" on → the bar tucks away and a small "Show toolbar" pill appears (same pill as Minimise). Won't do: names under icons in Beginner. | All 878 probes from the v6 to v8 mapping pass. Hold-and-slide, Backspace hold-repeat and the audit 3.8 hand-over items are present. |
| 2   | **Text box v2** `textbox.v2`                         | Tap a box → the whole box shows a solid 1.5 px accent border with corner dots; no outline per line. Drag by the ≡ tab on top → the box moves and nothing else reacts until the drop. Tap text → the cursor lands where I tapped and does not jump. Pencil double-tap in a box → the word is selected. The Box card opens beside the box, never over it; one mini-bar, one minimise. One Undo = one step. Won't do: layers, front / back, fold, handwriting into a box, rotation (rotation waits for batch 3).                                                                                                                                        | Old pages open unchanged (data shape kept). Real Pencil timing checked by the owner.                                                |
| 3   | **Settings v3** `settings.v3`                        | Search finds any setting. Professional features lists every unlock switch; turning one on shows the feature at once, with a glow. Each setting row has a tiny live preview. The "Bold · Pen · Read" preview is calm, in theme colours. Reset per section with Undo.                                                                                                                                                                                                                                                                                                                                                                                  | The Home / Library counts in `pro-features.md` re-checked. Sync badge per setting kept.                                             |
| 4   | **Notebooks and Search** `notebooks.v2`, `search.v2` | As the approved mock-ups: All / Starred / Recent; the notebook "More" sheet; Search chips with "Features". A long-press on a row opens the Context menu strip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Stale "arrive with the Library" chips removed.                                                                                      |
| 5   | **Home** `home.v2`                                   | Drag a widget → the others slide out of the way live; a wide one dropped between small ones lands there; an impossible spot snaps to the nearest fit. Pick S / M / L → the size changes with a short animation; a widget can never vanish. "Where this comes from" opens its own pop-up. "Time range" wording. New "Pending items" card: overdue and open tasks. No top-bar Done.                                                                                                                                                                                                                                                                    | Reflow drag is the shared drag part.                                                                                                |
| 6   | **Library v2** `library.v2`                          | Continue reading first, with covers; one "+ Add"; shelves only in the side panel; filters in More with an active-filter chip; the universal Tag picker; Knowledge shows highlights first; Export has "What to include". A cover tap opens the notes page.                                                                                                                                                                                                                                                                                                                                                                                            | All 34 inventory features re-probed. The 820-portrait filter row does not wrap.                                                     |
| 7   | **Reader and annotations** `reader.v2`               | "Highlight where I land" is on for new users and can be turned off. The reader bar and the drawing bar minimise and come back separately. Tap a sticky note → a read view like a real note; only ✏️ edits. Listen: tap reads aloud; hold opens settings only. Pages-grid edits change the real book with Undo and Restore original. The sidebar never covers ✕ Exit reading.                                                                                                                                                                                                                                                                         | Voices by type with pins; Style "Full" by default; custom tabs.                                                                     |
| 8   | **Review** `review.v2`                               | As the approved mock-up. In Review › More, the "Again comes back after…" row never overlaps its picture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | The 8 card types kept.                                                                                                              |
| 9   | **AI mode v4 and the tool framework** `ai.framework` | Framework slices 1 to 8 from `docs/design/ai-tool-framework.md` section 16, in that order. Type a goal → a plan of tools → check → preview → Apply; one Undo takes the whole job back. A job finishes fully or changes nothing. The Jobs tab uses the framework executor. The "Plan ready" toast never covers the plan title. The top-bar AI button is reworked here. Won't do: any paid call while the limit is ₹0.                                                                                                                                                                                                                                 | Contract tests per tool, golden plans, fault tests, parity between the app, `mcp/` and the online function.                         |
| 10  | **BUG-004 update flow** `update.v2`                  | A normal update → the optional pill, as today. A must-have update → a full-screen notice with a 5 s countdown, only when really needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Small and early (first week).                                                                                                       |
| 11  | **Security mediums** `security.m1`                   | A wrong PIN → a growing delay before the next try. A new PIN has 6 digits. A remote picture loads only after I allow it. Security headers are sent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Reviewed against `rules/security.md`. Old 4-digit PINs keep working until changed.                                                  |

BUG-001 and BUG-002 are fixed inside the slice that owns their screen, each with a test (the owner still owes the BUG-002 screenshot).

### 3.4 Area slices that wait for their mock-up

| #   | Slice and flag                           | Starts after     | Spec source                                                                                 |
| --- | ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| 12  | Writing menus `page.menus`               | batch 1 approved | Audit batch 1 spec lines with the owner's answers in 2.2                                    |
| 13  | Things inside a page `page.objects`      | batch 2 approved | Audit batch 2                                                                               |
| 14  | Pictures, PDF, audio, reading `media.v2` | batch 3 approved | Audit batch 3 (includes layers, box scale, snapshot Lasso, text box rotation)               |
| 15  | Study tabs `study.v2`                    | batch 4 approved | Audit batch 4                                                                               |
| 16  | Safety and data `safety.v2`              | batch 5 approved | Audit batch 5 (Trash, History, Export sheet, conflicts, lock)                               |
| 17  | System layer `system.v2`                 | batch 6 approved | Audit batch 6 (toasts final, empty and error states, shortcuts, palette, What's new, phone) |

Each is cut into sub-slices of one surface group (audit IDs such as W3 or O5), one commit each. The Definition of Done, tests, flag and rollback of 3.1 apply unchanged. The audit's section 8 bug list is fixed inside the owning slice.

**Release order (when the owner says "release").** Area by area: the owner turns a flag on for himself, does the one iPad test, then says "release <area>". Only then is `build/next` merged to `main` with that flag on for everyone (see question 1).

---

## 4. Lanes, owners, models, stop rules

### 4.1 Lanes (what can run side by side)

| Lane              | Work, in order                                                           | Files it owns                                                                 | Sub-manager                  | Runs beside     |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------- | --------------- |
| M Mock-ups        | Batch 1 → 2 + 3 → 4 + 5 → 6                                              | `docs/mockups/b*/` only                                                       | UI                           | every lane      |
| F Foundation      | 0a, 0b → 0c → 0d, 0e, 0f → 0g → 0h                                       | `src/app/input`, `selection`, `overlay`, `shell`, `src/design`                | Build                        | M, A            |
| A AI              | 0i part 2 → framework slices 1 to 8                                      | `src/aitools`, `mcp/`, `supabase/functions`                                   | Build                        | every lane      |
| P Page            | Slice 1 toolbar → 2 text box → 12 → 13 → 14 (strictly one after another) | `src/app/tools`, `src/paper`, `src/editor`, `src/ink`, `src/blocks`           | UI for specs, Build for code | S, R, A after F |
| S Screens         | Slices 3, 4, 5, 6, 8, 15, two at a time                                  | `src/settings`, `notebooks`, `search`, `home`, `library`, `recall`, `revise`  | Build                        | P, R, A after F |
| R Reader and data | Slice 7 → 10 → 11 → 16 → 17                                              | `src/reader`, `pdfTools`, `app/updates*`, `lock`, `share`, `trash`, `history` | Build                        | P, S, A after F |
| Q Quality         | Gate 2 for every slice; screenshot baselines; the lint counts            | `e2e/`, `scripts/`                                                            | QA                           | every lane      |

Dependencies in one line: 0a + 0b → 0c → (0d, 0e, 0f) → 0g → 0h → area slices; batch N approved → its slice; toolbar (1) → text box (2); Settings (3) before any slice needs a new unlock switch screen; AI lane needs only 0i.

**Hot files (only the Build sub-manager's one "integration" builder edits these, one change at a time):** `src/App.tsx`, `src/core/db.ts` (version numbers given out by Fable), `src/core/types.ts`, `src/settings/builtinSettings.ts`, `src/app/flags.ts`, `package.json`, `playwright.config.ts`. Texts: each slice owns its own file under `src/i18n/en/`.

**At most 3 builders at once** (each helper draws from the same usage limit; teams cost about 7 times a single chat).

### 4.2 Model and effort per role (`docs/design/token-efficiency.md`)

| Role                                                                 | Model      | Effort | Notes                                                                                              |
| -------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------- |
| Main manager: plan, hand out, gate 3, morning report                 | Fable 5.2  | medium | Short visits only: start of night, each gate 3, end of night. Falls back to Opus 5.5 (question 2). |
| Sub-managers (UI, Build, QA): specs, review, gate 2                  | Opus 5.5   | medium | One brief per slice that points to files; never pasted text.                                       |
| Builders: features, mock-ups, tests                                  | Sonnet 5.5 | medium | The default.                                                                                       |
| Builders: routers, selection, gestures, database upgrades, bug fixes | Sonnet 5.5 | high   | Risky code.                                                                                        |
| Renames, formatting, moving texts, mirror copy                       | Haiku 5.5  | low    |                                                                                                    |
| Search, reading logs, summarising test output                        | Haiku 5.5  | low    | Explore runs on Haiku.                                                                             |

Model and effort are fixed when a helper starts and never changed mid-task. If Sonnet fails the same step twice, it goes to Opus, then to Fable (`rules/sessions.md`).

### 4.3 Stop conditions

A **lane** stops (the others carry on) when:

- a test is red and the same fix failed twice (after the Opus and Fable hand-ups);
- the first load goes over 320,000 B and cannot be brought back inside the slice;
- the slice needs a hot file while another lane holds it (it waits, it does not edit);
- the slice's mock-up is not approved, or the spec and the mock-up disagree.

The **whole run** stops and waits for the owner when:

- anything would cost money (paid AI calls, usage credits, paid GitHub minutes, a paid plan);
- anything would push app code to `main`, deploy, or run SQL on Supabase;
- anything could delete or lose the owner's data, or needs a secret;
- a request conflicts with `CLAUDE.md` or `rules/`;
- `build/next` has been red for two slices in a row (something basic is wrong).

### 4.4 When to ask the owner, and the default otherwise

| Situation                                                   | Action                                                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money; release / deploy; Supabase database change           | Stop that item, write the question at the top of PENDING "For the owner this morning", carry on with other lanes.                                                    |
| Real ambiguity (two readings that lead to different builds) | Same: ask once, in plain words, with options and my pick. Meanwhile build the parts both readings share.                                                             |
| Anything else the plan does not cover                       | Take the safest option that drops no feature and can be undone; log it in `docs/DECISIONS.md` "Decisions to review" (date, slice, pick, other options). Do not stop. |
| A new idea appears                                          | Into `docs/IDEAS.md`, not into the slice.                                                                                                                            |

Decisions already taken by this plan and logged for review: the "Pasted as" chip kept as a Professional switch; text box v2 = keep the engine, rebuild the touch layer; the tool registry base = the app's tool list plus the AI registry, linked by the same tool ids (not merged into one file); builds go to `build/next`, not `main`.

---

## 5. Continuity for unattended runs

**Checkpoints.**

- One commit per item (one surface ID, one router step, one test set), pushed to the slice branch at once.
- After each sub-step: the "Build board" in `docs/PENDING.md` is updated (one row per slice: state, branch, last commit, next step, who gates it) and `docs/HANDOFF.md` gets its 5 lines.
- After each slice: merge to `build/next`, one full test run, `docs/CHANGELOG.md` entry, mirror copy to `gdrive notes`, then the next slice.
- Mock-up sources are committed in `docs/mockups/b<N>-…/` with `STATUS.md`; nothing stays only in the temp folder.

**Resume steps (given word for word to every helper).**

1. Read `docs/HANDOFF.md`, the Build board in `docs/PENDING.md`, your slice's `docs/features/<feature>.md` (or the batch `STATUS.md`), and `git log -20` plus `git status` on your branch.
2. Continue from the first unticked item. Never redo a ticked one. Never start a fresh helper over half-done work without checking `git status`.
3. Re-run the slice's tests (or the coverage probe) before writing anything new.
4. The same quality rules and the same 3 gates apply after a restart.

**Usage limit (5-hour and weekly).**

- When a helper or the session stops on the limit, the manager schedules one restart for just after the stated reset time; an hourly watchdog also checks. On restart the **same** helpers are resumed first; no new slice starts until the stopped ones are back at a checkpoint.
- The run list is ordered by priority, so whatever does not fit simply continues the next window. Wait and continue, again and again, until the list is done.
- The scheduled restart lives only while the Claude window is open. If the PC slept or the window closed, the owner types **continue** (or `/next`).
- To save usage: bursts of work with no long idle gaps (the cache lasts 1 hour, 5 minutes for helpers); helpers are short-lived; `/compact` only between slices.

**Other events** (power cut, closed window, no internet, long chat): exactly as in `docs/CONTINUITY.md`. The cloud routine "Daily CI check" keeps running with the PC off.

---

## 6. First-night run list

Usage figures are **estimates, not measurements**: no slice of this kind has been metered yet. "Window" = one 5-hour usage window. After night 1, `/usage` gives real numbers and the later lists are re-sized.

| Order | What runs                                                                                                                                                                       | Who                          | Beside  | Est. time | Est. usage (of one window) |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------- | --------- | -------------------------- |
| 0     | Pre-flight: clean `git status`; create `build/next` and the draft pull request; add the Build board to PENDING; list old worktrees for the owner; schedule the hourly watchdog. | Fable                        | none    | 15 min    | about 3%                   |
| 1     | Mock-up batch 1 (writing on the page, with the owner's answers and the "Parts" page); gates 1 to 3; publish; morning notes.                                                     | UI sub-manager + 2 Sonnet    | 2, 3, 4 | 3 to 4 h  | about 35%                  |
| 2     | Slice 0a (flags and level) and 0b (test tools, lint counts, screenshot baselines of today's app).                                                                               | Build sub-manager + 1 Sonnet | 1, 4    | 1.5 h     | about 12%                  |
| 3     | Slice 0c event router, then 0d gesture router (high effort). Nothing is moved onto them yet; flags off.                                                                         | 1 Sonnet (high), QA gate     | 1, 4    | 3 h       | about 25%                  |
| 4     | Slice 0i: tool list fields and icon test; AI framework slice 0 (registry format, catalog, plan schema, validator, fuzz tests).                                                  | 1 Sonnet                     | 1, 2, 3 | 2 h       | about 15%                  |
| 5     | Specs for slice 1 (toolbar v8) and slice 2 (text box v2) written into `docs/features/` from the approved mock-ups, so night 2 can build them.                                   | UI sub-manager (Opus)        | 3       | 45 min    | about 8%                   |
| 6     | If usage is left: 0f overlay manager; then 0g step 1 (approved shared parts).                                                                                                   | 1 Sonnet                     | 3       | 2 h       | about 15%                  |
| 7     | End of night: one full test run on `build/next`; Fable's gate 3; morning report in PENDING (links, what to try, questions); mirror copy.                                        | QA sub-manager, Fable, Haiku | none    | 30 min    | about 7%                   |

Total: about 1.2 windows, so one limit reset is expected during the night and handled as in section 5. Items 1 to 5 are the must-haves; 6 is the filler. At most 3 builders run at once. Nothing is deployed; nothing costs money; one or two full test runs on GitHub (about 30 to 60 minutes of the free allowance).

**What the owner sees in the morning:** the batch 1 mock-up link with 3 things to try and its questions; a line per foundation part ("built, switched off, tests green"); the list of decisions taken for review; and the plan for night 2 (toolbar v8 build starts; batches 2 and 3 mock-ups if batch 1's Parts page passed).

---

## 7. Rough order after night 1

| Nights (rough) | Mock-ups (lane M)            | Build                                                                                        |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| 2 to 3         | Batch 1 fixes; batches 2 + 3 | Rest of slice 0 (0e, 0f, 0g, 0h); slice 1 toolbar v8 starts; slice 10 BUG-004; AI slice 1    |
| 4 to 6         | Batches 4 + 5                | Slice 1 done; slice 2 text box v2; slice 3 Settings; slice 12 (if batch 1 approved); AI 2, 3 |
| 7 to 10        | Batch 6                      | Slices 4, 5, 6, 7, 8, 11; slices 13, 14 as approved; AI 4, 5                                 |
| 11 onwards     | Fixes from owner reviews     | Slices 15, 16, 17; AI 6, 7, 8; release area by area after each iPad test                     |

This is a guess and depends on the usage limits and on how fast mock-ups are approved; the real pace is known after night 1.

---

## 8. Open questions for the owner (my pick first)

1. **How should the live app change?** My pick: all new work stays on a side copy with every new part switched off; the live app changes only when you say "release", one area at a time after your iPad test. To let you test on the iPad before a release I would also like a free private preview address (₹0, but it is a deploy, so it needs your OK). Other option: one big release at the end.
2. **May Fable run at night if it uses paid credits?** My pick: no. Fable does only the short planning and checking visits; if Fable would cost money, Opus manages that night instead and nothing is paid.
3. **GitHub test minutes.** Each full test run takes about 30 minutes and a private repo has a free monthly allowance (I have not checked how much is left). My pick: at most 4 full runs a night, builders test on the PC, and the run stops rather than ever paying.
4. **Batches 2 to 6: may I draw the mock-ups with my own picks** (table in 2.3) and you change what you dislike on review? My pick: yes; it saves a round of questions.
5. **Text box v2:** keep the tested layout engine and your saved pages as they are, and rebuild only the touch, select and drag layer on the new foundation. My pick: yes. Other option: keep patching the half-built version (cheaper now, the same bugs return).
6. **New page:** show the start card every time (today), or only until you choose "Always start with…"? My pick: only until you choose.
7. **On-device database changes** (for example a new table for AI jobs): may they be built and tested on the side copy without asking each time? They reach real devices only at a release. Supabase (online) changes always wait for your OK. My pick: yes.
8. **Night setup:** can the PC stay on, awake, with the Claude window open on build nights? If not, work stops at the first limit and continues when you type "continue". My pick: keep it on and turn off sleep for those nights.

## Owner answers to the open questions (12 Nov 2026)

- Release: every night's work goes to a free preview link; the live app updates nightly ONLY when all tests pass; new parts arrive switched OFF (Settings › "Try new features"); the owner tests whenever and gives feedback; rollback always ready. The work never waits for the owner.
- GitHub minutes: the repo is PUBLIC, so standard runners are free and unlimited; no night cap (never pay).
- Fable may run at night (Max plan covers it).
- Batches 2–6 with Fable's picks: yes. Text box v2 (keep the engine and data, rebuild the touch layer): yes. New-page card until "Always start with…": yes.
- On-device storage changes: allowed with a safe upgrade + backup; the online database (Supabase) always asks the owner.
- PC stays on, awake, Claude window open on build nights.
- FIRST JOB of the first night: fix the 3 failures blocking today's deploy (lint; e2e claudeSettings.spec.ts:15; copyFormats.spec.ts:97, run 43154265787), deploy, then tell the owner to finish the Claude connector.

## Never wait for the owner (owner rule, 12 Nov 2026)

- Work never stops because the owner is away. If a question comes up: take the safest choice that follows the approved mock-ups, rules/quality.md and the design rules, log it in DECISIONS "to review", and continue.
- The mock-up rule is satisfied (owner, 12 Nov): every needed mock-up or picture was made and checked. Remaining areas go spec → build → test: Fable writes the spec from the design system, builders build it behind a switch, automatic tests + QA + the manager check it, then the owner tests the real thing on the preview.
- Nothing wrong can reach the owner's daily use: new parts ship switched off; QA + the 3 gates check every slice against its approved mock-up and spec before merging.
- Only three things truly wait for the owner: spending money, online database (Supabase) changes, and turning a new part ON for daily use (the owner does that after testing).
- Each morning: a short report (done, preview link, what to test with 2–3 line steps, decisions to review). The owner tests when free and reports bugs; bugs go to the top of the next night's queue.

## Running principles (owner, 12 Nov 2026)

1. Usage: the build may use the WHOLE Claude limit, day and night, for THIS project only.
2. No more mock-up rounds for the remaining areas (recommended by the manager, owner's direction "an app that works the way it was told"): the design system is now fixed (9 approved mock-ups + Fable's card system in docs/mockups/). For batches 1–6, Fable writes a precise spec ("When I do X → Y", which shared parts, Beginner/Professional) instead of a mock-up, and the slice is built directly behind a switch; the owner tests the REAL thing on the preview link. A picture mock-up is made only if a screen needs a genuinely new visual pattern not covered by the design system.
3. Status line: every message to the owner starts with 1–2 short lines: "Status: <what's happening>" and "Needs you: no" or "Needs you: yes, <what, in a few words>". Repeat it in every following message until resolved. Short reports are written by a cheap model (Haiku).
4. Failures: first try to fix (up to 3 attempts, within about an hour of work per slice). If still red: undo that slice, record it in docs/FAILED.md (what, why, logs, the attempts made, the suggested next step), move on, and list it in the next status line. Failed items are retried with the owner present.
