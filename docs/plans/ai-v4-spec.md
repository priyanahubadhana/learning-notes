# AI mode v4, next steps: spec ("When I do X → Y" and "Won't do")

Slice branch: `slice/9-ai-framework-4`. Everything is behind the flag
`ai.framework` (OFF). With the flag off nothing visible changes and none of
this code is loaded. Design: `docs/design/ai-tool-framework.md` sections 5, 9,
13, 16. Owner conditions: `docs/PENDING.md` "AI mode mock v4: APPROVED".

**HARD RULE (owner, spend limit is ₹0):** no paid model call is ever made.
`spendGate` blocks every paid call by default; the only engines wired into the
app are the free ones (copy-prompt / paste-answer, and Claude through the
connector). Tests use fakes. No API key, secret or network call in any new
code or test.

## A. The Jobs surface uses the framework executor

In the real app the "Jobs" list is the Build screen (run) + Activity (list) +
Settings › Claude › Inbox job items. The v3 run flow only existed in the mock.

- V4-A1. When a job is started from the Build screen, from a goal plan
  (slice 4 below) or from an Inbox job item → it runs through the one
  `JobRunner` (stage → preview → Apply → one Undo). No second run path exists.
- V4-A2. When the person opens Activity → every job from every door (Build,
  goal box, Inbox) is one row with Undo / Redo, from the same job store.

Won't do (A): no new run flow; no change when the flag is off.

## B. "Plan ready" never covers the plan title

- V4-B1. When a plan becomes ready → the plan title is shown first (marked
  `data-aifw-title`), then the notice "Plan ready" is shown as a line under
  the title and also as a toast that moves above the title if it would cover
  it. Test: the toast box never overlaps the title box, on phone and iPad
  widths.

Won't do (B): the notice is never placed over the title; no auto-run.

## C. Framework slice 4: goal box → plan, effort, router, cost, spend gate

- V4-C1. When I type a goal and pick a destination and tap "Make a plan" →
  the app shows the planner prompt to copy (goal, destination, source titles
  and sizes only, the tool list as compact JSON). I paste the answer. No AI
  call is made by the app.
- V4-C2. When the pasted answer is a plan that passes the checker → it
  becomes the plan: title, steps in plain words, "Plan ready", the estimate.
  Run starts it through the executor.
- V4-C3. When the pasted answer is not a valid plan → the app shows the
  `path: message` problems and asks again, up to 2 repair rounds; after that it
  offers a built-in simple plan for the closest goal (notebook from sources,
  tidy a page, cards from a page) and says it is a simple plan.
- V4-C4. When I pick an effort (Quick, Standard, Deep) → the plan records it;
  it sets which tier plans and which tier fills each step (Quick: small and
  small; Standard: middle, small for simple tools; Deep: top plans, each step
  its own tier, up to 3 steps without dependencies together).
- V4-C5. When the router picks a model → free engines first (paste / Claude
  connector, cost ₹0); Auto = Balanced; Best, Cheapest or an exact model on
  request; a fallback only goes to the same level at the same or lower price;
  a dearer model is never chosen silently.
- V4-C6. When the plan is shown → "about ₹X" per effort level for the paid
  model the router would pick, and "Free" for the engine that will really be
  used. Tokens in = measured source sizes + prompt; out = tool outTokens
  scaled by counts (10 cards).
- V4-C7. When any paid call is about to start → `spendGate` checks in order:
  monthly limit (default ₹0 = hard stop), per-job limit, "ask me above ₹X".
  With the default settings every paid call is refused with a plain reason
  ("The spend limit is ₹0"). Free engines (estimate 0) always pass.
- V4-C8. When a job starts → its estimate is reserved against the month, so
  two jobs cannot both slip under the limit; at the end the reservation is
  replaced by the real spend (or released if nothing was spent).
- V4-C9. When a call finishes → real tokens are metered; if real spend would
  pass the approved estimate by more than 20% the job pauses and asks; a step
  that would cross the hard limit is not sent.
- V4-C10. When a model filler is asked for a step and the gate refuses → the
  step fails with a `budget` error (not retried) and the job shows Retry /
  Skip / Stop as usual. The model caller was never invoked.

Won't do (C): no real paid API call in any code path or test; no API key or
secret; no wiring of `src/ai/route.ts` `callAi` into the framework yet (a paid
engine is only an injected interface, with fakes in tests); no new Dexie
version (the spend limit and ledger live in the app's local preferences, per
device); no change to the existing AI mode caps; the planner is never allowed
to write content, only briefs; no editing a goal plan beyond the Build steps
list in this slice.

