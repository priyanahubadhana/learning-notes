import type { Rec, StagedRecord, UndoEdit, UndoRecord } from './jobTypes'

/**
 * The commit / undo / redo rules, written once over a tiny table interface so
 * the in-memory port (tests) and the Dexie port (app) behave the same.
 * The caller supplies the all-or-nothing wrapper (snapshot or db.transaction).
 */
export interface Tx {
  get(table: string, id: string): Promise<Rec | undefined>
  put(table: string, value: Rec): Promise<void>
}

export class StaleError extends Error {
  readonly table: string
  readonly id: string
  constructor(table: string, id: string) {
    super('A record changed after the job was prepared.')
    this.name = 'StaleError'
    this.table = table
    this.id = id
  }
}

export const revOf = (value: Rec | undefined): number =>
  value && typeof value.updatedAt === 'number' ? value.updatedAt : 0

/** Keys sorted at every level, so equal data gives equal text. */
export function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canon((v as Rec)[k])]),
    )
  }
  return v
}

export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b))
}

/** Writes every record. New ids that already hold the same value are "already done". */
export async function writeAll(tx: Tx, records: readonly StagedRecord[]) {
  for (const r of records) {
    const cur = await tx.get(r.table, r.id)
    if (r.baseRev) {
      // Staging gives a record with no time stamp the revision 1.
      if (!cur || (revOf(cur) || 1) !== r.baseRev)
        throw new StaleError(r.table, r.id)
    } else if (cur) {
      if (same(cur, r.value)) continue
      throw new Error(`${r.table} ${r.id} already exists`)
    }
    await tx.put(r.table, r.value)
  }
}

/** Moves the fields in `from` to the values in `to`, only where they still hold `from`. */
function swapFields(
  cur: Rec,
  from: Rec,
  to: Rec,
  now: number,
): Rec | undefined {
  const next: Rec = { ...cur }
  let changed = false
  let skipped = false
  for (const key of Object.keys(from)) {
    if (key === 'updatedAt') continue
    if (same(cur[key], from[key])) {
      if (to[key] === undefined) delete next[key]
      else next[key] = to[key]
      changed = true
    } else skipped = true
  }
  if (!changed) return undefined
  // The exact time stamp comes back only when every field went back.
  next.updatedAt =
    !skipped && typeof to.updatedAt === 'number' ? to.updatedAt : now
  return next
}

export async function undoAll(tx: Tx, undo: UndoRecord, now: number) {
  for (const c of undo.created) {
    const cur = await tx.get(c.table, c.id)
    if (cur && cur.deletedAt == null)
      await tx.put(c.table, { ...cur, deletedAt: now, updatedAt: now })
  }
  for (const e of undo.edited as UndoEdit[]) {
    const cur = await tx.get(e.table, e.id)
    const next = cur && swapFields(cur, e.after, e.before, now)
    if (next) await tx.put(e.table, next)
  }
}

export async function redoAll(
  tx: Tx,
  records: readonly StagedRecord[],
  undo: UndoRecord,
  now: number,
) {
  for (const c of undo.created) {
    const cur = await tx.get(c.table, c.id)
    if (!cur) {
      const r = records.find((x) => x.table === c.table && x.id === c.id)
      if (r) await tx.put(c.table, r.value)
    } else if (cur.deletedAt != null)
      await tx.put(c.table, { ...cur, deletedAt: null, updatedAt: now })
  }
  for (const e of undo.edited) {
    const cur = await tx.get(e.table, e.id)
    const next = cur && swapFields(cur, e.before, e.after, now)
    if (next) await tx.put(e.table, next)
  }
}

/** True when the job's records are in place (used after a restart). */
export async function appliedIn(tx: Tx, undo: UndoRecord): Promise<boolean> {
  if (!undo.created.length && !undo.edited.length) return false
  for (const c of undo.created) {
    const cur = await tx.get(c.table, c.id)
    if (!cur || cur.deletedAt != null) return false
  }
  for (const e of undo.edited) {
    const cur = await tx.get(e.table, e.id)
    if (!cur) return false
    for (const k of Object.keys(e.after))
      if (k !== 'updatedAt' && !same(cur[k], e.after[k])) return false
  }
  return true
}

/** The undo record of a ChangeSet: pure, so it can always be rebuilt. */
export function buildUndo(
  jobId: string,
  records: readonly StagedRecord[],
): UndoRecord {
  const undo: UndoRecord = { jobId, created: [], edited: [] }
  for (const r of records) {
    if (r.baseRev) {
      const before = r.before ?? {}
      const after: Rec = {}
      for (const k of Object.keys(before)) after[k] = r.value[k]
      undo.edited.push({ table: r.table, id: r.id, before, after })
    } else undo.created.push({ table: r.table, id: r.id })
  }
  return undo
}
