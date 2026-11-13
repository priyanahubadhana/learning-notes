# AI framework: executor and hand-made plans (slices 1-2)

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

### Slice 4: cost additions (pointer)

Caching and the real token count are specified in [ai.md](ai.md), section "Cost additions".

## Won't do

- No planner, no filler model, no cost estimator, no spend gate (slice 4).
- No real AI or network call anywhere in these slices, and none in any test.
- No `mcp/` or `supabase/` changes (slice 3); the online function stays as is.
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
