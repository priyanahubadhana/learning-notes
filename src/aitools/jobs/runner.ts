import { toCatalog } from '../catalog'
import { AI_TOOLS_BY_ID } from '../registry'
import type { AiToolDef, CatalogTool } from '../types'
import { validatePlan, type PlanError } from '../validate'
import {
  RETRYABLE,
  StepError,
  systemClock,
  type Clock,
  type Filler,
} from './filler'
import type { JobStore } from './jobStore'
import {
  assertStepTransition,
  assertTransition,
  type AiJob,
  type ChangeSet,
  type JobPlan,
  type JobState,
  type JobStep,
  type PlanStepDef,
  type Rec,
  type StagedRecord,
  type StepState,
} from './jobTypes'
import type { NotesPort } from './notesPort'
import { StaleError, buildUndo, canon } from './notesTx'
import { stageStep, stepKey } from './stage'

/** Waits between tries of a step (AF-7), before jitter. */
export const BACKOFF_MS = [1000, 4000, 15000] as const

export interface RunnerDeps {
  store: JobStore
  port: NotesPort
  filler: Filler
  clock?: Clock
  deviceId?: string
  workspaceId: string
  /** Defaults to online. A step that needs a model waits when this is false. */
  isOnline?: () => boolean
  /** 0..1, for the retry jitter. Tests pass a fixed one. */
  random?: () => number
  catalog?: readonly CatalogTool[]
  /**
   * How long one fill may take, instead of the tool's own limit. The Build
   * screen waits for a person to paste an answer, which takes minutes.
   */
  fillTimeoutMs?: number
}

export type CreateResult =
  | { ok: true; job: AiJob; existed: boolean }
  | { ok: false; errors: PlanError[] }

export type ApplyOutcome = 'applied' | 'already_applied' | 'changed' | 'failed'

export interface ApplyResult {
  outcome: ApplyOutcome
  job: AiJob
}

/** States in which run() does work; in any other state it changes nothing. */
const RUNNABLE: ReadonlySet<JobState> = new Set([
  'validated',
  'queued',
  'running',
  'needs_attention',
  'waiting_offline',
])

type Verdict = 'done' | 'paused' | 'offline' | 'cancelled' | 'too_many'

const FROM = /^(s\d+)\.([A-Za-z][A-Za-z0-9_]*)$/

const isRef = (v: unknown): v is { $from: string } =>
  !!v &&
  typeof v === 'object' &&
  Object.keys(v).length === 1 &&
  typeof (v as Rec).$from === 'string'

function refsOf(v: unknown, into: Set<string>) {
  if (isRef(v)) {
    const m = FROM.exec(v.$from)
    if (m) into.add(m[1])
  } else if (Array.isArray(v)) v.forEach((x) => refsOf(x, into))
  else if (v && typeof v === 'object')
    Object.values(v).forEach((x) => refsOf(x, into))
}

/** The field that carries a tool's content (page, cards, ...), if it has one. */
export function contentField(tool: AiToolDef): string | undefined {
  for (const branch of tool.inputs.anyOf ?? [])
    for (const f of branch.required ?? [])
      if (f !== 'brief' && f !== 'count') return f
  return undefined
}

/** Same (table, id) twice: the last version wins, at the first one's place. */
export function mergeRecords(all: readonly StagedRecord[]): ChangeSet {
  const at = new Map<string, number>()
  const records: StagedRecord[] = []
  for (const r of all) {
    const k = `${r.table}/${r.id}`
    const i = at.get(k)
    if (i === undefined) {
      at.set(k, records.length)
      records.push(r)
    } else records[i] = r
  }
  const counts: Record<string, number> = {}
  for (const r of records) counts[r.table] = (counts[r.table] ?? 0) + 1
  return { records, counts: canon(counts) as Record<string, number> }
}

function parseAnswer(
  answer: unknown,
): { ok: true; value: Rec } | { ok: false; error: string } {
  let v = answer
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return { ok: false, error: 'The answer was not valid JSON.' }
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v))
    return { ok: false, error: 'The answer must be a JSON object.' }
  return { ok: true, value: v as Rec }
}

/**
 * Runs a checked plan as one job: stage every step (nothing written), then
 * write everything in one transaction. Section 7 of the design, AF-1..AF-12.
 * Errors from the filler that are not StepErrors count as outside failures
 * ('network') and are retried; errors from staging are never retried.
 */
