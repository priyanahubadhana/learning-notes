import {
  closeHistory,
  redo as pmRedo,
  undo as pmUndo,
  undoDepth,
} from 'prosemirror-history'
import type { EditorView } from 'prosemirror-view'
import { getAppActions } from '../app/tools/toolRuntime'
import { db } from '../core/db'
import { restoreMany, softDeleteMany } from '../core/records'
import type { MetaValue } from '../core/types'
import { t } from '../i18n/t'
import { installRowCapture, setOpenPage, setRowSink } from '../core/rowCapture'
import type { RowChange } from '../core/rowTypes'
import {
  historyState,
  isQuiet,
  quietAsync,
  reloadPage,
  type StepInput,
} from '../core/historySteps'
import { restoreVersion } from './versionService'

/**
 * The journal behind core/historySteps.ts: one ordered list of steps per page (scope).
 * Text editors (one per box) and the ink keep their fine-grained history
 * themselves; the journal holds a marker for each of their steps, in the
 * order things happened, so Undo walks back across boxes, ink, layout, tags
 * and the rest as one list. Steps with `data` (database rows, restores) are
 * saved per page and survive a reload; steps with closures last the session.
 */

/** Most steps kept per page. */
export const LIMIT = 200
/** Typing pause and merge window (ms). */
export const PAUSE_MS = 800

export interface Step {
  id: number
  scope: string
  kind: string
  label: string
  at: number
  gid?: number
  merge?: string
  data?: unknown
  undo?: () => unknown
  redo?: () => unknown
  owner?: unknown
  /** A group: these run (newest first when undoing) instead of the step itself. */
  subs?: Step[]
}

interface Journal {
  done: Step[]
  undone: Step[]
  loaded: Promise<void> | null
}

export interface KindHandler {
  undo: (data: unknown) => unknown
  redo: (data: unknown) => unknown
  /** Joins two writes of the same thing (typing a title): returns the data. */
  join?: (old: unknown, next: unknown) => unknown
}

const kinds = new Map<string, KindHandler>()
export const registerKind = (kind: string, h: KindHandler): void => {
  kinds.set(kind, h)
}

const journals = new Map<string, Journal>()
let active: string | null = null
let seq = 0

function journal(scope: string): Journal {
  let j = journals.get(scope)
  if (!j) {
    j = { done: [], undone: [], loaded: null }
    journals.set(scope, j)
    j.loaded = loadSaved(scope, j)
  }
  return j
}

/** For tests and the debug hook. */
export const journalOf = (scope: string): { done: Step[]; undone: Step[] } =>
  journal(scope)
export const activeScope = (): string | null => active
/** Waits until the saved steps of a scope are read. */
export const ready = (scope: string): Promise<void> =>
  journal(scope).loaded ?? Promise.resolve()

setOpenPage(() => active)
installRowCapture(db)

function publish(): void {
  const j = active ? journals.get(active) : undefined
  const next = {
    canUndo: !!j && j.done.length > 0,
    canRedo: !!j && j.undone.length > 0,
  }
  const old = historyState.get()
  if (old.canUndo !== next.canUndo || old.canRedo !== next.canRedo)
    historyState.set(next)
}

export function setActive(scope: string | null): void {
  active = scope
  if (scope) journal(scope)
  publish()
}

// ---- Saving over a reload ----

const metaId = (scope: string) => `hist:${scope}`
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const saved = (s: Step): boolean =>
  (s.kind === 'pm' ? pmReady(s.data) : s.data !== undefined) ||
  (!!s.subs && s.subs.every(saved))

/** A text step is kept over a reload only with both sides of the box (see attachEditor). */
const pmReady = (d: unknown): boolean =>
  !!d && !!(d as PmData).before && !!(d as PmData).after

/** Most characters of saved steps kept per page (the newest ones win). */
const SAVE_BUDGET = 1_500_000
/** Biggest box (ProseMirror size) whose text steps are saved. */
const PM_SAVE_MAX = 30_000

function persistSoon(scope: string): void {
  if (timers.has(scope)) return
  timers.set(
    scope,
    setTimeout(() => {
      timers.delete(scope)
      void persistNow(scope)
    }, 600),
  )
}

