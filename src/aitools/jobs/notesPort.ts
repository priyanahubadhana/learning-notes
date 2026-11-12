import {
  appliedIn,
  redoAll,
  revOf,
  undoAll,
  writeAll,
  type Tx,
} from './notesTx'
import type { Rec, StagedRecord, UndoRecord } from './jobTypes'

/**
 * How the executor reads and writes the notes. Commit, undo and redo are each
 * all-or-nothing, and undo and redo are idempotent.
 */
export interface NotesPort {
  read(table: string, id: string): Promise<Rec | undefined>
  /** The revision (updatedAt) of a record; 0 when it does not exist. */
  readRev(table: string, id: string): Promise<number>
  /** Records of a table whose fields equal `where` (live and deleted). */
  list(table: string, where: Rec): Promise<Rec[]>
  commit(
    jobId: string,
    records: readonly StagedRecord[],
    undo: UndoRecord,
  ): Promise<void>
  /** True when this job's records are in place (after a restart). */
  isApplied(jobId: string, undo: UndoRecord): Promise<boolean>
  undo(jobId: string, undo: UndoRecord): Promise<void>
  redo(
    jobId: string,
    records: readonly StagedRecord[],
    undo: UndoRecord,
  ): Promise<void>
}

type Tables = Map<string, Map<string, Rec>>

/** Test port: tables in memory, with fault injection and full rollback. */
export class MemoryNotesPort implements NotesPort {
  private tables: Tables = new Map()
  /** Fail on the Nth write (1-based) of the next commit / undo / redo. */
  failOnWrite: number | null = null
  commits = 0
  private writes = 0

  private readonly now: () => number
  constructor(now: () => number = () => 1_000_000) {
    this.now = now
  }

  seed(table: string, value: Rec) {
    this.t(table).set(String(value.id), structuredClone(value))
  }
  get(table: string, id: string) {
    const v = this.t(table).get(id)
    return v ? structuredClone(v) : undefined
  }
  /** Every record that is not deleted, sorted: the "state" tests compare. */
  liveSnapshot(): string {
    const rows: string[] = []
    for (const [table, map] of this.tables)
      for (const v of map.values())
        if (v.deletedAt == null) rows.push(`${table}:${JSON.stringify(v)}`)
    return rows.sort().join('\n')
  }
  count(table: string, includeDeleted = false) {
    return [...this.t(table).values()].filter(
      (v) => includeDeleted || v.deletedAt == null,
    ).length
  }

  async read(table: string, id: string) {
    return this.get(table, id)
  }
  async readRev(table: string, id: string) {
    return revOf(this.t(table).get(id))
  }
  async list(table: string, where: Rec) {
    return [...this.t(table).values()]
      .filter((v) => Object.entries(where).every(([k, x]) => v[k] === x))
      .map((v) => structuredClone(v))
  }
  async commit(_id: string, records: readonly StagedRecord[]) {
    this.commits++
    await this.atomic((tx) => writeAll(tx, records))
  }
  async isApplied(_id: string, undo: UndoRecord) {
    return appliedIn(this.tx(), undo)
  }
  async undo(_id: string, undo: UndoRecord) {
    await this.atomic((tx) => undoAll(tx, undo, this.now()))
  }
  async redo(_id: string, records: readonly StagedRecord[], undo: UndoRecord) {
    await this.atomic((tx) => redoAll(tx, records, undo, this.now()))
  }

  private t(table: string) {
    let m = this.tables.get(table)
    if (!m) this.tables.set(table, (m = new Map()))
    return m
  }
  private tx(): Tx {
    return {
      get: async (table, id) => this.t(table).get(id),
      put: async (table, value) => {
        this.writes++
        if (this.failOnWrite !== null && this.writes >= this.failOnWrite) {
          this.failOnWrite = null
          throw new Error('injected write failure')
        }
        this.t(table).set(String(value.id), structuredClone(value))
      },
    }
  }
  private async atomic(fn: (tx: Tx) => Promise<void>) {
    const snapshot = structuredClone(this.tables)
    this.writes = 0
    try {
      await fn(this.tx())
    } catch (e) {
      this.tables = snapshot
      throw e
    }
  }
}