## D. Framework slice 5a: Pages, Tabs, Summaries (if time remains)

- V4-D1. When a plan names `pages.create`, `pages.append_blocks`, `tabs.add`,
  `summaries.set` (final ids in the code) → they validate, stage, apply and
  undo exactly like slice 1-3 tools, through both doors (app and `mcp/`).
- V4-D2. When the same tool is run from the app and from `mcp/` → the same
  records (parity test).

Won't do (D): no delete tool; no database change; no tool outside 5a.

## E. Framework slice 5b: Mind maps, Cards (behind `ai.framework`, off)

- V4-E1. When a plan names `mindmaps.add` with a `pageId` and an `outline` (an
  indented list) or a `brief` → one editable mind map block (never a picture)
  is added at the end of that page; the model path fills `outline` from the brief.
  An empty outline, a gone page or a locked page/notebook → the step fails with
  a plain sentence and nothing is written.
- V4-E2. When a plan names `mindmaps.set_theme` with a `blockId` and a theme
  (`calm`, `bold`, `paper`) → only that mind map's theme changes. A block that is
  not a mind map, or is gone → the step fails, nothing is written.
- V4-E3. When a plan names `cards.suspend` with a `cardId` and `suspended`
  true/false → the card is set aside (or brought back) without deleting
  anything; its reviews stay. A gone card or a locked notebook → the step fails.
- V4-E4. `mindmaps.set_theme` and `cards.suspend` run the same from the app and
  from `mcp/` (parity goldens); `mindmaps.add` is app-only because the local
  connector cannot make mind maps yet (it is refused as "not offered on mcp", nothing
  written). Each tool applies in one save, and Undo and Redo put everything back.

Won't do (E): no card deletion, no edit of card text or schedule, no mind map
node editing, no tool outside 5b.

## F. Framework slice 5c: Databases, Styles, Layouts (behind `ai.framework`, off)

- V4-F1. When a plan names `databases.rename` with a `databaseId` and a `title`
  → only the database title changes. A gone or locked database, or a locked
  notebook → the step fails, nothing is written. The Study tracker database is
  not renamed.
- V4-F2. When a plan names `styles.set_paper` with a `pageId` and `paper`
  (`plain`, `lined`, `grid`, `dots`) → only the paper behind the ink changes.
- V4-F3. When a plan names `layouts.set_path_style` with a `pageId` and `pathStyle`
  (`simple`, `full`, `page`, `inherit`) → that page's own path style is set, or
  cleared for `inherit`.
- V4-F4. `styles.set_paper` and `layouts.set_path_style` have parity goldens;
  `databases.rename` is app-only (the local connector cannot read databases yet).
  Same one-save and Undo/Redo rules as V4-E4.

Won't do (F): no database column, row or view changes; no notebook layout
boxes; no tool outside 5c.

## G. Framework slice 5d: Tags, Library (behind `ai.framework`, off)

- V4-G1. When a plan names `tags.add` with a `pageId` and a `tag` (a name or a
  path such as `medicine/cardio`) → the page gets that tag; a tag that does not
  exist yet is made (each level reuses a live tag of the same name, case and
  accents ignored). A page that already has the tag, nothing changes. A gone or
  locked page or notebook → the step fails, nothing is written.
- V4-G2. When a plan names `tags.remove` with a `pageId` and a `tagId` → the tag
  is taken off that page only; the tag itself stays. A page that does not have it,
  nothing changes.
- V4-G3. When a plan names `tags.rename` with a `tagId` and a `name` → only that
  level is renamed (its sub-tags keep their names) and the new name shows on
  every page at once. A name that is blank, or taken by a tag under the same
  parent, or a gone tag → the step fails, nothing is written.
- V4-G4. When a plan names `library.pin` with a `notebookId` and `pinned` true/false
  → that notebook is pinned to the top of the shelf and list, or unpinned. A gone
  or locked notebook → the step fails.
- V4-G5. `tags.remove` and `library.pin` have parity goldens (the same records
  from the app and from `run_plan`). `tags.add` and `tags.rename` are app-only (the
  local connector does not read tags yet). Every job applies in one save and one
  Undo puts everything back (a tag made by the job goes to Trash).
- V4-G6. The spend limit stays ₹0: none of these tools needs a model, so no
  network or paid call is made, and a test proves it.

Won't do (G): no tag delete or merge, no tag colour change, no moving a tag
under another; no moving of library items (no existing service for it); no tool
outside 5d.