export async function persistNow(scope: string): Promise<void> {
  const j = journals.get(scope)
  if (!j) return
  for (const e of editors) e.sync()
  const strip = (s: Step): Step => ({
    id: s.id,
    scope: s.scope,
    kind: s.kind,
    label: s.label,
    at: s.at,
    gid: s.gid,
    data: s.data,
    subs: s.subs?.map(strip),
  })
  // Newest first, until the budget is used: a long session never grows the row without end.
  let used = 0
  const within = (list: Step[]): Step[] => {
    const kept: Step[] = []
    for (const s of [...list].reverse()) {
      const size = JSON.stringify(strip(s)).length
      if (used + size > SAVE_BUDGET) break
      used += size
      kept.unshift(s)
    }
    return kept
  }
  const undone = within(j.undone.filter(saved))
  const done = within(j.done.filter(saved).slice(-LIMIT))
  const row: MetaValue = {
    id: metaId(scope),
    value: JSON.parse(
      JSON.stringify({ done: done.map(strip), undone: undone.map(strip) }),
    ),
  }
  try {
    await db.meta.put(row)
  } catch {
    // A full disk must not break editing; the session list is still there.
  }
}

async function loadSaved(scope: string, j: Journal): Promise<void> {
  try {
    const row = await db.meta.get(metaId(scope))
    const v = row?.value as { done?: Step[]; undone?: Step[] } | undefined
    if (!v) return
    const fix = (s: Step): Step => ({ ...s, id: ++seq, scope })
    // Steps made while loading came later: they stay on top.
    j.done = [...(v.done ?? []).map(fix), ...j.done]
    if (j.undone.length === 0) j.undone = (v.undone ?? []).map(fix)
    if (scope === active) publish()
  } catch {
    // No saved list: start empty.
  }
}

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    for (const [scope, timer] of [...timers]) {
      clearTimeout(timer)
      timers.delete(scope)
      void persistNow(scope)
    }
  })

// ---- Pushing steps ----

interface EditorHandle {
  view: () => EditorView | undefined
  /** Writes the box's text as it is now into its newest step. */
  sync: () => void
  /** The typing group ended: its step is final. */
  close: () => void
}
const editors = new Set<EditorHandle>()
/** The editor of each box, to apply a text step read back after a reload. */
const boxEditors = new Map<string, EditorHandle>()

/** What a saved text step holds: the box's text before and after (ProseMirror JSON). */
interface PmData {
  box: string
  before: unknown
  after: unknown
}

/** Ends every box's typing group, so the next typing is a new step. */
function closeAll(): void {
  for (const e of editors) {
    const v = e.view()
    if (v) v.dispatch(closeHistory(v.state.tr))
    e.close()
  }
}

let chainNext = false

export function push(
  input: StepInput,
  g: { id: number; label: string } | null,
): void {
  const scope = input.scope ?? active
  if (!scope) return
  const j = journal(scope)
  const now = Date.now()
  if (input.kind !== 'pm') closeAll()
  const step: Step = {
    id: ++seq,
    scope,
    kind: input.kind,
    label: input.label,
    at: now,
    gid: g?.id,
    merge: input.merge,
    data: input.data,
    undo: input.undo,
    redo: input.redo,
    owner: input.owner,
  }
  j.undone = []
  const top = j.done[j.done.length - 1]
  if (top && chainNext && input.kind === 'pm') {
    chainNext = false
    join(top, step)
  } else if (top && g && top.gid === g.id) {
    join(top, step)
  } else if (
    top &&
    step.merge &&
    top.merge === step.merge &&
    !g &&
    now - top.at < PAUSE_MS
  ) {
    top.at = now
    top.redo = step.redo
    const h = kinds.get(top.kind)
    if (h?.join) top.data = h.join(top.data, step.data)
    else if (step.data !== undefined) top.data = step.data
  } else {
    j.done.push(step)
    if (j.done.length > LIMIT) j.done.shift()
  }
  finish(scope)
}

/** Makes `next` part of `top` (one Undo for both). */
function join(top: Step, next: Step): void {
  top.subs ??= [{ ...top, subs: undefined }]
  top.subs.push(next)
  top.at = next.at
  top.data = undefined
  top.undo = undefined
  top.redo = undefined
  top.owner = undefined
  top.kind = 'group'
}

function finish(scope: string): void {
  if (scope === active) publish()
  persistSoon(scope)
}

export function endGroup(gid: number): void {
  void gid
}

/** A group whose action failed: take back what it did. */
export function rollbackGroup(gid: number): void {
  if (!gid || !active) return
  const j = journal(active)
  const top = j.done[j.done.length - 1]
  if (top?.gid !== gid) return
  j.done.pop()
  void quietAsync(() => runStep(top, 'undo')).catch(() => undefined)
  finish(active)
}

export function dropLast(kind: string): void {
  if (!active) return
  const j = journal(active)
  if (j.done[j.done.length - 1]?.kind === kind) {
    j.done.pop()
    finish(active)
  }
}