export class JobRunner {
  private readonly store: JobStore
  private readonly port: NotesPort
  private readonly filler: Filler
  private readonly clock: Clock
  private readonly deviceId: string
  private readonly workspaceId: string
  private readonly isOnline: () => boolean
  private readonly random: () => number
  private readonly catalog: readonly CatalogTool[]
  private readonly fillTimeoutMs?: number
  private tail: Promise<unknown> = Promise.resolve()
  private busy = 0
  /** Errors thrown by the job store: they crash the run instead of failing a step. */
  private readonly saveErrors = new WeakSet<object>()
  private readonly aborts = new Map<string, AbortController>()

  constructor(deps: RunnerDeps) {
    this.store = deps.store
    this.port = deps.port
    this.filler = deps.filler
    this.workspaceId = deps.workspaceId
    this.clock = deps.clock ?? systemClock
    this.deviceId = deps.deviceId ?? 'device'
    this.isOnline = deps.isOnline ?? (() => true)
    this.random = deps.random ?? Math.random
    this.catalog = deps.catalog ?? toCatalog()
    this.fillTimeoutMs = deps.fillTimeoutMs
  }

  // ---- public ----

  /** AF-1. Invalid plans never become jobs. The same plan id twice gives the same job. */
  async create(plan: unknown): Promise<CreateResult> {
    const errors = validatePlan(plan, this.catalog)
    if (errors.length) return { ok: false, errors }
    const p = plan as JobPlan
    const old = await this.store.get(p.id)
    if (old) return { ok: true, job: old, existed: true }
    const now = this.clock.now()
    const job: AiJob = {
      id: p.id,
      plan: structuredClone(p),
      state: 'draft',
      steps: p.steps
        .filter((s) => s.enabled !== false)
        .map((s) => ({
          id: s.id,
          tool: s.tool,
          state: 'waiting' as const,
          key: '',
          outputs: null,
          records: [],
          error: null,
          retries: 0,
        })),
      changeSet: null,
      undo: null,
      notice: null,
      deviceId: this.deviceId,
      workspaceId: this.workspaceId,
      timings: { createdAt: now, updatedAt: now },
    }
    this.go(job, 'validated')
    await this.save(job)
    return { ok: true, job, existed: false }
  }

  get(id: string) {
    return this.store.get(id)
  }

  /** AF-2..AF-4, AF-7, AF-8. Stages until preview, a pause, or a stop. One job at a time. */
  async run(id: string): Promise<AiJob> {
    if (this.busy) await this.markQueued(id)
    return this.exclusive(() => this.runLocked(id))
  }

  /** AF-5: a page changed; stage everything again from fresh reads. */
  restage(id: string): Promise<AiJob> {
    return this.exclusive(() => this.runLocked(id, true))
  }

  /** AF-8 Retry: runs the failed step again with a fresh retry budget. */
  retryStep(id: string, stepId: string): Promise<AiJob> {
    return this.exclusive(async () => {
      const job = await this.need(id)
      const step = this.step(job, stepId)
      if (job.state !== 'needs_attention' || step.state !== 'failed')
        throw new Error('That step is not waiting for a decision.')
      this.setStep(step, 'waiting')
      step.retries = 0
      step.error = null
      await this.save(job)
      return this.runLocked(id)
    })
  }

  /** AF-8 Skip: the step becomes `skipped`, steps that need it `blocked`. */
  skipStep(id: string, stepId: string): Promise<AiJob> {
    return this.exclusive(async () => {
      const job = await this.need(id)
      const step = this.step(job, stepId)
      if (job.state !== 'needs_attention' || step.state !== 'failed')
        throw new Error('That step is not waiting for a decision.')
      if (
        job.plan.destination.kind === 'new_notebook' &&
        step.tool === 'notebooks.create'
      )
        throw new Error('The step that makes the notebook cannot be skipped.')
      this.setStep(step, 'skipped')
      this.blockDependents(job)
      await this.save(job)
      return this.runLocked(id)
    })
  }

  /** AF-8 Stop: the job ends, nothing was written. Also cuts a run that is going. */
  stop(id: string): Promise<AiJob> {
    this.aborts.get(id)?.abort()
    return this.exclusive(async () => {
      const job = await this.need(id)
      return this.cancelNow(job)
    })
  }

