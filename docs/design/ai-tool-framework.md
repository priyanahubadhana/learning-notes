# AI tool framework: how the app really carries out AI jobs

Date: 12 Nov 2026. Status: design for the real build (nothing built yet). Owner rule: "the framework itself must be in place, not just an image; the app must really execute these tasks without bugs: Toyota reliability".

Mock that runs a small copy of this framework in the page: AI mode v4 (scratchpad `ai-mode-mock.html`). Specs: `docs/plans/owner-ideas-batch-2-2026-11-10.md` sections 10 to 14. Existing base: `docs/features/claude-connector.md`.

## Plain-words summary (for the owner)

- **What it is.** A rulebook and an engine. The rulebook is one list of every action the app can do for the AI ("Create notebook", "Make recall cards", "Add a Summary tab"...). Each action is called a **tool**. The engine takes a list of tools to run in order (a **plan**) and carries it out safely.
- **What it does.** You say what you want. The AI answers with a plan made only of tools from the list. The app checks the plan, shows you what it will do and what it costs, builds a draft, shows a preview, and saves only when you tap Apply. One Undo takes the whole job back.
- **Why it matters.** The AI never touches your notes directly. It can only ask for tools from the list, and the app does the writing with the same tested code every time. That is what makes it reliable: a job either finishes completely or changes nothing, it can be retried without making duplicates, and nothing is ever deleted (removed things go to Trash, big changes wait in the Inbox).
- **One list, two doors.** The same tool list feeds (a) AI mode inside the app and (b) the Claude connector, so a plan sent from claude.ai behaves exactly like one run in the app: same checks, same preview or Inbox, same Undo, same limits, same Activity log.
- **Is MCP needed? Yes.** MCP is the standard "plug" that lets Claude (claude.ai, phone, desktop) call our tools. It is what the connector already uses today, it is free with your own Claude plan (₹0), and it is the only supported way for Claude to act inside another app. We do not add a second system: we extend the plug we have with six new commands.
- **Cost.** With Claude through the connector everything is ₹0. Paid models stay off until you set a limit above ₹0, and every paid call passes one single gate that checks your limits first.
- **How we keep it bug-free.** Every tool ships with its own tests; a set of fixed "golden" plans must always give the same result; thousands of deliberately broken plans are thrown at the checker; and the full flow is tested on iPad Safari (WebKit) before you test on the real iPad. A red test stops the line.
- **Build order.** Eight small slices (section 16). The first three reuse the six write tools the connector already has, so real, working jobs arrive early and the catalog then grows tool by tool.

## 1. Principles

1. **The model proposes, the app disposes.** Models return data (a plan, or content for a step). Only the executor writes, through registry tools.
2. **Tools are deterministic.** A tool turns checked inputs into records. Given the same inputs it writes the same records. All "thinking" happens before the tool runs.
3. **Stage, then commit.** A job first builds a draft (the change set) that touches nothing. Apply writes the whole change set in one all-or-nothing save.
4. **Preview is the real result.** The preview is drawn from the change set that Apply will write. No second AI call happens between Preview and Apply.
5. **Everything can be taken back.** Every job has an undo record. Nothing is hard-deleted by AI, ever.
6. **Mistake-proof (poka-yoke).** An invalid plan cannot start. A paid call cannot skip the budget gate. A tool that is not in the registry cannot run.
7. **One registry, every surface.** Tool catalog screen, planner prompt, executor, MCP tool list and tests all read the same definitions.

## 2. The parts

```
goal + sources
     │
     ▼
 PLANNER (model) ──► Plan JSON ──► VALIDATOR ──► COST ESTIMATE + BUDGET GUARD
                                       │ errors go back to the planner (2 repair rounds)
                                       ▼
                                  EXECUTOR
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
          1. Fill + stage (slow, may fail)        2. Commit (fast, atomic)
          content per step, checkpoints,          one save, undo record,
          retries, timeouts, skip/stop            Activity entry
                    │                                     ▲
                    ▼                                     │
                 PREVIEW ──── Apply (or Inbox Accept) ────┘
```

Proposed home in the code (new folder, no change to stack choices):

| Part                    | File (proposed)                                                                                                                               | Runs in                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Tool definitions        | `src/aitools/registry/*.ts` (one file per group)                                                                                              | app, tests                                    |
| Generated catalog       | `src/aitools/catalog.gen.json` (built by `scripts/sync-ai-tools.mjs`, same pattern as `sync-connector-spec.mjs`; a test fails if it is stale) | app, `mcp/`, `supabase/functions/_shared/`    |
| Plan schema + validator | `src/aitools/plan.schema.json`, `src/aitools/validate.ts`                                                                                     | app, both connectors                          |
| Stage functions (pure)  | `src/aitools/stage/*.ts`, built on `notesWrite`, `refine`, `mindmap`, `spec`                                                                  | app, both connectors                          |
| Executor                | `src/aitools/executor.ts`, `src/aitools/jobStore.ts`                                                                                          | app (Dexie), connectors (their own save call) |
| Planner + filler        | `src/aitools/planner.ts`, `src/aitools/filler.ts` (use `src/ai/route.ts`)                                                                     | app only                                      |
| Cost                    | `src/aitools/cost.ts` (uses `src/ai/usage.ts`)                                                                                                | app                                           |