/** The newest two steps (ink, then text) become one. */
export function chainLast(): void {
  if (!active) return
  const j = journal(active)
  const [a, b] = j.done.slice(-2)
  if (a && b && b.kind === 'pm') {
    j.done.pop()
    join(a, b)
    finish(active)
  } else chainNext = true
}

/** Forgets the steps whose closures belong to something that went away. */
export function release(owner: unknown): void {
  // A step with saved data stays (it needs no closure); the rest go.
  const bare = (s: Step): Step => ({
    ...s,
    undo: undefined,
    redo: undefined,
    owner: undefined,
    subs: s.subs?.map(bare),
  })
  const mine = (s: Step): boolean => s.owner === owner || !!s.subs?.some(mine)
  const keep = (s: Step): Step[] => (!mine(s) ? [s] : saved(s) ? [bare(s)] : [])
  for (const [scope, j] of journals) {
    j.done = j.done.flatMap(keep)
    j.undone = j.undone.flatMap(keep)
    if (scope === active) publish()
  }
}

// ---- Text editors (one per box) ----

interface EditorLike {
  prosemirrorView?: EditorView
  onChange: (cb: () => void) => (() => void) | void
}

export function attachEditor(editor: EditorLike, boxId: string): () => void {
  const view = () => editor.prosemirrorView
  let last = view() ? undoDepth(view()!.state) : 0
  // The box's text before the latest change, and the step of the typing group still going.
  let shadow = view()?.state.doc
  let open: PmData | null = null
  const handle: EditorHandle = {
    view,
    sync: () => {
      const v = view()
      if (!open || !v) return
      open.after =
        v.state.doc.content.size <= PM_SAVE_MAX ? v.state.doc.toJSON() : null
    },
    close: () => {
      handle.sync()
      open = null
    },
  }
  editors.add(handle)
  boxEditors.set(boxId, handle)
  const run = (dir: 'undo' | 'redo') => (): boolean => {
    const v = view()
    if (!v) return false
    const done = (dir === 'undo' ? pmUndo : pmRedo)(v.state, v.dispatch, v)
    last = undoDepth(v.state)
    return done
  }
  const off = editor.onChange(() => {
    const v = view()
    if (!v) return
    const d = undoDepth(v.state)
    const was = last
    last = d
    const before = shadow
    shadow = v.state.doc
    if (d < was || isQuiet()) return
    const top = active ? journals.get(active)?.done.at(-1) : undefined
    if (d === was) {
      // The same typing group went on: keep its time fresh.
      if (top && top.owner === editor) top.at = Date.now()
      return
    }
    handle.close()
    const data: PmData = {
      box: boxId,
      before:
        before && before.content.size <= PM_SAVE_MAX ? before.toJSON() : null,
      after: null,
    }
    open = data.before ? data : null
    push(
      {
        kind: 'pm',
        label: t('history.typing'),
        undo: run('undo'),
        redo: run('redo'),
        owner: editor,
        data,
      },
      null,
    )
  })
  return () => {
    handle.close()
    editors.delete(handle)
    if (boxEditors.get(boxId) === handle) boxEditors.delete(boxId)
    if (typeof off === 'function') off()
    release(editor)
  }
}

/** Sets a box's text to a saved copy (a text step read back after a reload). */
function setBoxText(box: string, json: unknown): boolean {
  const v = boxEditors.get(box)?.view()
  if (!v || !json) throw new Error(t('history.why.gone'))
  const node = v.state.schema.nodeFromJSON(json)
  v.dispatch(
    v.state.tr
      .replaceWith(0, v.state.doc.content.size, node.content)
      .setMeta('addToHistory', false),
  )
  return true
}
registerKind('pm', {
  undo: (d) => setBoxText((d as PmData).box, (d as PmData).before),
  redo: (d) => setBoxText((d as PmData).box, (d as PmData).after),
})

// ---- Undo and Redo ----

let tail: Promise<unknown> = Promise.resolve()

function enqueue(dir: 'undo' | 'redo'): Promise<boolean> {
  const next = tail.then(() => doStep(dir))
  tail = next.catch(() => false)
  return next
}

export async function undoSince(since: number): Promise<boolean> {
  await tail
  const j = active ? journals.get(active) : undefined
  const top = j?.done[j.done.length - 1]
  if (!top || top.at < since) return false
  return undo()
}

export const undo = (): Promise<boolean> => enqueue('undo')
export const redo = (): Promise<boolean> => enqueue('redo')

function toast(message: string): void {
  getAppActions()?.toast(message)
}

