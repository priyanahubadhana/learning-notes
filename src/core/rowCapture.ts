import Dexie, { type Transaction } from 'dexie'
import type { LearningNotesDB } from '../core/db'
import { isRemoteTrans } from '../sync/outbox'
import { currentGroup, isQuiet, isQuietTx } from './historySteps'
import type { RowChange } from './rowTypes'

/**
 * Records the database writes that are user actions as undo steps, from the
 * database itself (Dexie hooks), so no service can forget to. Text
 * (`blocks`) and drawings (`inkChunks`) are not here: the editor and the ink
 * keep those steps. Only the page that is open is recorded (sync, imports
 * and migrations touching other pages are not), and never a write made by
 * Undo / Redo itself, a restore (`quietly`) or by sync.
 *
 * Every table of the database must be listed in HISTORY_TABLES (a unit test
 * fails otherwise), so a new table cannot silently bypass Undo.
 */
/**
 * What is recorded. 'page': belongs to one page, recorded when that page is
 * open. 'open': belongs to no page, recorded on whatever page is open.
 * 'with': text rows, recorded only inside a transaction that also changes
 * the page itself (a box removed or copied); the editor's own saves are quiet.
 * Text and drawings otherwise keep their own steps. Every other table (helper
 * lists, logs, settings, files) is not an action; the unit test lists them so
 * that a new table must be classified before it ships.
 */
export const HISTORY_TABLES: Record<string, 'page' | 'open' | 'with'> = {
  pages: 'page',
  cards: 'page',
  blockTags: 'page',
  blocks: 'with',
  tags: 'open',
  databases: 'open',
  dbColumns: 'open',
  dbViews: 'open',
  decks: 'open',
}

/** The page fields a person changes (everything else is bookkeeping). */
export const PAGE_FIELDS = [
  'title',
  'parentId',
  'notebookId',
  'locked',
  'editLocked',
  'readFirst',
  'paused',
  'tabColour',
  'inkBg',
  'tagIds',
  'boxes',
  'rows',
  'sheet',
  'values',
  'pathStyle',
  'customTitle',
  'deletedAt',
] as const

/** Called with each finished transaction's changes (set by pageHistory). */
type Sink = (changes: RowChange[], gid: number, label: string) => void
let sink: Sink | null = null
const early: Array<[RowChange[], number, string]> = []
export function setRowSink(fn: Sink): void {
  sink = fn
  for (const e of early.splice(0)) fn(...e)
}

/** The page that is open (set by pageHistory; null: none). */
let openPage = (): string | null => null
export function setOpenPage(fn: () => string | null): void {
  openPage = fn
}

const pending = new WeakMap<
  object,
  { gid: number; label: string; rows: RowChange[] }
>()

const clone = <T>(v: T): T =>
  v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T)

function note(table: string, trans: Transaction, change: RowChange): void {
  const idb = (trans as unknown as { idbtrans?: object }).idbtrans
  if (isQuiet() || isQuietTx(trans) || isRemoteTrans(idb)) return
  const mode = HISTORY_TABLES[table]
  const open = openPage()
  if (!open) return
  const row = (change.row ?? change.before ?? {}) as Record<string, unknown>
  if (mode !== 'open') {
    const pid = table === 'pages' ? change.id : (row.pageId as string)
    // A database screen records the rows (pages) of that database too.
    const inDb =
      table === 'pages' &&
      open.startsWith('db:') &&
      row.databaseId === open.slice(3)
    if (`page:${pid}` !== open && !inDb) return
  }
  // One bucket per real (IndexedDB) transaction: a nested Dexie transaction
  // is another object on the same one.
  const key = (idb ?? trans) as object
  let p = pending.get(key)
  if (!p) {
    const g = currentGroup()
    p = { gid: g?.id ?? 0, label: g?.label ?? '', rows: [] }
    pending.set(key, p)
    const mine = p
    const done = () => {
      pending.delete(key)
      // Text rows alone are the editor's business (its own steps).
      if (mine.rows.every((r) => r.t === 'blocks')) return
      if (sink) sink(mine.rows, mine.gid, mine.label)
      else early.push([mine.rows, mine.gid, mine.label])
    }
    if (idb) {
      const target = idb as unknown as EventTarget
      target.addEventListener('complete', done)
      target.addEventListener('abort', () => pending.delete(key))
    } else {
      trans.on('complete', done)
      trans.on('abort', () => pending.delete(key))
    }
  }
  p.rows.push(change)
}

export function installRowCapture(db: LearningNotesDB): void {
  for (const table of Object.keys(HISTORY_TABLES)) {
    const t = db.table(table)
    t.hook('creating', function (primKey, obj, trans) {
      note(table, trans, {
        t: table,
        id: primKey as string,
        k: 'c',
        row: clone(obj),
      })
    })
    t.hook('deleting', function (primKey, obj, trans) {
      note(table, trans, {
        t: table,
        id: primKey as string,
        k: 'd',
        row: clone(obj),
        before: clone(obj),
      })
    })
    t.hook('updating', function (mods, primKey, obj, trans) {
      const m = mods as Record<string, unknown>
      const after = clone(obj) as Record<string, unknown>
      for (const [kp, v] of Object.entries(m)) {
        if (v === undefined) Dexie.delByKeyPath(after, kp)
        else Dexie.setByKeyPath(after, kp, clone(v))
      }
      const top = new Set(Object.keys(m).map((kp) => kp.split('.')[0]))
      const set: [Record<string, unknown>, Record<string, unknown>] = [{}, {}]
      const gone: [string[], string[]] = [[], []]
      const was = obj as Record<string, unknown>
      for (const f of top) {
        if (
          table === 'pages' &&
          !(PAGE_FIELDS as readonly string[]).includes(f)
        )
          continue
        if (f === 'updatedAt' || f === 'rev') continue
        if (JSON.stringify(was[f]) === JSON.stringify(after[f])) continue
        if (was[f] === undefined) gone[0].push(f)
        else set[0][f] = clone(was[f])
        if (after[f] === undefined) gone[1].push(f)
        else set[1][f] = clone(after[f])
      }
      if (
        Object.keys(set[0]).length +
          Object.keys(set[1]).length +
          gone[0].length +
          gone[1].length ===
        0
      )
        return
      note(table, trans, {
        t: table,
        id: primKey as string,
        k: 'u',
        b: { set: set[0], del: gone[0] },
        a: { set: set[1], del: gone[1] },
        before: was,
      })
    })
  }
}