The pure parts (registry, validator, stage functions) use only web-standard calls, like `spec.ts` today, so the same code runs in the browser, in Node (`mcp/`) and in Deno (the online function). A parity test proves the three copies behave the same (as `src/connector/parity.test.ts` does now).

## 3. Tool registry

One definition per tool. Fields:

| Field           | Meaning                                                                                                                                                                                                                                             | Example                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`            | Stable name, `group.verb_noun`. Never reused.                                                                                                                                                                                                       | `cards.make_recall`                                                |
| `version`       | Whole number. Raised when inputs or behaviour change; old plans name the version they were made for.                                                                                                                                                | `1`                                                                |
| `label`         | Plain name shown in the catalog (i18n key).                                                                                                                                                                                                         | "Make recall cards"                                                |
| `group`         | Catalog group (Notebooks, Pages, Tabs, Summaries, Mind maps, Cards, Databases, Styles, Layouts, Tags, Library, Home widgets, Search, Review, Import and export).                                                                                    | `Cards`                                                            |
| `summary`       | One line for the person (i18n key).                                                                                                                                                                                                                 | "Turns the notes into question and answer cards."                  |
| `aiDescription` | What the model reads: when to use it, when not to, what it needs first. English, under 400 characters.                                                                                                                                              | "Use after notes exist. Needs a pageId. Do not use for quizzes."   |
| `inputs`        | JSON Schema (draft 2020-12), `additionalProperties: false`. Content shapes are `$ref`s into `spec.schema.json` (section 12).                                                                                                                        | `{ pageId, cards: Card[] (1 to 200), deckId? }`                    |
| `outputs`       | JSON Schema of what later steps may use.                                                                                                                                                                                                            | `{ cardIds: string[], pageId }`                                    |
| `writes`        | Where it writes and how: list of `{ target, mode }`. Targets: `notebook`, `section`, `page`, `blocks`, `tab`, `cards`, `database`, `rows`, `style`, `tags`, `library`, `home`, `review`, `file`, `none`. Modes: `create`, `append`, `edit`, `move`. | `[{target:"blocks",mode:"append"},{target:"cards",mode:"create"}]` |
| `permissions`   | `scope` (`notes:read` or `notes:write`), `proFeature` (its switch in Settings › Professional features, if any), `respectsLocks: true` (always), `needsSources` (yes/no).                                                                            | `{scope:"notes:write"}`                                            |
| `cost`          | `class`: `none` (no model), `small`, `medium`, `large`; plus `fill`: how its content is produced (`none`, `model`, `caller`) and typical output size in tokens for the estimate.                                                                    | `{class:"small",fill:"model",outTokens:900}`                       |
| `tier`          | Model level the fill needs: `simple`, `writing`, `planning` (section 13).                                                                                                                                                                           | `simple`                                                           |
| `reversible`    | How Undo works: `batch` (remove what it created), `history` (restore the page's History copy), `values` (put the old values back), `no` (not allowed in v1; no such tool ships).                                                                    | `batch`                                                            |
| `risk`          | `direct` (may apply automatically when the owner allows it), `preview` (always shows a preview), `inbox` (always waits for Accept, even with "Apply automatically" on).                                                                             | `direct`                                                           |
| `idempotent`    | Always `true`. The definition names the fields that make its key (section 8.4).                                                                                                                                                                     |                                                                    |
| `limits`        | `timeoutMs`, `maxRetries`, size caps.                                                                                                                                                                                                               | `{timeoutMs:60000,maxRetries:3}`                                   |
| `surfaces`      | Where it is offered: `app`, `mcp`. Default both.                                                                                                                                                                                                    |                                                                    |
| `offline`       | Can it stage with no network? True when `cost.fill` is `none`.                                                                                                                                                                                      | `false`                                                            |
| `stage`         | The function: `(args, view) → ChangeSet` (pure, no I/O). Not part of the generated JSON.                                                                                                                                                            |                                                                    |

Rules:

- A tool **does one thing** and writes to the fewest targets possible. "Create notebook" does not also write pages; the plan chains tools.
- A tool **never deletes**. Tools that remove or replace a lot (`notebooks.merge`, `pages.split`, `search.find_replace`, large `pages.refine`) are `risk: "inbox"` and keep History copies; anything removed goes to Trash.
- **No tool ships without**: both descriptions, schemas, a `stage` function, contract tests (section 15) and an entry in the old → new feature map. The catalog screen lists only shipped tools, so the mock's 62 tools become real one group at a time.
- The catalog screen, the planner prompt and the MCP `list_tools` answer are all produced from the same generated JSON, so they cannot drift.

Example (shortened):

```json
{
  "id": "cards.make_recall",
  "version": 1,
  "group": "Cards",
  "label": "Make recall cards",
  "summary": "Turns the notes into question and answer cards.",
  "aiDescription": "Adds question/answer or fill-in-the-blank cards to an existing page. Needs pageId from an earlier step or the destination.",
  "inputs": {
    "type": "object",
    "required": ["pageId", "cards"],
    "additionalProperties": false,
    "properties": {
      "pageId": { "$ref": "#/$defs/idOrRef" },
      "cards": {
        "type": "array",
        "minItems": 1,
        "maxItems": 200,
        "items": { "$ref": "spec.schema.json#/$defs/card" }
      }
    }
  },
  "outputs": {
    "type": "object",
    "properties": {
      "pageId": { "type": "string" },
      "cardIds": { "type": "array" }
    }
  },
  "writes": [
    { "target": "blocks", "mode": "append" },
    { "target": "cards", "mode": "create" }
  ],
  "permissions": { "scope": "notes:write" },
  "cost": { "class": "small", "fill": "model", "outTokens": 900 },
  "tier": "simple",
  "reversible": "batch",
  "risk": "direct",
  "idempotent": true,
  "limits": { "timeoutMs": 60000, "maxRetries": 3 },
  "surfaces": ["app", "mcp"],
  "offline": false
}
```

## 4. Plan schema

A plan is one JSON document (`plan.schema.json`, limit 256 KB like the notebook spec).

```json
{
  "version": 1,
  "id": "job_01HF…",
  "goal": "A notebook from my sources with a summary, a mind map and 10 cards",
  "origin": "app",
  "destination": { "kind": "new_notebook", "title": "Habits that stick" },
  "sources": ["s1", "s2"],
  "effort": "standard",
  "steps": [
    {
      "id": "s1",
      "tool": "notebooks.create",
      "toolVersion": 1,
      "args": { "title": "Habits that stick" },
      "placement": { "in": "$destination" }
    },
    {
      "id": "s2",
      "tool": "pages.write_notes",
      "toolVersion": 1,
      "args": {
        "notebookId": { "$from": "s1.notebookId" },
        "brief": "Clear notes with headings"
      },
      "placement": { "in": "s1.notebookId", "tab": "Notes", "position": "end" },
      "dependsOn": ["s1"]
    },
    {
      "id": "s3",
      "tool": "cards.make_recall",
      "toolVersion": 1,
      "args": { "pageId": { "$from": "s2.pageId" }, "count": 10 },
      "placement": { "in": "s2.pageId", "tab": "Cards" },
      "dependsOn": ["s2"],
      "optional": true
    }
  ],
  "budget": { "maxInr": 0 }
}
```

| Part                   | Rule                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `destination`          | `new_notebook` (title), `notebook` (id, optional section id), `page` (id), `library`. One per plan; steps place their output relative to it. The remembered path per tag fills this in by default.                                                                             |
| `steps`                | 1 to 40, in display order. The order must respect `dependsOn` (a step never comes before something it needs).                                                                                                                                                                  |
| `id`                   | Unique in the plan, `s` + number.                                                                                                                                                                                                                                              |
| `args`                 | Checked against the tool's `inputs`. A value may be `{ "$from": "<stepId>.<output field>" }`, which the executor replaces with that step's real output.                                                                                                                        |
| `args.brief` / content | For tools with `fill: "model"`, the planner writes a short `brief`. The filler turns it into the tool's full content (`cards`, `page`, `outline`…) before staging. A caller that already has the content (Claude through the connector) sends the content itself and no brief. |
| `placement`            | Where the output goes: `in` (destination or an earlier output), `tab`, `position` (`start`, `end`, `after: blockId`). Shown on each plan row ("New notebook › Notes tab").                                                                                                     |
| `dependsOn`            | Steps that must succeed first. Skipping a step also skips everything that depends on it.                                                                                                                                                                                       |
| `optional`             | May be skipped on failure without stopping the job.                                                                                                                                                                                                                            |
| `enabled`              | The person's tick box. Disabled steps are kept in the plan but not run; unticking a step unticks its dependants (and says so).                                                                                                                                                 |

Studio multi-select and Workflows produce the same document: Studio builds a plan from the ticked tiles; a Workflow is a saved plan template with blanks for sources and destination.

## 5. Planner contract (AI → plan JSON)

1. **Input to the model:** the person's goal; the destination; a short list of the ticked sources (title, kind, size, never the full text at this stage); the catalog as compact JSON (`id`, `aiDescription`, `inputs`), already filtered to what this person may use (scopes, unlocked Professional tools, surface).
2. **Output:** exactly one plan document, returned through a forced structured call (`submit_plan`), never free text. The model may not write content here, only briefs.
3. **Check:** the validator (section 6) runs. Errors go back to the model as a list of `path: message` lines; at most **2 repair rounds**.
4. **Fallback:** if the plan is still invalid, the app uses a built-in template plan for the closest goal (notebook from sources, page tidy-up, cards from page) and says so. The person can always build a plan by hand from the catalog with no model at all.
5. **The plan is shown before anything runs.** The person can untick, reorder, remove and add steps; every edit re-runs validation live, and Run stays disabled while there are errors, with the reason on the row.
6. **Source text is data, not instructions.** It reaches models only inside the untrusted-content envelope the connector already uses. The planner sees source titles and sizes only, so a hostile source cannot rewrite the plan. The filler sees source text but can only return content for one already approved step.

## 6. Validation and dry-run

Validation is a pure function `validatePlan(plan, catalog, context) → errors[]`. Same error style as `spec.ts`: an exact path plus a plain sentence (`/steps/2/args/pageId: This step needs a page from an earlier step.`).

| Level          | Checks                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Shape       | Plan matches `plan.schema.json`; size and step limits.                                                                                       |
| 2. Registry    | Each tool id exists, the version is supported, the tool is offered on this surface.                                                          |
| 3. Arguments   | `args` match the tool's `inputs` (after treating `$from` values as their target type).                                                       |
| 4. Graph       | Step ids unique; `dependsOn` and `$from` point at earlier, enabled steps; the named output exists and has the right type; no cycles.         |
| 5. Placement   | The destination exists and is allowed; a tab or section named in `placement` exists or is created by an earlier step.                        |
| 6. Permissions | Scope granted; Professional tool unlocked; notebook is in the person's AI choice; locked notebooks and pages follow the existing lock rules. |
| 7. Safety      | No tool outside the registry; `risk` rules respected (section 10); per-job caps (records, pages, cards).                                     |
| 8. Budget      | The estimate fits the limits (section 9). A budget failure is a refusal with a reason, not an error to repair.                               |

**Dry-run** = fill + stage with no save. Every step's `stage` function runs against a **staged view** (a read-only snapshot of the notes plus the change sets of earlier steps), and returns a **ChangeSet**: records to create (with their final ids), edits (each naming the revision it was made from), History copies to take, and a summary (`counts`, placement, risk). The Preview screen, the "what was built" list and the MCP `plan_preview` answer are all drawn from the ChangeSet. Nothing is written until commit.

## 7. Jobs and states

A **job** is one run of one plan. Stored in a new Dexie table `aiJobs` (plan, state, per-step state, checkpoints, undo record, cost, timings) and synced as an end-to-end encrypted record like `claudeInbox`, so the Activity list works on every device and offline.

```
draft → validated → queued → running → preview → applying → applied → (undone)
                       │        │  ▲                 │
                       │        ▼  │ retry/skip      └→ failed (nothing written)
                       │   needs_attention
                       └→ waiting_offline         cancelled (nothing written)