async function doStep(dir: 'undo' | 'redo'): Promise<boolean> {
  if (!active) {
    toast(t('history.noPage'))
    return false
  }
  const scope = active
  const j = journal(scope)
  await j.loaded
  const from = dir === 'undo' ? j.done : j.undone
  const to = dir === 'undo' ? j.undone : j.done
  while (from.length > 0) {
    const s = from[from.length - 1]
    let ok: boolean
    try {
      ok = await quietAsync(() => runStep(s, dir))
    } catch (e) {
      from.pop()
      const why =
        e instanceof Error && e.message ? e.message : t('history.why.gone')
      toast(
        t(dir === 'undo' ? 'history.cantUndo' : 'history.cantRedo', {
          what: s.label,
          why,
        }),
      )
      finish(scope)
      return false
    }
    from.pop()
    if (ok) {
      to.push(s)
      if (to.length > LIMIT) to.shift()
      finish(scope)
      return true
    }
  }
  finish(scope)
  toast(t(dir === 'undo' ? 'history.nothingUndo' : 'history.nothingRedo'))
  return false
}

/** Runs one step in one direction; false: nothing could be done. */
export async function runStep(s: Step, dir: 'undo' | 'redo'): Promise<boolean> {
  if (s.subs) {
    const list = dir === 'undo' ? [...s.subs].reverse() : s.subs
    let any = false
    for (const sub of list) any = (await runStep(sub, dir)) || any
    return any
  }
  const fn = dir === 'undo' ? s.undo : s.redo
  if (fn) return (await fn()) !== false
  const h = kinds.get(s.kind)
  if (!h) throw new Error(t('history.why.unknown'))
  return (await (dir === 'undo' ? h.undo : h.redo)(s.data)) !== false
}

// ---- Database rows (core/rowCapture.ts) ----

const rowsSig = (rows: RowChange[]) =>
  rows
    .map(
      (r) =>
        `${r.t}:${r.id}:${r.k}:${[
          ...Object.keys(r.a?.set ?? {}),
          ...(r.a?.del ?? []),
        ]
          .sort()
          .join(',')}`,
    )
    .join('|')

const undef = (del: string[]) =>
  Object.fromEntries(del.map((k) => [k, undefined]))

async function applyRows(
  rows: RowChange[],
  dir: 'undo' | 'redo',
): Promise<boolean> {
  const tables = [...new Set([...rows.map((r) => r.t), 'blocks'])]
  await db.transaction('rw', tables, async () => {
    const list = dir === 'undo' ? [...rows].reverse() : rows
    for (const c of list) {
      const tb = db.table(c.t)
      if (c.k === 'u') {
        const f = (dir === 'undo' ? c.b : c.a)!
        const cur = (await tb.get(c.id)) as Record<string, unknown> | undefined
        if (!cur) throw new Error(t('history.why.gone'))
        if (c.t === 'pages') await followBoxes(c, cur, f)
        await tb.update(c.id, {
          ...f.set,
          ...undef(f.del),
          updatedAt: Date.now(),
        })
      } else if ((c.k === 'c') === (dir === 'undo')) {
        // A new row is taken away again, or a deleted row deleted again.
        if (c.k === 'c' && c.row && 'deletedAt' in c.row)
          await tb.update(c.id, { deletedAt: Date.now() })
        else await tb.delete(c.id)
      } else if (c.row) {
        await tb.put({ ...c.row, ...(c.k === 'c' ? { deletedAt: null } : {}) })
      }
    }
  })
  return true
}

/**
 * A box that goes away (a new box taken back) takes the lines in it along,
 * and they come back with it: the editor saves a box's lines on its own, so
 * no step of the page holds them. The ids are kept in the step.
 */
async function followBoxes(
  c: RowChange,
  cur: Record<string, unknown>,
  f: { set: Record<string, unknown>; del: string[] },
): Promise<void> {
  if (!('boxes' in f.set) && !f.del.includes('boxes')) return
  const ids = (v: unknown) =>
    ((v as { id: string }[] | undefined) ?? []).map((b) => b.id)
  const now = new Set(ids(cur.boxes))
  const next = new Set(ids(f.set.boxes))
  const gone = [...now].filter((id) => !next.has(id))
  const back = [...next].filter((id) => !now.has(id))
  const hidden = ((c as { hid?: string[] }).hid ??= [])
  if (gone.length > 0) {
    const live = await db.blocks
      .where('pageId')
      .equals(c.id)
      .filter(
        (b) => b.deletedAt === null && !!b.boxId && gone.includes(b.boxId),
      )
      .toArray()
    for (const b of live) {
      await db.blocks.update(b.id, { deletedAt: Date.now() })
      hidden.push(b.id)
    }
  }
  if (back.length > 0) {
    for (const id of hidden.splice(0))
      await db.blocks.update(id, { deletedAt: null })
  }
}

