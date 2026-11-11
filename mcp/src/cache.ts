import { createHash } from 'node:crypto'
import { openRecord, type MasterKey } from '../../src/sync/crypto'
import { fromWire } from '../../src/sync/wire'
import { RevokedError } from './source'
import { blocksToMarkdown, byOrder, plain } from './markdown'
import {
  READ_TABLES,
  type Block,
  type Card,
  type Notebook,
  type Page,
  type ReadTable,
} from './model'
import type { RecordSource } from './source'

/**
 * The decrypted notes, in memory only (never written to disk). Pulls
 * everything once, then only what changed since. Locked data stays locked:
 * a notebook is readable only when "Allow AI" is on for it, and a locked
 * page or notebook also needs "Allow AI while locked" (same rules as the
 * app's own AI, src/ai/aiLock.ts).
 */

const PAGE = 200
/** At most one server pull per this long, so repeated tool calls stay cheap. */
const MIN_GAP_MS = 10_000

interface Held<T> {
  rev: number
  /** The clock stamp the saving device gave this version. */
  h: string
  value: T
}

export interface CacheOptions {
  /** Read notebooks even when "Allow AI" is off (owner opt-in, LN_MCP_READ_ALL=1). */
  readAll?: boolean
  now?: () => number
}

export class NotesCache {
  private tables: Record<ReadTable, Map<string, Held<unknown>>> = {
    notebooks: new Map(),
    pages: new Map(),
    blocks: new Map(),
    cards: new Map(),
  }
  private seq = 0
  /** The newest clock stamp seen on any record (our own stamps start after it). */
  maxHlc = ''
  private last: number | null = null
  private running: Promise<void> | null = null
  unreadable = 0
  private readonly now: () => number
  private readonly source: RecordSource
  private readonly master: MasterKey
  private readonly opts: CacheOptions

  constructor(
    source: RecordSource,
    master: MasterKey,
    opts: CacheOptions = {},
  ) {
    this.source = source
    this.master = master
    this.opts = opts
    this.now = opts.now ?? Date.now
  }

  /** Brings the cache up to date (throttled unless `force`). */
  refresh(force = false): Promise<void> {
    if (this.running) return this.running
    if (!force && this.last !== null && this.now() - this.last < MIN_GAP_MS)
      return Promise.resolve()
    this.running = this.guardedPull().finally(() => {
      this.running = null
    })
    return this.running
  }

  /** A revoked connection gets nothing: not even what is already held. */
  private async guardedPull(): Promise<void> {
    if ((await this.source.status()) === 'revoked') {
      this.clear()
      throw new RevokedError()
    }
    await this.pullAll()
  }

  /** Forgets everything held in memory. */
  clear(): void {
    for (const t of READ_TABLES) this.tables[t].clear()
    this.seq = 0
    this.maxHlc = ''
    this.last = null
    this.unreadable = 0
  }

  private async pullAll(): Promise<void> {
    for (;;) {
      const rows = await this.source.pull(this.seq, PAGE)
      for (const row of rows) {
        try {
          const { table, id, value } = await openRecord(
            this.master,
            row.id,
            row.rev,
            { keyId: row.keyId, data: row.data },
          )
          if (!(READ_TABLES as readonly string[]).includes(table)) continue
          const env = value as { r?: { id?: unknown }; h?: unknown } | null
          if (!env?.r || env.r.id !== id) {
            this.unreadable++
            continue
          }
          const h = typeof env.h === 'string' ? env.h : ''
          if (h > this.maxHlc) this.maxHlc = h
          this.tables[table as ReadTable].set(id, {
            rev: row.rev,
            h,
            value: fromWire(env.r),
          })
        } catch {
          this.unreadable++
        }
        this.seq = Math.max(this.seq, row.seq)
      }
      if (rows.length > 0)
        this.seq = Math.max(this.seq, rows[rows.length - 1].seq)
      if (rows.length < PAGE) break
    }
    this.last = this.now()
  }

