import { toCatalog } from '../catalog'
import { AI_TOOLS_BY_ID } from '../registry'
import type { CatalogTool } from '../types'
import type { PlanError } from '../validate'
import { StepError, type Filler } from '../jobs/filler'
import type { JobStore } from '../jobs/jobStore'
import { MemoryJobStore } from '../jobs/jobStore'
import type {
  AiJob,
  ChangeSet,
  JobPlan,
  Rec,
  StagedRecord,
  UndoRecord,
} from '../jobs/jobTypes'
import type { NotesPort } from '../jobs/notesPort'
import { StaleError } from '../jobs/notesTx'
import { JobRunner } from '../jobs/runner'
import type { InboxJobReason } from './inboxJob'

/**
 * The connector's side of the AI framework (design section 11): the same
 * checker, the same stage functions, the same all-or-nothing commit and the
 * same undo as the app, behind six tools. Pure logic over a `ConnectorHost`
 * (the local `mcp/` connector supplies one; the online function will too), so
 * the app, Node and Deno give the same records.
 */

/** A refusal with a plain message for Claude. Nothing was changed. */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PolicyError'
  }
}

export type InboxDecision = 'pending' | 'accepted' | 'rejected'

export interface ConnectorHost {
  /** Reads (already limited to what Claude may see) and undo / redo saves. */
  port: NotesPort
  store: JobStore
  /** Who is connected, for job origin and Inbox text ("Claude (PC)"). */
  connection: string
  now(): number
  /** The person's workspace id; throws a PolicyError before the first sync. */
  workspaceId(): string
  /** Brings the notes up to date before anything is read. */
  refresh(): Promise<void>
  /** Refuses plans this connector cannot carry out at all. */
  precheck?(plan: JobPlan): void
  /** Refuses change sets that touch notebooks, pages or scopes Claude may not use. */
  check(changes: ChangeSet): void
  /** Small changes to records before they are saved or stored (for example "Claude may keep working in this notebook"). */
  shape?(record: StagedRecord): StagedRecord
  /** One all-or-nothing save of the whole change set. */
  commit(records: readonly StagedRecord[], undo: UndoRecord): Promise<void>
  /** Puts a job (or a request to undo one) in the Inbox. */
  toInbox(
    job: AiJob,
    request: 'apply' | 'undo',
    reasons: InboxJobReason[],
  ): Promise<void>
  /** What the person decided about a job's Inbox item. */
  inboxStatus(jobId: string, request: 'apply' | 'undo'): InboxDecision | null
  /** True when something the job made was changed by the person since. */
  touched(job: AiJob): boolean
}

export interface StepProblem {
  id: string
  tool: string
  error: string
}

export type Staged =
  | { ok: true; job: AiJob; existed: boolean }
  | { ok: false; kind: 'invalid'; errors: PlanError[] }
  | { ok: false; kind: 'failed'; message: string; steps: StepProblem[] }

export interface PlanSummary {
  steps: {
    id: string
    tool: string
    label: string
    risk: string
    creates: Record<string, number>
    edits: Record<string, number>
    titles: string[]
  }[]
  counts: Record<string, number>
  records: number
  waitsInInbox: boolean
  reasons: InboxJobReason[]
  /** Plain-words lines for the person or for Claude. */
  lines: string[]
}

export type RunMode = 'auto' | 'inbox'

export interface RunOutcome {
  jobId: string
  /** `applied`, or `waiting_in_inbox` (nothing was written yet). */
  status: 'applied' | 'waiting_in_inbox'
  /** True when this answers an earlier call with the same plan id. */
  repeated: boolean
  counts: Record<string, number>
  records: number
  reasons: InboxJobReason[]
  outputs: Record<string, Rec | null>
  message: string
}

export type JobView = {
  jobId: string
  /** applied, waiting_in_inbox, accepted, rejected, undone, failed, cancelled */
  status: string
  goal: string
  counts: Record<string, number>
  undoRequested?: boolean
}

export type UndoOutcome =
  | { status: 'undone'; jobId: string; repeated: boolean }
  | { status: 'undo_requested'; jobId: string; message: string }

/** Content must be in the plan: Claude writes it, the connector has no model. */
class CallerFiller implements Filler {
  async fill(): Promise<unknown> {
    throw new StepError(
      'validation',
      'This step needs its content in the plan (the connector has no model to write it).',
    )
  }
}