registerKind('rows', {
  undo: (d) => applyRows((d as { rows: RowChange[] }).rows, 'undo'),
  redo: (d) => applyRows((d as { rows: RowChange[] }).rows, 'redo'),
  join: (old, next) => {
    const a = (old as { rows: RowChange[] }).rows
    const b = (next as { rows: RowChange[] }).rows
    return { rows: a.map((r, i) => ({ ...r, a: b[i]?.a ?? r.a })) }
  },
})

/** Only a title or a cell being typed merges with the write before it. */
const isTyping = (rows: RowChange[]): boolean =>
  rows.every(
    (r) =>
      r.k === 'u' &&
      Object.keys(r.a?.set ?? {}).every((f) => f === 'title' || f === 'values'),
  )

function labelFor(rows: RowChange[]): string {
  const f = new Set(rows.flatMap((r) => Object.keys(r.a?.set ?? {})))
  if (f.has('boxes') || f.has('rows')) return t('history.layout')
  if (f.has('tagIds') || rows.some((r) => r.t === 'blockTags'))
    return t('history.tags')
  if (rows.some((r) => r.t.startsWith('db') || r.t === 'databases'))
    return t('history.database')
  return t('history.pageChange')
}

setRowSink((changes, gid, label) => {
  const rows = changes.map((c) => {
    const rest = { ...c }
    delete rest.before
    return rest
  })
  push(
    {
      kind: 'rows',
      label: label || labelFor(rows),
      data: { rows },
      merge: gid || !isTyping(rows) ? undefined : rowsSig(rows),
    },
    gid ? { id: gid, label } : null,
  )
})

// A restored version (history/versionService.ts): undo restores the copy kept
// just before, redo restores the copy again; the page redraws from the database.
registerKind('restore', {
  undo: async (d) => {
    const { from } = d as { from: string }
    if (!from) throw new Error(t('history.why.gone'))
    await restoreVersion(db, from)
    reloadPage()
  },
  redo: async (d) => {
    await restoreVersion(db, (d as { to: string }).to)
    reloadPage()
  },
})

// An AI result or an import (bug batch 1 item 47): its blocks share one
// batch id. Undo hides them, Redo brings them back; the page redraws.
registerKind('aiBatch', {
  undo: async (d) => {
    const { pageId, batchId } = d as { pageId: string; batchId: string }
    const ids = (
      await db.blocks
        .where('pageId')
        .equals(pageId)
        .filter((b) => b.batchId === batchId && b.deletedAt === null)
        .toArray()
    ).map((b) => b.id)
    if (ids.length === 0) throw new Error(t('history.why.gone'))
    await softDeleteMany(db.blocks, ids, Date.now())
    reloadPage()
  },
  redo: async (d) => {
    const { pageId, batchId } = d as { pageId: string; batchId: string }
    const ids = (
      await db.blocks
        .where('pageId')
        .equals(pageId)
        .filter((b) => b.batchId === batchId && b.deletedAt !== null)
        .toArray()
    ).map((b) => b.id)
    await restoreMany(db.blocks, ids, Date.now())
    reloadPage()
  },
})

// For the tests and the console: what the open page's list holds.
if (typeof window !== 'undefined')
  (window as unknown as Record<string, unknown>).__lnHistory = {
    dump: () => {
      const j = active ? journals.get(active) : undefined
      const name = (s: Step): string =>
        s.subs
          ? `[${s.subs.map(name).join(',')}]`
          : `${s.kind}:${s.label}${
              s.kind === 'rows'
                ? ':' +
                  (s.data as { rows: RowChange[] }).rows
                    .map(
                      (r) =>
                        `${r.t}.${Object.keys(r.a?.set ?? {}).join('+')}${(r.a?.del ?? []).map((d) => '-' + d).join('')}`,
                    )
                    .join('|')
                : ''
            }`
      return {
        scope: active,
        done: j?.done.map(name) ?? [],
        undone: j?.undone.map(name) ?? [],
      }
    },
  }

/** Tests only: forget the session list and read the saved one again (a reload). */
export async function reloadSavedForTest(scope: string): Promise<void> {
  const j = journal(scope)
  await j.loaded
  j.done = []
  j.undone = []
  await loadSaved(scope, j)
}
