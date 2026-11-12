# AI framework: executor, hand-made plans and connector parity (slices 1-3)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Slices 1 and 2 of [the AI tool framework](../design/ai-tool-framework.md)
(section 16). Slice 1 is the engine that runs a checked plan as one **job**:
it prepares every step first (nothing written), then writes the whole result
in one go, and one Undo takes the whole job back. Slice 2 puts a "Build" screen
on top of it so a person can run a hand-made plan with content they paste in.

Everything sits behind the flag `ai.framework`. With the flag off, today's AI
mode and Jobs tab are untouched and none of this code is loaded.

## How it works

### Slice 1: executor core (`src/aitools/jobs/`)

- AF-1. When a valid plan is turned into a job → the job starts in `validated`
  with one step state per enabled step (`waiting`). An invalid plan never
  becomes a job (validator errors are returned instead).
- AF-2. When a job runs → each enabled step in order gets its `$from` values
  resolved from earlier steps' outputs, its content filled (from the plan
  args, or from a `Filler`), and is **staged**: turned into the app's own
  records in memory. Nothing is written to notes. A checkpoint (step state,
  outputs, staged records) is saved after every step.
- AF-3. When a step is staged → its record ids come from (job id, step id,
  index), never random, so staging twice gives byte-identical records and a
  retry can never make duplicates. Each step has a key: hash of (job id,
  step id, tool id + version, resolved args); a step with a stored result for
  its key is never filled or staged twice.
- AF-4. When every step is staged → the job moves to `preview` with the
  staged ChangeSet (what will be created or changed).
- AF-5. When Apply is pressed → every record the job edits is checked against
  the revision it was staged from; if one changed, nothing is written and the
  job goes back to `preview` with the reason. Otherwise the whole ChangeSet
  and the undo record are written in **one transaction** and the job is
  `applied`. A failure in the middle writes nothing (`failed`, nothing
  written).
- AF-6. When the same job is applied twice → the second time is a no-op that
  answers "already applied".
- AF-7. When a step fails for an outside reason (network, 429, 5xx, timeout)
  → it is retried up to the tool's `maxRetries` with waits of 1 s, 4 s, 15 s
  plus jitter (a `Retry-After` wins). Filled content that breaks the tool's
  inputs gets one repair round. Validation, permission, lock and "page is
  gone" errors are never retried.
- AF-8. When a step still fails → the job pauses in `needs_attention` with one
  plain line. Retry runs that step again with a fresh retry budget; Skip marks
  it `skipped` and every step that depends on it `blocked` (not offered for
  the step that creates the destination); Stop ends the job (`cancelled`,
  nothing written). Optional steps that fail are skipped automatically.
- AF-9. When the app starts → a job in `running` resumes from the first step
  that is not `done`; a job in `applying` is checked: if its records exist it
  is `applied`, otherwise it goes back to `preview`.
- AF-10. When Undo is pressed on an applied job → in one transaction, records
  it created are removed (pages and notebooks to Trash), records it edited get
  their before-values back where they still hold the job's value. Undo twice
  is a no-op. Redo applies the same ChangeSet again.
- AF-11. When a job needs a model and the device is offline → it waits in
  `waiting_offline`; tools with `fill: "none"` run offline.
- AF-12. Only the transitions drawn in section 7 of the design are allowed;
  any other move throws in tests and is refused in the app.

Storage: jobs live behind a `JobStore` interface. Slice 1 ships an in-memory
store; the Dexie table `aiJobs` arrives with the version number the main
manager gives out (see "Storage change" below). Notes are written through a
`NotesPort` interface: an in-memory port for tests and a Dexie port that uses
the existing tables in one `db.transaction`.

### Slice 2: Build with a hand-made plan (AI space, flag on)

- AF-20. When the person opens Build → they pick steps from the catalog, choose
  where the result goes (new notebook, a notebook, a page) and see the plan as
  a plain list they can reorder, untick or remove (✕).
- AF-21. When a step needs content → the app shows the existing copy-prompt /
  paste-answer path; the pasted answer is checked against the tool's inputs
  before the step is staged. No AI call is made by the app.
