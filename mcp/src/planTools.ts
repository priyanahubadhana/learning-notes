import {
  ConnectorEngine,
  PolicyError,
  type ConnectorHost,
  type RunMode,
  type Staged,
} from '../../src/aitools/connector/engine'
import {
  inboxJobId,
  makeInboxJobItem,
  type InboxJobReason,
} from '../../src/aitools/connector/inboxJob'
import {
  RateLimiter,
  RateLimitError,
  writeCost,
} from '../../src/aitools/connector/rate'
import type { JobStore } from '../../src/aitools/jobs/jobStore'
import { MemoryJobStore } from '../../src/aitools/jobs/jobStore'
import type {
  AiJob,
  JobPlan,
  Rec,
  StagedRecord,
  UndoRecord,
} from '../../src/aitools/jobs/jobTypes'
import type { NotesPort } from '../../src/aitools/jobs/notesPort'
import {
  appliedIn,
  redoAll,
  revOf,
  same,
  undoAll,
  writeAll,
  type Tx,
} from '../../src/aitools/jobs/notesTx'
import type { Page } from './model'
import { ToolError } from './tools'
import type { Saver, WriteDeps } from './writeTools'

/**
 * The plan tools (AI framework slice 3): list_tools, describe_tool,
 * plan_preview, run_plan, job_status, undo_job. They use the same shared
 * checker, stage functions and executor as the app, so a plan gives the same
 * records here as in the app. Reads stop at what "Allow AI" shows; locks,
 * scopes and the rate limit are checked before anything is saved.
 */

interface Out {
  table: string
  id: string
  value: Record<string, unknown>
  baseRev: number
  after?: string
}

const DEVICE_LABEL = 'Claude (PC)'

/** Mind maps and databases are not available on the local connector yet. */
function richProblem(v: unknown, found: Set<string>): void {
  if (Array.isArray(v)) v.forEach((x) => richProblem(x, found))
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (o.type === 'mindMap' || o.type === 'database')
      found.add(`${String(o.type)} blocks`)
    if (Array.isArray(o.databases) && o.databases.length) found.add('databases')
    for (const x of Object.values(o)) richProblem(x, found)
  }
}

export function planFailure(r: Exclude<Staged, { ok: true }>): string {
  if (r.kind === 'invalid')
    return `The plan is not valid. Nothing was changed.\n${r.errors
      .slice(0, 20)
      .map((e) => `${e.path}: ${e.message}`)
      .join('\n')}`
  const steps = r.steps.map((s) => `${s.id} (${s.tool}): ${s.error}`)
  return `${r.message} Nothing was changed.${steps.length ? `\n${steps.join('\n')}` : ''}`
}

