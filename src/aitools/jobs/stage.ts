import { generateKeyBetween } from 'fractional-indexing'
import { stableId } from '../../core/ids'
import {
  appendKeys,
  cardsIntoPage,
  blockTree,
  databaseIntoNotebook,
  notebookFromSpec,
  pageIntoNotebook,
  styleFields,
  type MadeRecord,
} from '../../../mcp/src/gen/notesWrite'
import type {
  SpecBlock,
  SpecCard,
  SpecDatabase,
  SpecPage,
  SpecStyle,
} from '../../connector/spec'
import type { AiToolDef } from '../types'
import { StepError } from './filler'
import type { Rec, StagedRecord } from './jobTypes'
import { canon } from './notesTx'
import type { NotesPort } from './notesPort'

/** A job writes at most this many records, so it always fits one commit. */
export const MAX_RECORDS = 1000

export interface StageEnv {
  jobId: string
  stepId: string
  /** Fixed for the whole job, so staging twice gives identical records. */
  now: number
  workspaceId: string
  port: NotesPort
  /** Records staged by earlier steps of this job (later steps may build on them). */
  staged: readonly StagedRecord[]
}

export interface StageResult {
  records: StagedRecord[]
  outputs: Rec
}

/**
 * The app's order-key helpers add two random digits so two devices rarely make
 * the same key. A job must stage to identical records every time (AF-3), so
 * while a builder runs (synchronously) those digits come from a generator
 * seeded with (job id, step id). Only crypto.getRandomValues is swapped, and
 * it is put back before anything else can run.
 */
function seededRandom(seed: string) {
  let a = Number.parseInt(stableId(seed).replace(/-/g, '').slice(0, 8), 16) | 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return <T>(fn: () => T): T => {
    const c = globalThis.crypto as unknown as Record<string, unknown>
    const own = Object.getOwnPropertyDescriptor(c, 'getRandomValues')
    Object.defineProperty(c, 'getRandomValues', {
      configurable: true,
      writable: true,
      value: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(next() * 256)
        return arr
      },
    })
    try {
      return fn()
    } finally {
      if (own) Object.defineProperty(c, 'getRandomValues', own)
      else delete c.getRandomValues
    }
  }
}

/** hash(job id, step id, tool id + version, resolved args). */
export function stepKey(
  jobId: string,
  stepId: string,
  tool: Pick<AiToolDef, 'id' | 'version'>,
  args: Rec,
): string {
  return stableId(
    `${jobId}|${stepId}|${tool.id}@${tool.version}|${JSON.stringify(canon(args))}`,
  )
}

const live = (r: Rec) => r.deletedAt == null
const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const top = (r: Rec) => r.parentId == null
const maxOrder = (rows: Rec[]): string | null =>
  rows.reduce<string | null>(
    (m, r) =>
      typeof r.order === 'string' && (!m || r.order > m) ? r.order : m,
    null,
  )