- AF-22. When the job runs → each step shows waiting / running / done / failed
  with Retry, Skip and Stop; then Preview lists what will be made, and Apply
  writes it, with a done card and a toast with Undo.
- AF-23. When the person opens Activity → one row per job in plain words, with
  time, destination and Undo / Redo.

### Slice 3: connector parity (local `mcp/` connector, Inbox `job` item)

The same plan, checked by the same code, behaves the same when Claude sends it
as when a person builds it. Tools: `list_tools`, `describe_tool`,
`plan_preview`, `run_plan`, `job_status`, `undo_job`. Scopes stay two (read,
write); undo never hard-deletes. The online connector (`supabase/`) is not
part of this slice: see "Online part still needed".

- AF-30. When Claude asks `list_tools` or `describe_tool` → it gets the same
  catalog the Build screen shows (id, label, group, one-line description, risk;
  for one tool: inputs, outputs, limits, an example step). Nothing is written.
- AF-31. When Claude sends a plan to `plan_preview` → the plan is checked with
  the same checker as the app. A bad plan comes back as a list of "where +
  what is wrong". A good plan is staged with nothing saved, and Claude gets
  what each step will create or change, how many records, and which steps
  would wait in the Inbox and why.
- AF-32. When Claude sends a plan to `run_plan` and every step is `direct` risk
  and only makes new things → it is saved in one all-or-nothing save and
  Claude gets the job id and counts. The plan `id` is the key: the same plan
  sent again returns the first answer and writes nothing again.
- AF-33. When the plan has a step that is not `direct`, edits something that
  exists, or Claude asks for `mode: "inbox"` → nothing is saved; the whole job
  waits as one item in the Inbox (Settings › Claude › Inbox) and Claude gets
  "waiting for the owner".
- AF-34. When a plan cannot be fully staged (a step fails, a page is locked or
  gone, a notebook Claude may not use) → nothing is written and Claude gets
  the failing step in plain words. No half-built result, ever.
- AF-35. When Claude asks `job_status` → it sees the job's state: applied,
  waiting in the Inbox, accepted, rejected, undone, failed, with counts. Only
  jobs from this connection are shown.
- AF-36. When Claude asks `undo_job` for one of its own jobs and nothing in the
  result was touched since → what it created goes to Trash and values it
  changed get their old values back; one save. Asking again changes nothing.
- AF-37. When the person has changed the result since (a page edited, a block
  added) → `undo_job` writes nothing; it adds an Inbox request "Undo this
  job" and tells Claude so. Another connection's job is refused.
- AF-38. When the existing tools `create_notebook`, `add_page`, `add_cards`
  are used → they run as a one-step plan through the same engine (so they
  have a job id and can be undone) and answer exactly as before.
- AF-39. When Claude calls a write tool → the limit counts the steps too: one
  `run_plan` counts as one write plus one per enabled step, checked before
  anything runs and refused whole, with a plain "try again in N seconds".
  Reads 60 a minute, writes 20 a minute and 500 a day. `undo_job` counts one.
- AF-40. When a plan asks the local connector for something it cannot make yet
  (databases, mind maps) → refused before anything runs, in plain words.
- AF-41. When a job waits in the Inbox → the item shows what it will make or
  change in plain words and counts, "Show changes" (the same preview lines as
  Build), Accept and Reject. Accept saves the whole job in one save with an
  Undo toast; if a page changed meanwhile nothing is saved and the item says
  why. Reject only closes it. Nothing is deleted.
- AF-42. When an "Undo this job" request is in the Inbox → Accept undoes the
  job in one save (created things to Trash); Reject closes the request.

### Slice 4: goal box, effort, router, cost, spend gate

Full lines with "Won't do": [docs/plans/ai-v4-spec.md](../plans/ai-v4-spec.md).
Code: `src/aitools/plan/` (pure) and `src/aibuild/GoalBox.tsx`.