```

Step states: `waiting`, `running`, `done`, `failed`, `skipped`, `blocked` (a step it depends on was skipped or failed).

## 8. The transactional executor

### 8.1 Two phases

- **Phase 1, fill and stage.** For each enabled step in order: resolve `$from` values, get the content (filler model, or already supplied), run `stage`, add the ChangeSet to the staged view, save a checkpoint. This is the slow part and the only part that can fail for outside reasons (network, model, limits). It writes nothing to the notes.
- **Phase 2, commit.** On Apply: check that every record the job edits is still at the revision it was staged from; take the History copies; write the whole ChangeSet, the undo record and the Activity entry in **one transaction**. In the app that is a single Dexie transaction across the tables; in the online connector it is one `claude_push` call (all or nothing, records saved leaf-first with the notebook or page last, as today). A job is capped at 1,000 records so it always fits one all-or-nothing save.

### 8.2 All or nothing

- A job ends in exactly one of: **applied** (every staged step written) or **not applied** (nothing written). There is no half-applied notebook.
- If the person skips a step, the job that is committed is the smaller, complete job, and the preview shows exactly that.
- If a page changed between staging and Apply, the commit stops before writing, the affected steps are staged again on the new page, and the preview refreshes with a line saying why. If that is not possible (the block to replace is gone) the step fails like any other.

### 8.3 Checkpoints and resume

- After each step, `aiJobs` stores the step state, its output and its ChangeSet. Closing the app, an iPad app switch or a crash loses at most the step in progress.
- On start, any job in `running` resumes from the first step that is not `done`. A job in `applying` is checked: the transaction either finished (the job record says `applied`) or never happened (state goes back to `preview`).
- A job in `preview` stays there until Apply or Discard. Drafts older than 30 days are discarded with a line in Activity.

### 8.4 Idempotent steps

- Each step has a key: hash of (job id, step id, tool id + version, resolved args). A step with a stored result for its key is never filled or staged twice.
- Record ids are derived from (job id, step id, index), not random. Writing them again after a retry meets "must be new" on the same ids and is treated as already done, so a retry can never create duplicates.
- The commit carries the job id. A second commit of the same job is a no-op that answers "already applied".

### 8.5 Retries, backoff, timeouts

| Failure                                                      | Action                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Network error, HTTP 429, 5xx, model overloaded, step timeout | Retry up to `maxRetries` (default 3) with waits of 1 s, 4 s, 15 s plus random jitter; `Retry-After` is honoured.                                                   |
| Model returned content that fails the tool's `inputs` schema | One repair round with the errors; then counts as a failure.                                                                                                        |
| Validation, permission, budget, lock, "page is gone"         | Never retried. Shown at once with the reason.                                                                                                                      |
| Step timeout                                                 | Per tool (`limits.timeoutMs`; defaults: `none` 5 s, `small` 60 s, `medium` 120 s, `large` 300 s). Job timeout: 15 minutes of running time, then `needs_attention`. |

### 8.6 Partial-failure recovery

When a step is still failing after its retries the job pauses in `needs_attention` and the row shows what went wrong in one plain line, with:

- **Retry**: runs that step again (new retry budget). Earlier steps are kept.
- **Skip**: marks it skipped; steps that depend on it become `blocked` and are listed before the person confirms. Offered when the step is optional or the rest of the job still makes sense; never for the first step that creates the destination.
- **Stop**: ends the job. Nothing was written, the plan is kept for editing.

Optional steps that fail are skipped automatically and reported in the preview. Stop is always available while running and is immediate (the current model call is aborted).

### 8.7 Offline queue

- Tools with `fill: "none"` (reorder, move, rename, style, export…) stage and commit offline.
- A job that needs a model while offline goes to `waiting_offline`, visibly ("Waiting for internet"), and starts when the connection returns, in the order queued. A job that was mid-run pauses at its checkpoint.
- Commit is always local, so Apply works offline; sync sends the records later like any other edit.
- One job runs at a time per device; others queue. Two devices cannot run the same job (the job record carries the device id and a lease that expires).

### 8.8 Undo log (re-uses page History)

Each applied job stores an undo record:

| What the job did                                             | Undo does                                                                                                                      | Existing code reused                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Created records (blocks, pages, cards, databases, notebooks) | Removes that batch: blocks marked `source: 'ai'` with the job's `batchId`; whole pages or notebooks go to Trash (recoverable). | "Remove this AI result" batch ids, `src/trash/trashService.ts`        |
| Edited an existing page                                      | Restores the History copy taken just before ("before AI job: <goal>").                                                         | `recordVersion` / `restoreVersion` in `src/history/versionService.ts` |
| Changed values (style, tab names, order, tags)               | Puts the old values back, only where the value is still the one the job set.                                                   | new, small                                                            |

- **One Undo per job**, from the done card, the toast, the Activity row, and the top-bar Undo while it is the latest action (one `aiJob` step in `src/history/pageHistory.ts` via `registerKind`, so Redo works too).
- Undo is itself one transaction, and idempotent.
- If the person edited AI-made content after the job, Undo says so first and moves it to Trash rather than removing it silently. A History copy made by the server cannot contain ink (`inkKept`), as today.

## 9. Cost estimator and budget guard

- **Estimate per step** = input tokens (the share of the ticked sources this tool reads, measured, plus the prompt) + output tokens (`cost.outTokens`, scaled by counts such as "10 cards") × the price of the model the router would pick (`costOf` / `worstCost` in `src/ai/usage.ts`). Planning cost is added once. Shown as "about ₹X" per job and per effort level; free engines show "free" and what a paid model would cost.
- **One gate.** `spendGate(job)` is the only function that can start a paid call. It checks, in order: monthly limit (default ₹0, hard stop), per-job limit, "ask me above ₹X". This closes the audit item "no two settings may double-enable or double-charge".
- **Reservation.** When a job starts, its estimate is reserved against the month so two jobs cannot both slip under the limit. The reservation is replaced by the real spend at the end.
- **Metering during the run.** Real tokens are recorded after every call (`recordUsage`). If the real spend would pass the approved estimate by more than 20%, the job pauses and asks. It never passes a hard limit: the step that would cross it is not sent.
- **Retries cost money too.** They are counted against the same approval.
- **Free first.** Claude through the connector costs ₹0 and is the default engine. Its limits are rate limits, not rupees, and are shown the same way ("Waiting 40 s for the Claude limit").

## 10. Safety

- **Untrusted content.** Sources, notes and web pages are data. They are wrapped in the `untrusted_note_content` envelope (the marker is defused inside the text) for every model call. Model output is parsed as JSON and schema-checked; it is never run, never used as HTML, and links must be https.
- **Allow-list only.** A plan can name only registry tools. Unknown tool = invalid plan. The filler can only return the content shape of the step it was asked for.
- **No delete without the Inbox.** There is no delete tool. Tools with `risk: "inbox"` always wait for Accept, with "Show changes", even when "Apply automatically" is on. Removed or replaced material is in History or Trash.
- **Apply automatically** (owner setting, off by default) covers only plans whose every step is `risk: "direct"`; a preview is still stored in Activity.
- **Big edits to existing pages** keep the connector's rule: over 30% of the page, anything touching recall cards, or a stale page version goes to the Inbox.
- **Rate limits.** In the app: one running job, 40 steps per plan, 1,000 records per job, 30 jobs an hour. Connector: section 11.4.
- **Locks and privacy.** Locked notebooks and pages, the per-notebook "Allow AI" choice and the AI-off switch are checked by the validator and again at commit.
- **Secrets.** Keys stay in the key vault; plans, jobs and logs never contain keys. The server audit log holds ids and counts, never text.
- **Circuit breaker.** A tool that fails more than 20% of its last 20 runs is switched off for planning on that device and flagged in Activity ("stop the line"), until the next app update or a manual re-enable.

## 11. One registry, two doors: the app and the Claude connector

### 11.1 The idea

The registry and the executor are shared. The two doors differ only in **who fills the content**:

- **In the app**, the planner and the filler are models called by the app (or Claude through the connector, when the person uses "send to Claude").
- **Through MCP**, Claude is the planner and the filler. It sends a plan whose steps already carry their content. The server never calls a model, so a connector run is always ₹0 for the app.

From validation onward the path is identical code.

### 11.2 What is new on the MCP side

Existing tools stay exactly as they are (`ping`, `list_notebooks`, `list_pages`, `search`, `read`, `list_cards`, `create_notebook`, `add_page`, `add_cards`, `create_database`, `apply_style`, `refine_page`). Internally the six write tools become one-step plans run by the executor, so they gain job ids, Activity entries and Undo without changing for Claude.

Six new tools give Claude the whole catalog:

| MCP tool                     | Scope         | What it does                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_tools(group?, query?)` | `notes:read`  | The catalog: id, label, group, one-line `aiDescription`, risk, whether it is unlocked. Paged.                                                                                                                                                                                                                                                                                               |
| `describe_tool(id)`          | `notes:read`  | Full definition of one tool: inputs and outputs schemas, writes, limits, an example step.                                                                                                                                                                                                                                                                                                   |
| `plan_preview(plan)`         | `notes:read`  | Validates and dry-runs. Returns errors (path + sentence) or a summary: per step what will be created or changed and where, which steps will wait in the Inbox and why, record counts. Writes nothing.                                                                                                                                                                                       |
| `run_plan(plan, mode?)`      | `notes:write` | Validates, stages and commits in one all-or-nothing save, or stores the whole job as one Inbox item. `mode`: `auto` (default: follows the owner's "Apply automatically" switch and each tool's `risk`) or `inbox` (always wait). Returns the job id, state, and what was applied or is waiting. The plan `id` is the idempotency key: sending the same plan again returns the first result. |
| `job_status(jobId)`          | `notes:read`  | State of a job: applied, waiting in the Inbox, accepted, rejected, undone, with counts.                                                                                                                                                                                                                                                                                                     |
| `undo_job(jobId)`            | `notes:write` | Undoes a job this connection ran: History restore plus Trash for what it created (never a hard delete). If the person has edited the result since, it becomes an Inbox request instead.                                                                                                                                                                                                     |