export function makePlanTools(
  d: WriteDeps,
  saver: Saver,
  jobStore: JobStore = new MemoryJobStore(),
) {
  const { now, serial, seal, push, afterSave } = saver
  const limiter = new RateLimiter(now)

  // ---- reading through "Allow AI" ----

  const visible = (table: string, v: Record<string, unknown>): boolean => {
    const id = String(v.id)
    if (table === 'notebooks') return !!d.cache.readableNotebook(id)
    if (table === 'pages') return !!d.cache.pageIfReadable(id)
    if (table === 'blocks' || table === 'cards')
      return !!d.cache.pageIfReadable(String(v.pageId))
    return false
  }

  const bufferTx = (outs: Map<string, Out>, at: number): Tx => ({
    get: async (table, id) =>
      outs.get(`${table}/${id}`)?.value ?? d.cache.rawRecord(table, id)?.value,
    put: async (table, value) => {
      const id = String(value.id)
      const key = `${table}/${id}`
      const raw = d.cache.rawRecord(table, id)
      const prior = outs.get(key)
      outs.set(key, {
        table,
        id,
        value: { ...value, updatedAt: value.updatedAt ?? at },
        baseRev: prior ? prior.baseRev : (raw?.rev ?? 0),
        after: prior ? prior.after : raw?.h,
      })
    },
  })

  /** Writes buffered changes in one sealed save. */
  const save = async (fn: (tx: Tx) => Promise<void>) => {
    const at = now()
    const outs = new Map<string, Out>()
    await fn(bufferTx(outs, at))
    await push(await seal([...outs.values()], at))
  }

  const port: NotesPort = {
    read: async (table, id) => {
      const raw = d.cache.rawRecord(table, id)
      return raw && visible(table, raw.value)
        ? structuredClone(raw.value)
        : undefined
    },
    readRev: async (table, id) => revOf(d.cache.rawRecord(table, id)?.value),
    // Order keys need every row (hidden and removed too); content is read with `read`.
    list: async (table, where) =>
      d.cache
        .rawRecords(table)
        .filter((v) => Object.entries(where).every(([k, x]) => v[k] === x))
        .map((v) => structuredClone(v)),
    commit: async (_id, records) => {
      await save((tx) => writeAll(tx, records))
    },
    isApplied: async (_id, undo) =>
      appliedIn(
        {
          get: async (t, i) => d.cache.rawRecord(t, i)?.value,
          put: async () => undefined,
        },
        undo,
      ),
    undo: async (_id, undo) => {
      await save((tx) => undoAll(tx, undo, now()))
    },
    redo: async (_id, records, undo) => {
      await save((tx) => redoAll(tx, records, undo, now()))
    },
  }

  // ---- what Claude may change ----

  const writableNotebook = (id: string) => {
    const nb = d.cache.readableNotebook(id)
    if (!nb)
      throw new PolicyError('No such notebook (or Claude may not use it).')
    if (nb.editLocked)
      throw new PolicyError('That notebook is locked against edits in the app.')
    if (nb.locked && !nb.allowAiLocked)
      throw new PolicyError(
        'That notebook is locked, so Claude may not use it.',
      )
  }

  const host: ConnectorHost = {
    port,
    store: jobStore,
    connection: d.deviceId,
    now,
    workspaceId: () => {
      const id = d.cache.workspaceId()
      if (!id)
        throw new PolicyError(
          'Open Learning Notes once so your notes have synced, then try again.',
        )
      return id
    },
    refresh: () => d.cache.refresh(true),
    precheck: (plan: JobPlan) => {
      if (!d.scopes['write:create'] && !d.scopes['write:append'])
        throw new PolicyError(
          'Claude is not allowed to do this: writing is switched off in ~/.learning-notes-mcp/config.json.',
        )
      const found = new Set<string>()
      for (const s of Array.isArray(plan.steps) ? plan.steps : []) {
        if (s?.tool === 'databases.create') found.add('databases')
        richProblem(s?.args, found)
      }
      if (found.size)
        throw new PolicyError(
          `This plan asks for things the local connector cannot make yet: ${[...found].join('; ')}. Nothing was changed. Remove them and try again.`,
        )
    },
    check: (changes) => {
      const made = new Set(
        changes.records
          .filter((r) => r.table === 'notebooks' && !r.baseRev)
          .map((r) => r.id),
      )
      let creates = false
      let edits = false
      const seen = new Set<string>()
      for (const r of changes.records) {
        if (r.baseRev) edits = true
        else creates = true
        let nb: string | undefined
        if (r.table === 'notebooks') nb = r.id
        else if (typeof r.value.notebookId === 'string') nb = r.value.notebookId
        else if (typeof r.value.pageId === 'string')
          nb = d.cache.rawPage(r.value.pageId)?.value.notebookId
        if (nb && !made.has(nb) && !seen.has(nb)) {
          writableNotebook(nb)
          seen.add(nb)
        }
        if (r.baseRev && (r.table === 'pages' || r.table === 'blocks')) {
          const pid = r.table === 'pages' ? r.id : String(r.value.pageId)
          const page = d.cache.rawPage(pid)?.value as Page | undefined
          if (page && d.cache.editLocked(page))
            throw new PolicyError(
              'That page is locked against edits in the app.',
            )
        }
      }
      const off = (s: 'write:create' | 'write:append') => !d.scopes[s]
      if (creates && off('write:create'))
        throw new PolicyError(
          'Claude is not allowed to do this: "write:create" is switched off in ~/.learning-notes-mcp/config.json.',
        )
      if (edits && off('write:append'))
        throw new PolicyError(
          'Claude is not allowed to do this: "write:append" is switched off in ~/.learning-notes-mcp/config.json.',
        )
    },
    // A notebook Claude made is one Claude may keep working in.
    shape: (r: StagedRecord) =>
      r.table === 'notebooks' && !r.baseRev
        ? { ...r, value: { ...r.value, allowAi: true } }
        : r,
    commit: async (records: readonly StagedRecord[], undo: UndoRecord) => {
      void undo
      await save((tx) => writeAll(tx, records))
    },
    toInbox: async (
      job: AiJob,
      request: 'apply' | 'undo',
      reasons: InboxJobReason[],
    ) => {
      const at = now()
      const item = makeInboxJobItem(job, request, reasons, DEVICE_LABEL, at)
      const [sealed] = await seal(
        [
          {
            table: 'claudeInbox',
            id: item.id,
            value: item,
            baseRev: d.cache.inboxRev(item.id),
          },
        ],
        at,
      )
      const res = await d.source.push([sealed])
      if (res.conflicts.length > 0)
        throw new PolicyError(
          'Something changed on the server while saving. Nothing was changed. Try again.',
        )
      await d.cache.refresh(true).catch(() => undefined)
    },
    inboxStatus: (jobId, request) => {
      const item = d.cache.inboxItem(inboxJobId(jobId, request))
      if (!item || item.deletedAt) return null
      const s = item.status
      return s === 'pending' || s === 'accepted' || s === 'rejected' ? s : null
    },
    touched: (job: AiJob) => {
      const undo = job.undo
      if (!undo) return false
      const made = new Set(undo.created.map((c) => c.id))
      const pages = new Set(
        undo.created.filter((c) => c.table === 'pages').map((c) => c.id),
      )
      const books = new Set(
        undo.created.filter((c) => c.table === 'notebooks').map((c) => c.id),
      )
      for (const c of undo.created) {
        const raw = d.cache.rawRecord(c.table, c.id)
        if (raw && raw.rev > 1) return true
      }
      for (const b of d.cache.rawRecords('blocks'))
        if (
          pages.has(String(b.pageId)) &&
          !b.deletedAt &&
          !made.has(String(b.id))
        )
          return true
      for (const p of d.cache.rawRecords('pages'))
        if (
          books.has(String(p.notebookId)) &&
          !p.deletedAt &&
          !made.has(String(p.id))
        )
          return true
      for (const e of undo.edited) {
        const raw = d.cache.rawRecord(e.table, e.id)
        if (!raw) continue
        for (const k of Object.keys(e.after))
          if (k !== 'updatedAt' && !same(raw.value[k], e.after[k])) return true
      }
      return false
    },
  }

  const engine = new ConnectorEngine(host)

  const refuse = <T>(fn: () => T): T => {
    try {
      return fn()
    } catch (e) {
      if (e instanceof RateLimitError) throw new ToolError(e.message)
      throw e
    }
  }
  const plain = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (e) {
      if (e instanceof PolicyError || e instanceof RateLimitError)
        throw new ToolError(e.message)
      throw e
    }
  }

  const canRead = () => {
    if (!d.scopes.read)
      throw new ToolError(
        'Claude is not allowed to do this: "read" is switched off in ~/.learning-notes-mcp/config.json.',
      )
  }
  const canWrite = () => {
    if (!d.scopes['write:create'] && !d.scopes['write:append'])
      throw new ToolError(
        'Claude is not allowed to do this: writing is switched off in ~/.learning-notes-mcp/config.json.',
      )
  }

  /** The ids worth an audit line (never content). */
  const auditIds = (job: AiJob) => [
    job.id,
    ...(job.undo?.created ?? [])
      .filter((c) => c.table === 'notebooks' || c.table === 'pages')
      .map((c) => c.id)
      .slice(0, 50),
  ]

  return {
    /** Used by the server to decide which tools to offer. */
    engine,

    list_tools: async (a: { group?: string; query?: string }) => {
      canRead()
      refuse(() => limiter.read())
      return engine.listTools(a)
    },

    describe_tool: async (a: { id: string }) => {
      canRead()
      refuse(() => limiter.read())
      return plain(async () => engine.describeTool(a.id))
    },

    plan_preview: async (a: { plan: unknown }) => {
      canRead()
      refuse(() => limiter.read())
      return plain(async () => {
        const r = await engine.preview(a.plan)
        if (!r.ok) throw new ToolError(planFailure(r))
        return { ok: true, writes: false, ...r.summary }
      })
    },

    run_plan: (a: { plan: unknown; mode?: RunMode }) =>
      serial(async () => {
        canWrite()
        refuse(() =>
          limiter.write(writeCost((a.plan ?? {}) as Pick<JobPlan, 'steps'>)),
        )
        return plain(async () => {
          const r = await engine.run(a.plan, a.mode ?? 'auto')
          if ('kind' in r) throw new ToolError(planFailure(r))
          if (r.status !== 'applied' || r.repeated) return r
          const job = await jobStore.get(r.jobId)
          const note = await afterSave(
            'run_plan',
            job ? auditIds(job) : [r.jobId],
            r.counts,
          )
          return { ...r, ...note }
        })
      }),

    job_status: async (a: { jobId: string }) => {
      canRead()
      refuse(() => limiter.read())
      return plain(() => engine.status(a.jobId))
    },

    undo_job: (a: { jobId: string }) =>
      serial(async () => {
        canWrite()
        refuse(() => limiter.write(1))
        return plain(async () => {
          const r = await engine.undo(a.jobId)
          if (r.status !== 'undone' || r.repeated) return r
          const job = await jobStore.get(a.jobId)
          const note = await afterSave(
            'undo_job',
            job ? auditIds(job) : [a.jobId],
            job?.changeSet?.counts ?? {},
          )
          return { ...r, ...note }
        })
      }),

    /**
     * The existing write tools run as small plans. The caller has already
     * checked its input; when the registry would refuse the content (its
     * shapes are stricter than the older checker) this returns `null` and the
     * caller carries on with its own code, unchanged.
     */
    viaPlan: async (
      goal: string,
      destination: JobPlan['destination'],
      steps: {
        tool: string
        args: Rec
      }[],
      newId: () => string,
    ): Promise<{ job: AiJob; engine: ConnectorEngine } | null> => {
      const plan = {
        version: 1,
        id: newId(),
        goal: goal.slice(0, 2000),
        origin: 'mcp',
        destination,
        steps: steps.map((s, i) => ({
          id: `s${i + 1}`,
          tool: s.tool,
          toolVersion: 1,
          args: s.args,
        })),
      }
      refuse(() => limiter.write(writeCost(plan)))
      return plain(async () => {
        const r = await engine.stage(plan)
        if (!r.ok) {
          if (r.kind === 'invalid') return null
          throw new ToolError(planFailure(r))
        }
        return { job: r.job, engine }
      })
    },

    /** Marks a staged job saved (its records were saved by the caller) or drops it. */
    finish: async (jobId: string, saved: boolean) => {
      if (saved) await engine.commit(jobId, async () => undefined)
      else await engine.discard(jobId)
    },

    /** Saves a staged job in one go (create_notebook, add_page). */
    commitJob: async (jobId: string) => plain(() => engine.commit(jobId)),
  }
}

export type PlanTools = ReturnType<typeof makePlanTools>