  /** AF-5, AF-6. One transaction for the whole ChangeSet and the undo record. */
  apply(id: string): Promise<ApplyResult> {
    return this.exclusive(async () => {
      const job = await this.need(id)
      if (job.state === 'applied') return { outcome: 'already_applied', job }
      if (job.state !== 'preview' || !job.changeSet)
        throw new Error('This job is not ready to apply.')
      const records = job.changeSet.records
      const undo = buildUndo(job.id, records)
      job.undo = undo
      this.go(job, 'applying')
      await this.save(job)
      try {
        await this.port.commit(job.id, records, undo)
      } catch (e) {
        const stale = e instanceof StaleError
        this.go(job, stale ? 'preview' : 'failed')
        job.undo = null
        job.notice = stale
          ? 'A page changed after this was prepared. Nothing was written. Prepare it again to see the new result.'
          : 'Could not save. Nothing was written.'
        await this.save(job)
        return { outcome: stale ? 'changed' : 'failed', job }
      }
      this.go(job, 'applied')
      job.notice = null
      job.timings.appliedAt = this.clock.now()
      await this.save(job)
      return { outcome: 'applied', job }
    })
  }

  /** AF-10. One transaction; created records go to Trash. A second call is a no-op. */
  undo(id: string): Promise<AiJob> {
    return this.exclusive(async () => {
      const job = await this.need(id)
      if (job.state === 'undone') return job
      if (job.state !== 'applied' || !job.undo)
        throw new Error('This job has nothing to undo.')
      await this.port.undo(job.id, job.undo)
      this.go(job, 'undone')
      job.timings.undoneAt = this.clock.now()
      await this.save(job)
      return job
    })
  }

  /** AF-10. Redo applies the same ChangeSet again. */
  redo(id: string): Promise<AiJob> {
    return this.exclusive(async () => {
      const job = await this.need(id)
      if (job.state === 'applied') return job
      if (job.state !== 'undone' || !job.undo || !job.changeSet)
        throw new Error('This job has nothing to redo.')
      await this.port.redo(job.id, job.changeSet.records, job.undo)
      this.go(job, 'applied')
      job.timings.appliedAt = this.clock.now()
      await this.save(job)
      return job
    })
  }

  /** AF-9. Called when the app starts. */
  async recover(): Promise<void> {
    for (const j of await this.store.list()) {
      if (j.state === 'running' || j.state === 'queued') await this.run(j.id)
      else if (j.state === 'applying') await this.settleApplying(j.id)
    }
  }

  // ---- running ----

  private async runLocked(id: string, again = false): Promise<AiJob> {
    const job = await this.need(id)
    if (job.state === 'preview' && again) this.resetForRestage(job)
    else if (!RUNNABLE.has(job.state)) return job
    if (job.state !== 'running') {
      this.go(job, 'running')
      job.notice = null
    }
    // A step left `running` by a crash goes back to waiting.
    for (const s of job.steps)
      if (s.state === 'running') this.setStep(s, 'waiting')
    // One time stamp for every record of the job (kept across a resume).
    job.timings.startedAt ??= this.clock.now()
    await this.save(job)

    const ctl = new AbortController()
    this.aborts.set(id, ctl)
    try {
      for (const step of job.steps) {
        if (ctl.signal.aborted) return await this.cancelNow(job)
        if (step.state !== 'waiting') continue
        const def = job.plan.steps.find((s) => s.id === step.id)
        if (!def) continue
        if (this.blockedByDeps(job, def)) {
          this.setStep(step, 'blocked')
          await this.save(job)
          continue
        }
        const verdict = await this.runStep(job, step, def, ctl.signal)
        if (verdict === 'cancelled') return await this.cancelNow(job)
        if (verdict !== 'done') {
          const to: JobState =
            verdict === 'offline'
              ? 'waiting_offline'
              : verdict === 'too_many'
                ? 'failed'
                : 'needs_attention'
          if (verdict === 'offline') this.setStep(step, 'waiting')
          this.go(job, to)
          job.notice =
            verdict === 'offline' ? 'Waiting for a connection.' : step.error
          await this.save(job)
          return job
        }
        if (this.stateOf(step) === 'skipped') this.blockDependents(job)
        await this.save(job)
      }
      return await this.finish(job)
    } finally {
      this.aborts.delete(id)
    }
  }

  private async cancelNow(job: AiJob): Promise<AiJob> {
    if (job.state !== 'cancelled') {
      this.go(job, 'cancelled')
      job.notice = 'Stopped. Nothing was written.'
      await this.save(job)
    }
    return job
  }

  /** AF-4. Every step settled: build the ChangeSet and go to preview. */
  private async finish(job: AiJob): Promise<AiJob> {
    const done = job.steps.filter((s) => s.state === 'done')
    const changeSet = mergeRecords(done.flatMap((s) => s.records))
    if (!changeSet.records.length) {
      this.go(job, 'failed')
      job.notice = 'There was nothing to write.'
      await this.save(job)
      return job
    }
    job.changeSet = changeSet
    job.timings.stagedAt = this.clock.now()
    this.go(job, 'preview')
    job.notice =
      done.length < job.steps.length ? 'Some steps were skipped.' : null
    await this.save(job)
    return job
  }