Why generic tools and not one MCP tool per catalog tool: 60+ tool definitions would fill Claude's context on every chat, MCP clients cap or truncate long lists, and a multi-step build must be one atomic job, which separate calls cannot give. `list_tools` + `describe_tool` let Claude load only what it needs.

Each `run_plan` call finishes inside one request (staging is pure and the content is already supplied), so the stateless design of the online function is kept. `job_status` exists for Inbox outcomes, not for long-running work.

### 11.3 Parity table

| Feature                | In the app                                    | Through the connector (local `mcp/` and online)                                                                  |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tool catalog           | Catalog screen from `catalog.gen.json`        | `list_tools`, `describe_tool` from the same file                                                                 |
| Who plans              | Planner model, or by hand                     | Claude                                                                                                           |
| Who writes the content | Filler model                                  | Claude (in the step args)                                                                                        |
| Plan validation        | `validatePlan`                                | Same function                                                                                                    |
| Dry-run / preview      | Preview screen                                | `plan_preview` summary to Claude; full visual preview in the app's Inbox                                         |
| Approval               | Preview → Apply; "Apply automatically" switch | Same switch; otherwise one Inbox item per job with Accept / Reject and "Show changes"                            |
| All-or-nothing commit  | One Dexie transaction                         | One `claude_push` (online) or one local save (local connector)                                                   |
| Idempotency            | Step keys + derived ids                       | Same, plus plan `id` on `run_plan`                                                                               |
| Retries                | Executor (model and network calls)            | Not needed server-side (no model call); a failed save answers "Nothing was changed" and Claude may resend safely |
| Partial failure        | Retry / Skip / Stop on the row                | `plan_preview` reports the failing step; `run_plan` applies nothing unless every non-optional step stages        |
| Undo                   | Done card, Activity, top-bar Undo             | `undo_job`; and the person can Undo it in the app's Activity                                                     |
| Cost guard             | `spendGate`, estimates                        | ₹0 (no app-side model); rate limits instead                                                                      |
| Safety rules           | Section 10                                    | Same validator levels; no delete; 30% and cards rules; untrusted envelope on everything read                     |
| Activity log           | Local job log                                 | Same job record (synced, encrypted) + `claude_audit` line (ids and counts only)                                  |
| Offline                | Queue                                         | Local connector works on the PC offline; online needs internet                                                   |
| Professional locks     | Per-tool unlock                               | Same switches; a locked tool is listed as locked and refused in plans                                            |