  private all<T>(t: ReadTable): { id: string; rev: number; v: T }[] {
    return [...this.tables[t].entries()].map(([id, h]) => ({
      id,
      rev: h.rev,
      v: h.value as T,
    }))
  }

  // ---- What writes need (every record, including hidden and removed ones) ----

  /** The stored page record with its revision and clock stamp, whatever its state. */
  rawPage(id: string): { value: Page; rev: number; h: string } | undefined {
    const h = this.tables.pages.get(id)
    return h ? { value: h.value as Page, rev: h.rev, h: h.h } : undefined
  }

  /** The person's workspace id (every notebook carries it), or null before the first sync. */
  workspaceId(): string | null {
    for (const { v } of this.all<Notebook>('notebooks'))
      if (typeof v.workspaceId === 'string') return v.workspaceId
    return null
  }

  /** The last sort key among ALL notebooks, so a new one never lands between hidden ones. */
  lastNotebookOrder(): string | null {
    return lastOf(this.all<Notebook>('notebooks').map((x) => x.v))
  }

  /** The last sort key among ALL pages with this parent (hidden and removed too). */
  lastPageOrder(notebookId: string, parentId: string | null): string | null {
    return lastOf(
      this.all<Page>('pages')
        .map((x) => x.v)
        .filter((p) => p.notebookId === notebookId && p.parentId === parentId),
    )
  }

  /** The last sort key among ALL top-level blocks of a page (removed too). */
  lastBlockOrder(pageId: string): string | null {
    return lastOf(
      this.all<Block>('blocks')
        .map((x) => x.v)
        .filter((b) => b.pageId === pageId && b.parentId === null),
    )
  }

  /** True when the page or its notebook is locked against edits in the app. */
  editLocked(page: Page): boolean {
    const nb = this.tables.notebooks.get(page.notebookId)?.value as
      Notebook | undefined
    return !!(page.editLocked || nb?.editLocked)
  }

  /** True when the page already has a top-level heading with exactly this text. */
  hasHeading(pageId: string, text: string): boolean {
    return this.blocksOf(pageId).some(
      ({ b }) =>
        b.type === 'heading' &&
        b.parentId === null &&
        plain(b.content.text) === text,
    )
  }

  /** A notebook Claude may read (and so write into), or undefined. */
  readableNotebook(id: string): Notebook | undefined {
    return this.notebookOf(id)
  }

  // ---- What Claude may see -------------------------------------------

  private gone = (r: { deletedAt?: number | null; purgedAt?: number }) =>
    !!r.deletedAt || !!r.purgedAt

  private readable = (n: Notebook) =>
    !this.gone(n) &&
    n.kind !== 'databases' &&
    !!(n.allowAi || this.opts.readAll)

  /** Notebooks Claude may read. */
  notebooks(): Notebook[] {
    return this.all<Notebook>('notebooks')
      .map((x) => x.v)
      .filter(this.readable)
      .sort(byOrder)
  }

  /** How many live notebooks are hidden because AI access is off. */
  hiddenNotebookCount(): number {
    const visible = new Set(this.notebooks().map((n) => n.id))
    return this.all<Notebook>('notebooks').filter(
      (x) => !this.gone(x.v) && x.v.kind !== 'databases' && !visible.has(x.id),
    ).length
  }

  private notebookOf(id: string): Notebook | undefined {
    const n = this.tables.notebooks.get(id)?.value as Notebook | undefined
    return n && this.readable(n) ? n : undefined
  }

  /** A page Claude may read, or null. */
  pageIfReadable(id: string): Page | null {
    const page = this.tables.pages.get(id)?.value as Page | undefined
    if (!page || this.gone(page)) return null
    const nb = this.notebookOf(page.notebookId)
    if (!nb) return null
    if ((page.locked || nb.locked) && !nb.allowAiLocked) return null
    // A page under a removed page is removed too.
    let up = page.parentId
    for (let i = 0; up && i < 50; i++) {
      const p = this.tables.pages.get(up)?.value as Page | undefined
      if (!p || this.gone(p)) return null
      up = p.parentId
    }
    return page
  }