const noSleep = async () => undefined

const sum = (o: Record<string, number>) =>
  Object.values(o).reduce((a, b) => a + b, 0)

function tally(records: readonly StagedRecord[]) {
  const creates: Record<string, number> = {}
  const edits: Record<string, number> = {}
  for (const r of records) {
    const into = r.baseRev ? edits : creates
    into[r.table] = (into[r.table] ?? 0) + 1
  }
  return { creates, edits }
}

export class ConnectorEngine {
  private readonly host: ConnectorHost
  private readonly catalog: readonly CatalogTool[]
  constructor(host: ConnectorHost) {
    this.host = host
    this.catalog = toCatalog()
  }

  // ---- reads that need no notes ----

  /** AF-30. The catalog as Claude sees it. */
  listTools(a: { group?: string; query?: string } = {}) {
    const q = a.query?.toLowerCase().trim()
    const tools = this.catalog
      .filter((t) => t.surfaces.includes('mcp'))
      .filter(
        (t) => !a.group || t.group.toLowerCase() === a.group.toLowerCase(),
      )
      .filter(
        (t) =>
          !q ||
          `${t.id} ${t.label} ${t.summary} ${t.aiDescription}`
            .toLowerCase()
            .includes(q),
      )
      .map((t) => ({
        id: t.id,
        version: t.version,
        label: t.label,
        group: t.group,
        description: t.aiDescription,
        risk: t.risk,
        scope: t.permissions.scope,
      }))
    return { tools, count: tools.length }
  }

  /** AF-30. One tool in full, with an example step. */
  describeTool(id: string) {
    const tool = AI_TOOLS_BY_ID.get(id)
    if (!tool || !tool.surfaces.includes('mcp'))
      throw new PolicyError(
        `There is no tool "${id}". Use list_tools to see the tools.`,
      )
    const { examples, ...def } = tool
    const good = examples.good[0] as Rec | undefined
    return {
      ...JSON.parse(JSON.stringify(def)),
      exampleStep: good
        ? { id: 's1', tool: tool.id, toolVersion: tool.version, args: good }
        : undefined,
    }
  }

  // ---- plans ----

  private runner(store: JobStore): JobRunner {
    return new JobRunner({
      store,
      port: this.host.port,
      filler: new CallerFiller(),
      clock: { now: () => this.host.now(), sleep: noSleep },
      workspaceId: this.host.workspaceId(),
      deviceId: this.host.connection,
      surface: 'mcp',
      random: () => 0,
    })
  }

  private normalise(plan: unknown): unknown {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return plan
    return { ...(plan as Rec), origin: 'mcp' }
  }

  /** Validates and stages in a throw-away store. Nothing is saved anywhere. */
  async preview(
    planIn: unknown,
  ): Promise<
    { ok: true; summary: PlanSummary } | Exclude<Staged, { ok: true }>
  > {
    const plan = this.normalise(planIn)
    this.pre(plan)
    await this.host.refresh()
    const runner = this.runner(new MemoryJobStore())
    const made = await runner.create(plan)
    if (!made.ok) return { ok: false, kind: 'invalid', errors: made.errors }
    const job = await runner.run(made.job.id)
    const problem = this.problem(job)
    if (problem) return problem
    this.host.check(job.changeSet!)
    return { ok: true, summary: this.summarize(job, 'auto') }
  }

  /**
   * AF-32..34. Validates, stages and keeps the job in `preview` without
   * saving anything. The same plan id twice gives the first job.
   */
  async stage(planIn: unknown): Promise<Staged> {
    const plan = this.normalise(planIn)
    this.pre(plan)
    await this.host.refresh()
    const runner = this.runner(this.host.store)
    const id = (plan as { id?: unknown } | null)?.id
    if (typeof id === 'string') {
      const old = await this.host.store.get(id)
      if (old && (old.state === 'cancelled' || old.state === 'failed'))
        await this.host.store.delete(id)
      else if (old && old.deviceId === this.host.connection)
        return { ok: true, job: old, existed: true }
    }
    const made = await runner.create(plan)
    if (!made.ok) return { ok: false, kind: 'invalid', errors: made.errors }
    const job = await runner.run(made.job.id)
    const problem = this.problem(job)
    if (problem) {
      if (job.state === 'needs_attention') await runner.stop(job.id)
      return problem
    }
    try {
      this.host.check(job.changeSet!)
    } catch (e) {
      await runner.stop(job.id)
      throw e
    }
    const shaped = this.shapeJob(job)
    await this.host.store.put(shaped)
    return { ok: true, job: shaped, existed: false }
  }