Target: every catalog tool has `surfaces: ["app","mcp"]`. Exceptions must be written in the registry with a reason (expected: tools that need the screen, such as Pencil or camera capture).

### 11.4 Auth, scopes and limits

- **Sign-in:** unchanged (OAuth 2.1, PKCE, 1-hour pass for this one address, rotating refresh pass). The local connector keeps its own key.
- **Scopes:** unchanged: `notes:read` and `notes:write`. Write still never includes delete. No new consent is needed for people already connected; the consent text gains one line ("run multi-step plans; big changes wait in your Inbox").
- **Notebook choice and escrow:** unchanged. A plan can only touch notebooks in the person's choice; a notebook the plan creates joins the choice.
- **Rate limits** (same counter, `claude_rate_hit`): reads 60 a minute (`list_tools`, `describe_tool`, `plan_preview`, `job_status`). Writes 20 a minute and 500 a day, where **one `run_plan` counts as one write plus one per enabled step**, checked before anything runs and refused whole with HTTP 429 and `Retry-After`. Plans: 40 steps, 256 KB, 1,000 records. `undo_job` counts as one write.
- **Audit:** one `claude_audit` line per job: job id, tool ids, connection, notebook and page ids, counts. Never content.

## 12. Re-using the existing connector tools and `spec.schema.json`

