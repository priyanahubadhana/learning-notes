import type { LearningNotesDB } from '../../core/db'
import {
  appliedIn,
  redoAll,
  revOf,
  undoAll,
  writeAll,
  type Tx,
} from './notesTx'
import type { NotesPort } from './notesPort'
import type { Rec, StagedRecord, UndoRecord } from './jobTypes'

/** Tables a job may touch (the record kinds the write builders make). */
const TABLES = [
  'notebooks',
  'pages',
  'blocks',
  'cards',
  'databases',
  'dbColumns',
  'dbViews',
] as const

type Table = {
  get(id: string): Promise<unknown>
  put(value: never): Promise<unknown>
  where(field: string): {
    equals(v: unknown): { toArray(): Promise<unknown[]> }
  }
  toArray(): Promise<unknown[]>
}

/**
 * The app's port: the existing Dexie tables, every write inside one
 * `db.transaction`, so a failure rolls everything back. Undo moves created
 * records to Trash (the `deletedAt` flag) and never deletes for good.
 */
export class DexieNotesPort implements NotesPort {
  private readonly db: LearningNotesDB
  private readonly now: () => number
  constructor(db: LearningNotesDB, now: () => number = Date.now) {
    this.db = db
    this.now = now
  }

  private table(name: string): Table {
    if (!(TABLES as readonly string[]).includes(name))
      throw new Error(`A job may not use the table "${name}".`)
    return (this.db as unknown as Record<string, Table>)[name]
  }
  private tx(): Tx {
    return {
      get: async (t, id) => (await this.table(t).get(id)) as Rec | undefined,
      put: async (t, value) => {
        await this.table(t).put(value as never)
      },
    }
  }
  private run(fn: (tx: Tx) => Promise<void>) {
    const stores = TABLES.map((n) => this.table(n)) as never[]
    return this.db.transaction('rw', stores, () => fn(this.tx()))
  }

  async read(table: string, id: string) {
    return (await this.table(table).get(id)) as Rec | undefined
  }
  async readRev(table: string, id: string) {
    return revOf(await this.read(table, id))
  }
  async list(table: string, where: Rec) {
    const [[field, value], ...rest] = Object.entries(where)
    const rows = (await this.table(table)
      .where(field)
      .equals(value)
      .toArray()) as Rec[]
    return rest.length
      ? rows.filter((r) => rest.every(([k, v]) => r[k] === v))
      : rows
  }
  commit(_id: string, records: readonly StagedRecord[]) {
    return this.run((tx) => writeAll(tx, records))
  }
  async isApplied(_id: string, undo: UndoRecord) {
    return appliedIn(this.tx(), undo)
  }
  undo(_id: string, undo: UndoRecord) {
    return this.run((tx) => undoAll(tx, undo, this.now()))
  }
  redo(_id: string, records: readonly StagedRecord[], undo: UndoRecord) {
    return this.run((tx) => redoAll(tx, records, undo, this.now()))
  }
}