  pages(notebookId?: string): Page[] {
    return this.all<Page>('pages')
      .map((x) => x.v)
      .filter((p) => !notebookId || p.notebookId === notebookId)
      .filter((p) => this.pageIfReadable(p.id))
      .sort(byOrder)
  }

  notebookTitle(id: string): string {
    return (
      (this.tables.notebooks.get(id)?.value as Notebook | undefined)?.title ??
      ''
    )
  }

  private blocksOf(pageId: string): { b: Block; rev: number }[] {
    return this.all<Block>('blocks')
      .filter((x) => x.v.pageId === pageId && !this.gone(x.v))
      .map((x) => ({ b: x.v, rev: x.rev }))
  }

  /** The page as Markdown plus a version that changes whenever it does. */
  readPage(id: string): {
    page: Page
    markdown: string
    version: string
    blocks: number
  } | null {
    const page = this.pageIfReadable(id)
    if (!page) return null
    const blocks = this.blocksOf(id)
    const pageRev = this.tables.pages.get(id)!.rev
    const hash = createHash('sha256')
    hash.update(`${id}:${pageRev}`)
    for (const { b, rev } of [...blocks].sort((a, c) =>
      a.b.id < c.b.id ? -1 : 1,
    ))
      hash.update(`|${b.id}:${rev}`)
    return {
      page,
      markdown: blocksToMarkdown(blocks.map((x) => x.b)),
      version: hash.digest('hex').slice(0, 16),
      blocks: blocks.length,
    }
  }

  /** Plain text of a page (title + blocks), for search. */
  pageText(id: string): string {
    return this.blocksOf(id)
      .sort((a, c) => byOrder(a.b, c.b))
      .map((x) => plain(x.b.content.text))
      .filter(Boolean)
      .join('\n')
  }

  /** Cards Claude may see, with their question and answer. */
  cards(filter: { pageId?: string; notebookId?: string } = {}): CardView[] {
    const out: CardView[] = []
    for (const { v: c } of this.all<Card>('cards')) {
      if (this.gone(c)) continue
      if (filter.pageId && c.pageId !== filter.pageId) continue
      if (filter.notebookId && c.notebookId !== filter.notebookId) continue
      const page = this.pageIfReadable(c.pageId)
      if (!page || page.paused) continue
      const block = this.tables.blocks.get(c.blockId)?.value as
        Block | undefined
      if (!block || this.gone(block)) continue
      const front =
        block.type === 'card'
          ? c.part === 'main'
            ? plain(block.content.text)
            : plain(block.content.text, c.part)
          : plain(block.content.text, c.part)
      if (!front) continue
      const back =
        block.type === 'card' && c.part === 'main'
          ? this.blocksOf(c.pageId)
              .filter((x) => x.b.parentId === block.id)
              .sort((a, d) => byOrder(a.b, d.b))
              .map((x) => plain(x.b.content.text))
              .filter(Boolean)
              .join('\n')
          : plain(block.content.text)
      out.push({
        id: c.id,
        pageId: c.pageId,
        pageTitle: page.title,
        notebookId: c.notebookId,
        front,
        back,
        due: c.due,
        reps: c.reps,
        lapses: c.lapses,
        intervalDays: c.intervalDays,
        suspended: c.suspendedAt !== null && c.suspendedAt !== undefined,
      })
    }
    return out.sort((a, b) => a.due - b.due)
  }
}

const lastOf = (list: { order: string; id: string }[]): string | null =>
  list.length === 0 ? null : [...list].sort(byOrder)[list.length - 1].order

export interface CardView {
  id: string
  pageId: string
  pageTitle: string
  notebookId: string
  front: string
  back: string
  due: number
  reps: number
  lapses: number
  intervalDays: number
  suspended: boolean
}