  private async runStep(
    job: AiJob,
    step: JobStep,
    def: PlanStepDef,
    signal: AbortSignal,
  ): Promise<Verdict> {
    const tool = AI_TOOLS_BY_ID.get(step.tool)
    if (!tool)
      return this.fail(
        step,
        def,
        new StepError('validation', 'That tool is not available.'),
      )
    this.setStep(step, 'running')
    try {
      const resolved = this.resolve(job, def.args)
      const key = stepKey(job.id, step.id, tool, resolved)
      if (step.key !== key) {
        step.key = key
        delete step.filled
      }
      let args: Rec = resolved
      const field = contentField(tool)
      if (tool.cost.fill !== 'none' && field && resolved[field] === undefined) {
        if (step.filled) args = { ...resolved, ...step.filled }
        else {
          if (!this.isOnline()) return 'offline'
          const filled = await this.fillWithRetry(
            job,
            step,
            tool,
            resolved,
            signal,
          )
          step.filled = filled
          args = { ...resolved, ...filled }
          await this.save(job)
        }
      }
      if (this.problems(tool, args).length)
        throw new StepError('validation', 'The content does not fit this step.')
      if (signal.aborted) return 'cancelled'
      const out = await stageStep(tool, args, {
        jobId: job.id,
        stepId: step.id,
        now: job.timings.startedAt ?? job.timings.createdAt,
        workspaceId: job.workspaceId,
        port: this.port,
        staged: job.steps
          .filter((s) => s.state === 'done')
          .flatMap((s) => s.records),
      })
      step.records = out.records
      step.outputs = out.outputs
      step.error = null
      this.setStep(step, 'done')
      return 'done'
    } catch (e) {
      // A failed save is a crash, not a failed step: the next start resumes.
      if (typeof e === 'object' && e && this.saveErrors.has(e)) throw e
      if (signal.aborted) return 'cancelled'
      const err =
        e instanceof StepError
          ? e
          : new StepError(
              'server',
              'Something went wrong while preparing this step.',
            )
      if (err.kind === 'too_many') {
        this.setStep(step, 'failed')
        step.error = err.message
        return 'too_many'
      }
      return this.fail(step, def, err)
    }
  }

  /** AF-8: optional steps are skipped; the others pause the job. */
  private fail(step: JobStep, def: PlanStepDef, err: StepError): Verdict {
    step.error = err.message
    if (def.optional) {
      this.setStep(step, 'skipped')
      return 'done'
    }
    this.setStep(step, 'failed')
    return 'paused'
  }

  /** AF-7: retry outside failures with backoff; one repair round for bad content. */
  private async fillWithRetry(
    job: AiJob,
    step: JobStep,
    tool: AiToolDef,
    resolved: Rec,
    signal: AbortSignal,
  ): Promise<Rec> {
    let repair: string[] | undefined
    for (;;) {
      let answer: unknown
      try {
        answer = await this.callFiller(step, tool, resolved, repair, signal)
      } catch (e) {
        if (signal.aborted) throw e
        const err =
          e instanceof StepError
            ? e
            : new StepError('network', 'The connection failed.')
        if (!RETRYABLE.has(err.kind) || step.retries >= tool.limits.maxRetries)
          throw err
        const base = BACKOFF_MS[Math.min(step.retries, BACKOFF_MS.length - 1)]
        const wait =
          err.retryAfterMs ?? base + Math.floor(this.random() * base * 0.25)
        step.retries++
        await this.save(job)
        await this.clock.sleep(wait, signal)
        continue
      }
      const parsed = parseAnswer(answer)
      const problems = parsed.ok
        ? this.problems(tool, { ...resolved, ...parsed.value })
        : [parsed.error]
      if (parsed.ok && !problems.length) return parsed.value
      if (repair)
        throw new StepError(
          'bad_content',
          'The content did not fit this step, even after a second try.',
        )
      repair = problems
    }
  }

  private async callFiller(
    step: JobStep,
    tool: AiToolDef,
    args: Rec,
    repair: string[] | undefined,
    signal: AbortSignal,
  ) {
    const ctl = new AbortController()
    const onAbort = () => ctl.abort()
    signal.addEventListener('abort', onAbort)
    const timer = setTimeout(
      () => ctl.abort(),
      this.fillTimeoutMs ?? tool.limits.timeoutMs,
    )
    try {
      const timeout = new Promise<never>((_, reject) =>
        ctl.signal.addEventListener('abort', () =>
          reject(
            signal.aborted
              ? new Error('aborted')
              : new StepError('timeout', 'The step took too long.'),
          ),
        ),
      )
      return await Promise.race([
        this.filler.fill({ stepId: step.id, tool, args, repair }, ctl.signal),
        timeout,
      ])
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }
  }