/** Stages one step: builds the app's records in memory. Writes nothing. */
export async function stageStep(
  tool: AiToolDef,
  args: Rec,
  env: StageEnv,
): Promise<StageResult> {
  const calm = seededRandom(`${env.jobId}/${env.stepId}`)
  const det = {
    notebookFromSpec: (...a: Parameters<typeof notebookFromSpec>) =>
      calm(() => notebookFromSpec(...a)),
    pageIntoNotebook: (...a: Parameters<typeof pageIntoNotebook>) =>
      calm(() => pageIntoNotebook(...a)),
    cardsIntoPage: (...a: Parameters<typeof cardsIntoPage>) =>
      calm(() => cardsIntoPage(...a)),
    databaseIntoNotebook: (...a: Parameters<typeof databaseIntoNotebook>) =>
      calm(() => databaseIntoNotebook(...a)),
    blockTree: (...a: Parameters<typeof blockTree>) =>
      calm(() => blockTree(...a)),
  }
  let n = 0
  const newId = () => stableId(`${env.jobId}/${env.stepId}/${n++}`)
  const base = { now: env.now, newId, batchId: stableId(`${env.jobId}/batch`) }

  const priorOf = (table: string, id: string) =>
    [...env.staged].reverse().find((r) => r.table === table && r.id === id)
  const look = async (table: string, id: string): Promise<Rec | undefined> => {
    const p = priorOf(table, id)
    const v = p ? p.value : await env.port.read(table, id)
    return v && live(v) ? v : undefined
  }
  const need = async (table: string, id: string, what: string) => {
    const v = await look(table, id)
    if (!v) throw new StepError('gone', `The ${what} is gone.`)
    return v
  }
  /** Live rows of a table with `where`, staged changes included. */
  const rows = async (table: string, where: Rec): Promise<Rec[]> => {
    const byId = new Map<string, Rec>()
    for (const r of await env.port.list(table, where)) byId.set(String(r.id), r)
    for (const r of env.staged)
      if (
        r.table === table &&
        Object.entries(where).every(([k, v]) => r.value[k] === v)
      )
        byId.set(r.id, r.value)
    return [...byId.values()].filter(live)
  }
  const made = (list: MadeRecord[]): StagedRecord[] =>
    list.map((r) => ({ table: r.table, id: r.id, value: r.value }))

  /** An edit of an existing record (or of one this job made earlier). */
  const edit = async (
    table: string,
    cur: Rec,
    changes: Rec,
    baseRev?: number,
  ): Promise<StagedRecord[]> => {
    const prior = priorOf(table, String(cur.id))
    const diff = Object.keys(changes).filter(
      (k) =>
        JSON.stringify(canon(cur[k])) !== JSON.stringify(canon(changes[k])),
    )
    if (!diff.length) return []
    const value = { ...cur, ...changes, updatedAt: env.now }
    if (prior && !prior.baseRev) return [{ table, id: String(cur.id), value }]
    const rev = prior?.baseRev ?? baseRev ?? Number(cur.updatedAt ?? 0)
    if (baseRev && !prior && baseRev !== Number(cur.updatedAt ?? 0))
      throw new StepError('stale', 'The notebook changed since it was read.')
    const before: Rec = { ...Object.fromEntries(diff.map((k) => [k, cur[k]])) }
    before.updatedAt = cur.updatedAt
    return [
      {
        table,
        id: String(cur.id),
        value,
        baseRev: rev || 1,
        before: { ...before, ...(prior?.before ?? {}) },
      },
    ]
  }

  const result = async (): Promise<StageResult> => {
    switch (tool.id) {
      case 'notebooks.create': {
        const style = args.style as SpecStyle | undefined
        const mine = await rows('notebooks', { workspaceId: env.workspaceId })
        const out = det.notebookFromSpec(
          {
            version: 'ln-spec/1',
            title: String(args.title),
            style,
            pages: [],
          },
          {
            ...base,
            workspaceId: env.workspaceId,
            lastNotebookOrder: maxOrder(mine),
          },
        )
        return {
          records: made(out.records),
          outputs: { notebookId: out.notebookId },
        }
      }
      case 'pages.write_notes': {
        const page = args.page as SpecPage | undefined
        if (!page)
          throw new StepError('validation', 'The page text is missing.')
        const notebookId = String(args.notebookId)
        await need('notebooks', notebookId, 'notebook')
        const parentId = str(args.parentId) ?? null
        if (parentId) await need('pages', parentId, 'parent page')
        const siblings = (await rows('pages', { notebookId })).filter(
          (p) => (p.parentId ?? null) === parentId,
        )
        const out = det.pageIntoNotebook(page, {
          ...base,
          notebookId,
          parentId,
          lastSiblingOrder: maxOrder(siblings),
        })
        return {
          records: made(out.records),
          outputs: { pageId: out.pageIds[0], notebookId },
        }
      }
      case 'cards.make_recall':
      case 'cards.make_cloze': {
        const cards = args.cards as SpecCard[] | undefined
        if (!cards) throw new StepError('validation', 'The cards are missing.')
        const pageId = String(args.pageId)
        const page = await need('pages', pageId, 'page')
        const version = str(args.expectedVersion)
        if (version && version !== String(page.updatedAt))
          throw new StepError('stale', 'The page changed since it was read.')
        const blocks = (await rows('blocks', { pageId })).filter(top)
        const out = det.cardsIntoPage(cards, {
          ...base,
          notebookId: String(page.notebookId),
          pageId,
          pageTitle: String(page.title),
          lastBlockOrder: maxOrder(blocks),
          hasHeading: blocks.some(
            (b) =>
              b.type === 'heading' &&
              JSON.stringify(b.content).includes('Recall cards'),
          ),
        })
        const records = made(out.records)
        return {
          records,
          outputs: {
            pageId,
            cardIds: records
              .filter((r) => r.table === 'cards')
              .map((r) => r.id),
          },
        }
      }
      case 'databases.create': {
        const database = args.database as SpecDatabase | undefined
        if (!database)
          throw new StepError('validation', 'The database is missing.')
        const notebookId = String(args.notebookId)
        await need('notebooks', notebookId, 'notebook')
        const pageId = str(args.pageId)
        const page = pageId ? await need('pages', pageId, 'page') : undefined
        const dbs = await rows('databases', { notebookId })
        const out = det.databaseIntoNotebook(database, {
          ...base,
          workspaceId: env.workspaceId,
          notebookId,
          lastOrder: maxOrder(dbs),
          page: page
            ? {
                id: String(page.id),
                title: String(page.title),
                lastBlockOrder: maxOrder(
                  (await rows('blocks', { pageId })).filter(top),
                ),
              }
            : undefined,
        })
        return {
          records: made(out.records),
          outputs: { notebookId, databaseId: out.databaseId },
        }
      }
      case 'styles.apply':
        return stageStyle()
      case 'pages.refine':
        return stageRefine()
      default:
        throw new StepError('validation', `No stage for ${tool.id}.`)
    }
  }

  async function stageStyle(): Promise<StageResult> {
    const notebookId = String(args.notebookId)
    const nb = await need('notebooks', notebookId, 'notebook')
    const style = (args.style ?? {}) as SpecStyle
    const fields = styleFields(style)
    const pageId = str(args.pageId)
    const tabColour = str(args.tabColour)
    if (tabColour && !pageId)
      throw new StepError('validation', 'A tab colour needs a page.')
    const records = await edit(
      'notebooks',
      nb,
      fields.notebook,
      Number(args.baseRev) || undefined,
    )
    const pageChanges: Rec = {
      ...fields.page,
      ...(tabColour ? { tabColour } : {}),
    }
    if (Object.keys(pageChanges).length) {
      const pages = pageId
        ? [await need('pages', pageId, 'page')]
        : await rows('pages', { notebookId })
      for (const p of pages)
        records.push(...(await edit('pages', p, pageChanges)))
    }
    return { records, outputs: { notebookId } }
  }

  async function stageRefine(): Promise<StageResult> {
    const ops = args.ops as
      | {
          op: 'add' | 'insert' | 'replace'
          block: SpecBlock
          blockId?: string
          afterBlockId?: string
          parentId?: string
        }[]
      | undefined
    if (!ops) throw new StepError('validation', 'The edits are missing.')
    const pageId = String(args.pageId)
    const page = await need('pages', pageId, 'page')
    const version = str(args.baseRevision)
    if (version && version !== String(page.updatedAt))
      throw new StepError('stale', 'The page changed since it was read.')
    const blocks = await rows('blocks', { pageId })
    const byId = new Map(blocks.map((b) => [String(b.id), b]))
    const last = new Map<string | null, string | null>()
    const lastOf = (parent: string | null) =>
      last.has(parent)
        ? (last.get(parent) ?? null)
        : maxOrder(blocks.filter((b) => (b.parentId ?? null) === parent))
    const records: StagedRecord[] = []
    const ctx = {
      ...base,
      notebookId: String(page.notebookId),
      pageId,
      pageTitle: String(page.title),
    }
    for (const op of ops) {
      if (op.op === 'replace') {
        const old = op.blockId ? byId.get(op.blockId) : undefined
        if (!old) throw new StepError('gone', 'The block to replace is gone.')
        const t = det.blockTree(op.block, {
          ...ctx,
          parentId: (old.parentId as string | null) ?? null,
          order: String(old.order),
        })
        const root = t.records.find((r) => r.id === t.blockId)
        if (!root)
          throw new StepError('validation', 'Could not build the block.')
        records.push(
          ...(await edit('blocks', old, {
            type: root.value.type,
            content: root.value.content,
            source: 'ai',
            batchId: base.batchId,
          })),
        )
        for (const r of made(t.records)) {
          if (r.id === t.blockId) continue
          if (r.value.parentId === t.blockId) r.value.parentId = old.id
          records.push(r)
        }
        continue
      }
      let parent: string | null = null
      let order: string
      if (op.op === 'insert') {
        const after = op.afterBlockId ? byId.get(op.afterBlockId) : undefined
        if (!after)
          throw new StepError('gone', 'The block to insert after is gone.')
        parent = (after.parentId as string | null) ?? null
        const next = blocks
          .filter(
            (b) =>
              (b.parentId ?? null) === parent &&
              String(b.order) > String(after.order),
          )
          .map((b) => String(b.order))
          .sort()[0]
        order = generateKeyBetween(String(after.order), next ?? null)
      } else {
        parent = op.parentId ?? null
        if (parent && !byId.has(parent))
          throw new StepError('gone', 'The parent block is gone.')
        order = calm(() => appendKeys(lastOf(parent))())
        last.set(parent, order)
      }
      const t = det.blockTree(op.block, { ...ctx, parentId: parent, order })
      records.push(...made(t.records))
    }
    return { records, outputs: { pageId } }
  }

  const out = await result()
  if (env.staged.length + out.records.length > MAX_RECORDS)
    throw new StepError('too_many', 'A job can make at most 1,000 records.')
  return out
}