- When I type a goal, pick where it goes and tap "Make a plan" → the app shows a prompt to copy; I paste the answer; no AI call is made (V4-C1).
- When the pasted plan passes the checker → it becomes the plan with "Plan ready" shown under the title, never over it, plus its estimate; Run starts it through the one executor (V4-C2, V4-B1, V4-A1).
- When the pasted plan is wrong → I see the problems and may paste again; after 2 repair rounds a simple built-in plan is offered (V4-C3).
- When I pick Quick, Standard or Deep → the plan records the effort and the router uses the tier it maps to (V4-C4, V4-C5).
- When the plan is shown → it says "free" for copy-and-paste and what a paid model would cost per effort level (V4-C6).
- When any paid model call would start → `spendGate` refuses it while the limit is ₹0, before the call exists (V4-C7, V4-C8, V4-C9, V4-C10).

### Slice 5a: Pages, Tabs, Summaries (both doors)

Tools: `pages.rename`, `tabs.rename`, `tabs.set_hidden`, `summaries.set` (code in `src/aitools/tools/`; staged in `src/aitools/jobs/stage.ts`; the local connector uses the same files).

- When a plan names one of these four tools → it is checked, staged, previewed, applied and undone exactly like the older tools, from the Build screen, the goal box or Claude (V4-D1).
- When the same plan runs in the app and through `run_plan` → the records are byte-equal (V4-D2, `mcp/test/planParity.test.ts`).
- When a notebook or page is locked, a tab or page is gone, a summary targets a sub-page, or the page changed meanwhile → nothing is written and the reason is shown in plain words in English, Spanish and Hindi.
- When I pick steps by hand on the Build screen → the three tools that need their own arguments (rename page, rename tab, show or hide tab) are not offered there; they come through a plan.

### Slice 3: Build screen texts

- AF-43. When a step or job shows a reason (step failed, stopped, nothing to
  write, page changed, could not save) → the sentence is in the person's
  language (English, Spanish, Hindi), never English only.

### Online part still needed (not built here, owner steps later)

The online function (`supabase/functions/`) must get the same six tools using
the shared files (`src/aitools/*`, generated copy for Deno), one save call
per job, the Inbox `job` write, the per-step rate counting, and an audit line
per job (ids and counts only). This slice builds only the app and `mcp/` side.

## Won't do

- Slices 1-3: no planner, filler model, cost estimator or spend gate (they arrive in slice 4, above).
- Slice 4: no real paid call in any code or test, no key or secret, no new Dexie version; the spend limit stays ₹0.
- No real AI or network call anywhere in these slices, and none in any test.
- No `supabase/` changes: the online function stays as is until the online part above is done.
- No delete tool. No new dependency.
- No sync of `aiJobs` until the table exists (main manager's version number).

## Edge cases

- Kill the app between any two checkpoints or during commit → resume rule
  AF-9, never half a notebook.
- The page changes between staging and Apply → AF-5.
- Two jobs at once → one runs, the other queues (one job per device).
- A job over 1,000 records → refused at staging.
- Pasted content with envelope-closing text or `javascript:` links → treated as
  data, schema-checked, links must be https.

## Security check

Plans and filled content are untrusted: validated by `validatePlan` and the
tool's `inputs` schema before staging, never run, never used as HTML. No keys
are read. Nothing leaves the device. Undo never hard-deletes (Trash, History).

## Storage change (for the main manager)

New Dexie table `aiJobs: 'id, state, updatedAt'` (one row per job: plan,
state, per-step states, checkpoints, ChangeSet, undo record, timings). Synced
later as an encrypted record like `claudeInbox`.

## Tests

- Contract test per tool (one template, `src/aitools/contract.test.ts`):
  examples pass/fail, `stage` gives app-shaped records, staging twice is
  identical, apply then undo restores the exact start.
- Golden plans (`src/aitools/golden.test.ts` + snapshots).
- Fault injection (`src/aitools/jobs/executor.fault.test.ts`) with a fake
  filler and fake clock: fail the Nth call, timeout, bad JSON, offline, kill
  between checkpoints and during commit, page changed before Apply, same job
  twice. After each: fully applied or nothing written, no duplicates, Undo
  works.
- State machine: every transition in section 7 covered.