  /** Saves a staged job in one go with `commit` (default: the host's save). */
  async commit(
    jobId: string,
    commit?: (
      records: readonly StagedRecord[],
      undo: UndoRecord,
    ) => Promise<void>,
  ): Promise<AiJob> {
    const runner = this.runner(this.host.store)
    let cause: unknown
    const r = await runner.apply(jobId, async (records, undo) => {
      try {
        await (commit ?? ((x, y) => this.host.commit(x, y)))(records, undo)
      } catch (e) {
        cause = e
        throw e
      }
    })
    if (r.outcome === 'applied' || r.outcome === 'already_applied') return r.job
    await runner.stop(jobId).catch(() => undefined)
    // A refusal from the connection (revoked, offline) is told as it is.
    if (cause && !(cause instanceof StaleError)) throw cause
    throw new PolicyError(
      r.outcome === 'changed'
        ? 'A page changed while this was being saved. Nothing was changed. Read it again and retry.'
        : 'Could not save. Nothing was changed.',
    )
  }

  /** Drops a staged job that will not be saved. */
  async discard(jobId: string): Promise<void> {
    const job = await this.host.store.get(jobId)
    if (job && job.state === 'preview')
      await this.runner(this.host.store).stop(jobId)
  }

  /** AF-32, AF-33. Applies a plan straight away, or hands it to the Inbox. */
  async run(
    planIn: unknown,
    mode: RunMode = 'auto',
  ): Promise<RunOutcome | Exclude<Staged, { ok: true }>> {
    const staged = await this.stage(planIn)
    if (!staged.ok) return staged
    const { job } = staged
    if (staged.existed) return this.repeat(job)
    const reasons = this.reasons(job, mode)
    if (reasons.length) {
      try {
        await this.host.toInbox(job, 'apply', reasons)
      } catch (e) {
        await this.discard(job.id)
        throw e
      }
      return this.outcome(job, 'waiting_in_inbox', false, reasons)
    }
    const done = await this.commit(job.id)
    return this.outcome(done, 'applied', false, [])
  }

  /** AF-35. */
  async status(jobId: string): Promise<JobView> {
    const job = await this.own(jobId)
    return this.view(job)
  }

  /** AF-36, AF-37. */
  async undo(jobId: string): Promise<UndoOutcome> {
    let job = await this.own(jobId)
    const runner = this.runner(this.host.store)
    await this.host.refresh()
    if (job.state === 'undone')
      return { status: 'undone', jobId, repeated: true }
    if (job.state === 'preview') {
      const seen = this.host.inboxStatus(jobId, 'apply')
      if (seen === 'accepted') job = await runner.adoptApplied(jobId)
      else
        throw new PolicyError(
          seen === 'pending'
            ? 'That job is still waiting in the Inbox. Nothing has been changed yet, so there is nothing to undo.'
            : 'That job was never applied, so there is nothing to undo.',
        )
    }
    if (job.state !== 'applied' || !job.undo)
      throw new PolicyError(
        'That job was never applied, so there is nothing to undo.',
      )
    if (this.host.touched(job)) {
      await this.host.toInbox(job, 'undo', [])
      return {
        status: 'undo_requested',
        jobId,
        message:
          'The result was changed since. Nothing was undone. An "Undo this job" request is waiting in the Inbox for the owner to accept.',
      }
    }
    await runner.undo(jobId)
    return { status: 'undone', jobId, repeated: false }
  }

  // ---- helpers ----

  private pre(plan: unknown) {
    if (plan && typeof plan === 'object')
      try {
        this.host.precheck?.(plan as JobPlan)
      } catch (e) {
        if (e instanceof PolicyError) throw e
        throw new PolicyError('This plan cannot be carried out here.')
      }
  }

  /** A job that did not reach the preview: say which step stopped it. */
  private problem(job: AiJob): Exclude<Staged, { ok: true }> | null {
    if (job.state === 'preview' && job.changeSet) return null
    const steps = job.steps
      .filter((s) => s.state === 'failed' || s.error)
      .map((s) => ({
        id: s.id,
        tool: s.tool,
        error: s.error ?? 'Could not be prepared.',
      }))
    return {
      ok: false,
      kind: 'failed',
      message:
        job.notice ?? 'The plan could not be prepared. Nothing was changed.',
      steps,
    }
  }