- **Content shapes come from the spec.** Today `spec.schema.json` describes a whole notebook inline. Slice 0 moves its page, block, card, database and style shapes into named `$defs` (no change to what is accepted; `spec.test.ts` proves it) so tool `inputs` can `$ref` them. One definition of "a card" or "a block" for the spec, the tools and the filler.
- **The checker is shared.** `spec.ts` (and its generated Deno copy) already gives exact-path errors and cross-reference checks; `validate.ts` calls it for content and adds the plan levels.
- **The first tools are the existing ones:**

| Existing connector tool    | Registry tool                                                                           | Notes                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `create_notebook(spec)`    | `notebooks.create` (+ a convenience `notebooks.create_from_spec` that expands to steps) | Uses `notesWrite` as is                                                |
| `add_page`                 | `pages.write_notes`                                                                     | `parentVersion` check kept                                             |
| `add_cards`                | `cards.make_recall`, `cards.make_cloze`                                                 | "Recall cards" heading rule kept                                       |
| `create_database`          | `databases.create`                                                                      | Three starter views kept                                               |
| `apply_style`              | `styles.apply`                                                                          | `baseRev` check kept; `reversible: "values"`                           |
| `refine_page`              | `pages.refine`                                                                          | 30%, cards and stale-version Inbox rules kept; `reversible: "history"` |
| `search`, `read`, `list_*` | read tools, `writes: none`                                                              | Usable as plan steps that feed later steps                             |