  private problems(tool: AiToolDef, args: Rec): string[] {
    return validatePlan(
      {
        version: 1,
        id: 'check',
        goal: 'check',
        origin: 'app',
        destination: { kind: 'library' },
        steps: [{ id: 's1', tool: tool.id, toolVersion: tool.version, args }],
      },
      this.catalog,
    ).map(
      (e) => `${e.path.replace(/^\/steps\/0\/args/, '') || '/'}: ${e.message}`,
    )
  }

  private resolve(job: AiJob, args: Rec): Rec {
    const walk = (v: unknown): unknown => {
      if (isRef(v)) {
        const m = FROM.exec(v.$from)
        const from = m && job.steps.find((s) => s.id === m[1])
        const val =
          from && from.state === 'done' ? from.outputs?.[m[2]] : undefined
        if (val === undefined)
          throw new StepError(
            'validation',
            'An earlier step gave no result for this one.',
          )
        return val
      }
      if (Array.isArray(v)) return v.map(walk)
      if (v && typeof v === 'object')
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, walk(x)]),
        )
      return v
    }
    return walk(args) as Rec
  }

  // ---- restage / recovery ----

  /** Preview again after a page changed: every step is staged again from fresh reads. */
  private resetForRestage(job: AiJob) {
    this.go(job, 'running')
    job.notice = null
    job.changeSet = null
    job.undo = null
    job.timings.startedAt = this.clock.now()
    for (const s of job.steps)
      if (s.state === 'done') {
        this.setStep(s, 'waiting')
        s.records = []
        s.outputs = null
      }
  }

  /** AF-9. Records exist -> applied. Otherwise back to preview. */
  private settleApplying(id: string) {
    return this.exclusive(async () => {
      const job = await this.need(id)
      if (job.state !== 'applying') return
      if (job.undo && (await this.port.isApplied(job.id, job.undo))) {
        this.go(job, 'applied')
        job.timings.appliedAt = this.clock.now()
        job.notice = null
      } else {
        this.go(job, 'preview')
        job.undo = null
        job.notice = 'Saving was interrupted. Nothing was written.'
      }
      await this.save(job)
    })
  }

  private async markQueued(id: string) {
    const job = await this.store.get(id)
    if (job?.state === 'validated') {
      this.go(job, 'queued')
      await this.save(job)
    }
  }

  // ---- small things ----

  private blockedByDeps(job: AiJob, def: PlanStepDef): boolean {
    const deps = new Set(def.dependsOn ?? [])
    refsOf(def.args, deps)
    return [...deps].some((d) => {
      const s = job.steps.find((x) => x.id === d)
      return (
        !!s &&
        (s.state === 'skipped' || s.state === 'blocked' || s.state === 'failed')
      )
    })
  }

  private blockDependents(job: AiJob) {
    for (let changed = true; changed;) {
      changed = false
      for (const step of job.steps) {
        const def = job.plan.steps.find((s) => s.id === step.id)
        if (step.state === 'waiting' && def && this.blockedByDeps(job, def)) {
          this.setStep(step, 'blocked')
          changed = true
        }
      }
    }
  }

  private step(job: AiJob, id: string): JobStep {
    const s = job.steps.find((x) => x.id === id)
    if (!s) throw new Error('No such step.')
    return s
  }

  private stateOf(step: JobStep): StepState {
    return step.state
  }

  private setStep(step: JobStep, to: StepState) {
    if (step.state === to) return
    assertStepTransition(step.state, to)
    step.state = to
  }

  private go(job: AiJob, to: JobState) {
    assertTransition(job.state, to)
    job.state = to
  }

  private async need(id: string): Promise<AiJob> {
    const job = await this.store.get(id)
    if (!job) throw new Error('No such job.')
    return job
  }

  private async save(job: AiJob) {
    job.timings.updatedAt = this.clock.now()
    try {
      await this.store.put(job)
    } catch (e) {
      if (typeof e === 'object' && e) this.saveErrors.add(e)
      throw e
    }
  }

  /** One job at a time on this device. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    this.busy++
    const result = this.tail.then(fn, fn)
    this.tail = result
      .catch(() => undefined)
      .finally(() => {
        this.busy--
      })
    return result
  }
}