  /** Records are shaped once, so the stored job is exactly what is saved. */
  private shapeJob(job: AiJob): AiJob {
    const shape = this.host.shape
    if (!shape || !job.changeSet) return job
    const records = job.changeSet.records.map(shape)
    job.changeSet = { ...job.changeSet, records }
    for (const s of job.steps)
      s.records = s.records.map(
        (r) => records.find((x) => x.table === r.table && x.id === r.id) ?? r,
      )
    return job
  }

  /** Why the job must wait for the person (empty = it may be saved now). */
  reasons(job: AiJob, mode: RunMode): InboxJobReason[] {
    const out = new Set<InboxJobReason>()
    if (mode === 'inbox') out.add('asked')
    for (const s of job.steps) {
      const tool = AI_TOOLS_BY_ID.get(s.tool)
      if (tool && tool.risk !== 'direct') out.add('risk')
    }
    if (job.changeSet?.records.some((r) => r.baseRev)) out.add('edits')
    return [...out]
  }

  summarize(job: AiJob, mode: RunMode): PlanSummary {
    const steps = job.steps.map((s) => {
      const tool = AI_TOOLS_BY_ID.get(s.tool)
      const { creates, edits } = tally(s.records)
      return {
        id: s.id,
        tool: s.tool,
        label: tool?.label ?? s.tool,
        risk: tool?.risk ?? 'direct',
        creates,
        edits,
        titles: s.records
          .filter((r) => r.table === 'notebooks' || r.table === 'pages')
          .map((r) => String(r.value.title ?? ''))
          .filter(Boolean),
      }
    })
    const counts = job.changeSet?.counts ?? {}
    const reasons = this.reasons(job, mode)
    return {
      steps,
      counts,
      records: sum(counts),
      waitsInInbox: reasons.length > 0,
      reasons,
      lines: steps.map(
        (s) =>
          `${s.id} ${s.label}: ${
            [
              sum(s.creates) ? `makes ${sum(s.creates)} records` : '',
              sum(s.edits) ? `changes ${sum(s.edits)} records` : '',
            ]
              .filter(Boolean)
              .join(', ') || 'nothing to write'
          }${s.titles.length ? ` (${s.titles.join(', ')})` : ''}`,
      ),
    }
  }

  private outcome(
    job: AiJob,
    status: RunOutcome['status'],
    repeated: boolean,
    reasons: InboxJobReason[],
  ): RunOutcome {
    const counts = job.changeSet?.counts ?? {}
    return {
      jobId: job.id,
      status,
      repeated,
      counts,
      records: sum(counts),
      reasons,
      outputs: Object.fromEntries(
        job.steps.map((s) => [s.id, s.outputs as Rec | null]),
      ),
      message:
        status === 'applied'
          ? 'Done. Everything was saved in one go, and it can be undone with undo_job.'
          : 'Nothing was saved yet. The whole job waits in the Inbox in Learning Notes for the owner to accept or reject.',
    }
  }

  private async repeat(job: AiJob): Promise<RunOutcome> {
    const view = await this.view(job)
    return this.outcome(
      job,
      view.status === 'waiting_in_inbox' ? 'waiting_in_inbox' : 'applied',
      true,
      [],
    )
  }

  private async own(jobId: string): Promise<AiJob> {
    const job = await this.host.store.get(jobId)
    if (!job || job.deviceId !== this.host.connection)
      throw new PolicyError('No such job from this connection.')
    return job
  }

  private async view(job: AiJob): Promise<JobView> {
    await this.host.refresh()
    let status: string = job.state
    if (job.state === 'preview') {
      const seen = this.host.inboxStatus(job.id, 'apply')
      status =
        seen === 'accepted'
          ? 'accepted'
          : seen === 'rejected'
            ? 'rejected'
            : 'waiting_in_inbox'
    }
    const undoSeen = this.host.inboxStatus(job.id, 'undo')
    return {
      jobId: job.id,
      status,
      goal: job.plan.goal,
      counts: job.changeSet?.counts ?? {},
      ...(undoSeen === 'pending' ? { undoRequested: true } : {}),
    }
  }
}