- **The Inbox grows one item kind:** `job` (a whole staged plan) next to today's page-change item, with the same Accept / Reject / Show changes screen.
- **Stage functions return what `notesWrite` already returns** (`MadeRecord[]`, `Counts`), wrapped as a ChangeSet, so the tested record-making code is not rewritten.

## 13. Model router (Auto and effort)

Built on `src/ai/route.ts` (`buildCandidates`, `callAi`) and the key vault.

- **Task level comes from the registry, not a guess.** Each tool has a `tier`: `planning` (the plan itself, mind-map structure, merges), `writing` (notes, summaries, refine) or `simple` (tags, cards, renames). A small classifier model is used only for free text with no tool (chat questions).
- **Preference:** Auto = Balanced (default), Best, Cheapest, or an exact model. Free first: Claude through the connector whenever it is connected.
- **Effort** sets who does what:

| Effort   | Planner      | Filler                                                                 | For                                                  |
| -------- | ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Quick    | small model  | small model                                                            | short jobs                                           |
| Standard | middle model | middle model (small for `simple` tools)                                | most notebooks                                       |
| Deep     | top model    | each step's own tier, steps without dependencies in parallel (up to 3) | big or tricky jobs: "top model plans, workers write" |

- **Fallback:** if a model fails after its retries, the router tries another model of the same level and the same or lower price. Moving to a dearer model always asks first.
- **Records:** every call logs model, tokens, cost and duration to the job (section 14), which is also what the estimator learns its averages from.

## 14. Observability: the Activity log

- **One entry per job**, in plain words ("Built 'Habits that stick' with 7 steps"), with origin (in the app, or which Claude connection), destination path, time, cost and **Undo / Redo**.
- **Open an entry** to see each step: tool, state (done, skipped, failed + reason), retries, duration, model, tokens, cost, what it created or changed (links to the pages).
- **Stored** in `aiJobs` (synced, encrypted). The plan and goal stay on the person's devices; the server audit has ids and counts only.
- **Health view** (Settings › AI › Activity, Professional): success rate and common failure reasons per tool, the circuit-breaker state, average cost against the estimate.
- **Debug export**: a JSON file of a job with all text removed, for bug reports.
- **Toasts** only for errors or things done out of sight, as the quality standard says.

## 15. Test strategy

| Kind                          | What                                                                                                                                                                                                                                                                                                                                                                                                                      | Gate                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Contract tests per tool**   | For every tool: the definition is complete; example inputs pass and broken ones fail with the expected path; `stage` returns records that pass the app's own type checks; outputs match the `outputs` schema; staging twice gives identical records (idempotent); apply then undo returns the database to the exact starting state; limits are enforced. Generated from one template, so a tool cannot ship without them. | A tool without green contract tests is not in the catalog. |
| **Golden plans**              | About 20 fixed plans (notebook from sources, page tidy-up, Studio multi-select, each existing connector call as a plan…) with fixed content. The resulting records are compared to stored snapshots, in the app, in Node (`mcp/`) and in Deno, so all three give byte-equal results.                                                                                                                                      | Any difference fails the build.                            |
| **Fuzzing invalid plans**     | Property tests (fast-check): random and mutated plans (unknown tools, cycles, forward `$from`, wrong types, huge sizes, hostile strings, envelope-closing text). The validator must never throw, must always return path + message, and the executor must never write for an invalid plan.                                                                                                                                | 10,000 cases per run in CI.                                |
| **Executor fault injection**  | A fake model and fake clock: fail the Nth call, time out, return bad JSON, go offline mid-step, kill the app between any two checkpoints and during commit, change the page before Apply, run the same job twice, two jobs at once. After every case: either fully applied or nothing written, no duplicates, Undo works.                                                                                                 | Every state transition in section 7 is covered.            |
| **Budget tests**              | Estimates against recorded real runs (within 30%); the gate refuses at ₹0, at the monthly and per-job limits; reservation stops two jobs overspending; a retry cannot pass a limit.                                                                                                                                                                                                                                       |                                                            |
| **Planner evals**             | A fixed set of goals run against the real models on demand (not in CI, it costs money: owner approval needed): share of valid first-try plans, repair rounds needed. Free with the connector engine.                                                                                                                                                                                                                      | Tracked, not blocking.                                     |
| **MCP parity**                | The same plan through `run_plan` and through the app gives the same records, the same Inbox decisions and the same undo result (extends `parity.test.ts`, `mcpWriteParity.test.ts`). Scope and rate-limit refusals.                                                                                                                                                                                                       |                                                            |
| **End to end on iPad WebKit** | Playwright `ipad-webkit` project (already in the config): goal → plan → edit plan → run → a step fails → Retry and Skip → preview → Apply → Undo → Redo; app switch and reload mid-run; offline queue; 1180×820, 820×1180 and phone width; Pencil and finger taps; reduced motion; dark and light.                                                                                                                        | Then the owner's real iPad ("go and see").                 |
| **Regression rule**           | Every bug gets a failing test first, then the fix (quality standard, point 3).                                                                                                                                                                                                                                                                                                                                            |                                                            |

## 16. Rollout slices

Each slice is shippable, behind the existing "AI mode" Professional switch, and ends with its tests green and an Opus review before the owner's iPad test.

| #   | Slice                                                                                                                                                                                                                                                            | What the owner can do after it                                                                                         | Cost                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0   | **Foundations.** Named `$defs` in `spec.schema.json`; registry format, `catalog.gen.json` and its sync script; plan schema; validator; the six existing write tools and the read tools defined as registry tools. No behaviour change.                           | Nothing visible. Catalog screen can list the real tools.                                                               | ₹0                                                                                 |
| 1   | **Executor core.** `aiJobs` table (a Dexie upgrade with a migration test), stage → commit, checkpoints, idempotent ids, undo record using History and Trash, fault-injection tests.                                                                              | Nothing visible yet.                                                                                                   | ₹0                                                                                 |
| 2   | **Build with a hand-made plan.** AI space Build: pick steps from the catalog, placement, run, progress with Retry / Skip / Stop, Preview, Apply, Undo, Activity. Content comes through the existing copy-prompt / paste-answer path or Claude via the connector. | Real jobs, end to end, free.                                                                                           | ₹0                                                                                 |
| 3   | **Connector parity.** `list_tools`, `describe_tool`, `plan_preview`, `run_plan`, `job_status`, `undo_job` in `mcp/` and the online function; the Inbox `job` item; existing six write tools routed through the executor; rate-limit counting per step.           | From claude.ai: "build me a notebook with a summary, a mind map and 10 cards" as one job, with Preview/Inbox and Undo. | ₹0 (needs the online connector deployed: owner steps already in the connector doc) |
| 4   | **Planner + filler in the app.** Goal box → plan; effort levels; model router tiers; cost estimator; `spendGate`; reservation and metering.                                                                                                                      | Type a goal, get a plan, run it with a built-in model.                                                                 | Paid models only if the owner sets a limit above ₹0                                |
| 5   | **Catalog growth, one group per sub-slice.** 5a Pages, Tabs, Summaries; 5b Mind maps, Cards; 5c Databases, Styles, Layouts; 5d Tags, Library; 5e Home widgets, Search, Review, Import and export. Each tool arrives on both doors at once.                       | More and more of the catalog becomes real.                                                                             | ₹0                                                                                 |
| 6   | **Studio multi-select, Workflows as saved plans, Jobs from the Inbox**, remembered paths per tag.                                                                                                                                                                | One plan from several Studio tiles; rerun a saved workflow.                                                            | ₹0                                                                                 |
| 7   | **Top-bar AI panel "Change this page"** on every screen, using the same executor with the page as destination; top-bar Undo integration.                                                                                                                         | "Make this a 2-column page with a summary tab and 10 cards."                                                           | ₹0                                                                                 |
| 8   | **Trust features.** "Apply automatically" for direct-risk plans, offline queue polish, health view, circuit breaker, debug export.                                                                                                                               | Hands-off runs once trusted.                                                                                           | ₹0                                                                                 |

## 17. Decisions to review with the owner

Safest option chosen in each case; nothing here is built yet.

1. **Generic MCP tools** (`run_plan` + `list_tools`/`describe_tool`) instead of one MCP tool per catalog tool. The 12 existing tools stay.
2. **`undo_job` from Claude** is allowed for that connection's own jobs, never hard-deletes (History + Trash), and turns into an Inbox request if the person has edited the result. Alternative: Undo only inside the app.
3. **Scopes stay at two** (`notes:read`, `notes:write`), so nobody has to reconnect. Alternative: a separate `notes:plan` scope with a new consent.
4. **Jobs are capped** at 40 steps and 1,000 records so every job fits one all-or-nothing save.
5. **"Apply automatically" never covers Inbox-risk tools** (merge, split, find and replace, big rewrites).
6. **Planner evals with paid models** need the owner's cost approval; the free connector engine is used by default.
7. **New Dexie table `aiJobs`** (a data upgrade; follows `rules/global.md` upgrade rules and gets a migration test).
