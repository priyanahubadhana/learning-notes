import { randomUUID } from 'node:crypto'
import {
  describeErrors,
  SPEC_VERSION,
  validateSpec,
  type NotebookSpec,
  type SpecBlock,
  type SpecPage,
} from '../../src/connector/spec'
import { remoteId, sealRecord, type MasterKey } from '../../src/sync/crypto'
import { formatHlc, receive, tick, type Clock } from '../../src/sync/hlc'
import { SYNC_FORMAT_VERSION } from '../../src/sync/tables'
import { toWire } from '../../src/sync/wire'
import type { NotesCache } from './cache'
import type { Scopes } from './config'
import {
  notebookFromSpec,
  orderKey,
  pageIntoNotebook,
  type Made,
  type MadeRecord,
} from './gen/notesWrite'
import { markdownToBlocks } from './mdParse'
import type { Page } from './model'
import type { PushItem, RecordSource } from './source'
import { ToolError } from './tools'

/**
 * The write tools (slice 4). Every write:
 *  - needs its scope in config.json (also checked here, not only hidden),
 *  - starts from a fresh copy of the server's records (and fails if this
 *    connection was revoked),
 *  - is checked by the shared spec validator before anything is built,
 *  - saves only NEW records (base revision 0), except that an append also
 *    touches the page record once, with a compare-and-swap on the revision
 *    the version check was made against,
 *  - seals each record with the shared crypto, stamped with a hybrid logical
 *    clock under this connector's device id, so the app merges it like any
 *    other device's change,
 *  - leaves one audit line (tool, ids, counts; never content).
 * There is no delete and no edit of existing text.
 */

/** Records per save call (the server accepts 500). */
const CHUNK = 400
const CARDS_HEADING = 'Recall cards'

interface Out {
  table: string
  id: string
  value: Record<string, unknown>
  /** 0 = must be new; otherwise the revision this change is based on. */
  baseRev: number
  /** A clock stamp this record must sort after (the version it replaces). */
  after?: string
}

export interface WriteDeps {
  cache: NotesCache
  source: RecordSource
  master: MasterKey
  deviceId: string
  scopes: Scopes
  now?: () => number
  newId?: () => string
}

/** Keys that sort after every existing sibling, in order (valid fractional-indexing keys). */
export function keysAfter(last: string | null, n: number): string[] {
  if (n > 3000) throw new ToolError('Too many blocks in one append.')
  const D = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  return Array.from({ length: n }, (_, i) =>
    last === null
      ? orderKey(i)
      : `${last}V${D[Math.floor(i / 61)]}${D[1 + (i % 61)]}`,
  )
}

export function makeWriteTools(d: WriteDeps) {
  const now = d.now ?? Date.now
  const newId = d.newId ?? randomUUID
  let clock: Clock = { ms: 0, n: 0, deviceId: d.deviceId }
  let queue: Promise<unknown> = Promise.resolve()

  /** One write at a time: the clock, the version check and the save stay in order. */
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn)
    queue = run.catch(() => undefined)
    return run
  }

  const need = (scope: keyof Scopes) => {
    if (!d.scopes[scope])
      throw new ToolError(
        `Claude is not allowed to do this: "${scope}" is switched off in ~/.learning-notes-mcp/config.json. Turn it on and restart Claude Desktop.`,
      )
  }

  const stamp = (at: number, after?: string): string => {
    let c = clock
    for (const h of [d.cache.maxHlc, after]) if (h) c = receive(c, h, at)
    clock = tick(c, at)
    return formatHlc(clock)
  }

  const seal = async (outs: Out[], at: number): Promise<PushItem[]> => {
    const items: PushItem[] = []
    for (const o of outs) {
      const env = {
        f: SYNC_FORMAT_VERSION,
        h: stamp(at, o.after),
        d: d.deviceId,
        r: toWire(o.value),
      }
      const sealed = await sealRecord(
        d.master,
        o.table,
        o.id,
        o.baseRev + 1,
        env,
      )
      items.push({
        id: remoteId(o.table, o.id),
        baseRev: o.baseRev,
        keyId: sealed.keyId,
        data: sealed.data,
      })
    }
    return items
  }

  const push = async (items: PushItem[]): Promise<void> => {
    for (let i = 0; i < items.length; i += CHUNK) {
      const res = await d.source.push(items.slice(i, i + CHUNK))
      if (res.conflicts.length > 0)
        throw new ToolError(
          'Something changed on the server while saving. Read the page again and retry.',
        )
    }
  }

  /** The audit line and a fresh cache. Neither may undo a save that worked. */
  const afterSave = async (
    tool: string,
    ids: string[],
    counts: Record<string, number>,
  ): Promise<{ audit?: string }> => {
    let audit: string | undefined
    try {
      await d.source.audit(tool, ids, counts)
    } catch {
      audit =
        'The change was saved, but its audit line could not be written (the server was not reachable).'
    }
    await d.cache.refresh(true).catch(() => undefined)
    return audit ? { audit } : {}
  }

  const checkSpec = (input: unknown): NotebookSpec => {
    const r = validateSpec(input)
    if (!r.ok)
      throw new ToolError(
        `The content is not valid. Nothing was changed.\n${describeErrors(r.errors)}`,
      )
    return r.spec
  }

  const asOuts = (records: MadeRecord[]): Out[] =>
    records.map((r) => ({
      table: r.table,
      id: r.id,
      value: r.value,
      baseRev: 0,
    }))

  /** A notebook or page Claude may write into: readable, not edit-locked, and not locked without "Allow AI while locked". */
  const writableNotebook = (notebookId: string) => {
    const nb = d.cache.readableNotebook(notebookId)
    if (!nb) throw new ToolError('No such notebook (or Claude may not use it).')
    if (nb.editLocked)
      throw new ToolError('That notebook is locked against edits in the app.')
    if (nb.locked && !nb.allowAiLocked)
      throw new ToolError('That notebook is locked, so Claude may not use it.')
    return nb
  }

  /** Puts the blocks and cards of `made` at the end of an existing page. */
  const intoPage = (made: Made, page: Page, skipHeading: boolean): Out[] => {
    let list = made.records.filter(
      (r) => r.table === 'blocks' || r.table === 'cards',
    )
    if (skipHeading) {
      const head = list.find(
        (r) => r.table === 'blocks' && r.value.parentId === null,
      )
      list = list.filter((r) => r !== head)
    }
    const top = list
      .filter((r) => r.table === 'blocks' && r.value.parentId === null)
      .sort((a, b) => (String(a.value.order) < String(b.value.order) ? -1 : 1))
    const keys = keysAfter(d.cache.lastBlockOrder(page.id), top.length)
    const order = new Map(top.map((r, i) => [r.id, keys[i]]))
    return list.map((r) => ({
      table: r.table,
      id: r.id,
      baseRev: 0,
      value: {
        ...r.value,
        pageId: page.id,
        ...(order.has(r.id) ? { order: order.get(r.id) } : {}),
      },
    }))
  }

  /** The shared tail of append_to_page and add_cards. */
  const appendBlocks = async (
    tool: string,
    pageId: string,
    expectedVersion: string,
    build: (page: Page, at: number) => Out[],
  ) => {
    need('write:append')
    await d.cache.refresh(true)
    const read = d.cache.readPage(pageId)
    if (!read) throw new ToolError('No such page (or Claude may not use it).')
    const page = read.page
    writableNotebook(page.notebookId)
    if (d.cache.editLocked(page))
      throw new ToolError('That page is locked against edits in the app.')
    if (read.version !== expectedVersion)
      throw new ToolError(
        'That page changed since you read it. Nothing was changed. Read it again (read_page) and retry with the new version.',
      )
    const at = now()
    const added = build(page, at)
    if (added.length > CHUNK)
      throw new ToolError(
        `That is too much for one append (${added.length} records, at most ${CHUNK}). Split it into smaller parts.`,
      )
    const raw = d.cache.rawPage(pageId)!
    // 1. Touch the page first, against the revision the version check used.
    //    If someone saved in between, this fails and nothing else is written.
    const [touch] = await seal(
      [
        {
          table: 'pages',
          id: pageId,
          value: { ...raw.value, updatedAt: at },
          baseRev: raw.rev,
          after: raw.h,
        },
      ],
      at,
    )
    const res = await d.source.push([touch])
    if (res.conflicts.length > 0)
      throw new ToolError(
        'That page changed while saving. Nothing was added. Read it again and retry.',
      )
    // 2. Then the new records, all in one call (all or nothing).
    await push(await seal(added, at))
    const blocks = added.filter((o) => o.table === 'blocks').length
    const cards = added.filter((o) => o.table === 'cards').length
    const note = await afterSave(tool, [pageId], { blocks, cards })
    const after = d.cache.readPage(pageId)
    return {
      pageId,
      added: { blocks, cards },
      version: after?.version,
      ...note,
    }
  }

  return {
    create_notebook: (a: { spec: unknown }) =>
      serial(async () => {
        need('write:create')
        const spec = checkSpec(a.spec)
        await d.cache.refresh(true)
        const workspaceId = d.cache.workspaceId()
        if (!workspaceId)
          throw new ToolError(
            'Open Learning Notes once so your notes have synced, then try again.',
          )
        const at = now()
        const made = notebookFromSpec(spec, {
          now: at,
          newId,
          batchId: newId(),
          workspaceId,
          lastNotebookOrder: d.cache.lastNotebookOrder(),
        })
        // A notebook Claude made is one Claude may keep working in.
        const outs = asOuts(made.records).map((o) =>
          o.table === 'notebooks'
            ? { ...o, value: { ...o.value, allowAi: true } }
            : o,
        )
        await push(await seal(outs, at))
        const note = await afterSave(
          'create_notebook',
          [made.notebookId, ...made.pageIds],
          made.counts,
        )
        return {
          notebookId: made.notebookId,
          pageIds: made.pageIds,
          ...made.counts,
          message: `Created "${spec.title}". It appears in Learning Notes after the app next syncs, and can be removed there with "Remove this AI result".`,
          ...note,
        }
      }),

    add_page: (a: {
      notebookId: string
      page: unknown
      parentId?: string
      parentVersion?: string
    }) =>
      serial(async () => {
        need('write:create')
        const spec = checkSpec({
          version: SPEC_VERSION,
          title: 'page',
          pages: [a.page],
        })
        const page: SpecPage = spec.pages[0]
        await d.cache.refresh(true)
        const nb = writableNotebook(a.notebookId)
        const parentId = a.parentId ?? null
        if (parentId) {
          const parent = d.cache.pageIfReadable(parentId)
          if (!parent || parent.notebookId !== a.notebookId)
            throw new ToolError('No such parent page in that notebook.')
        }
        if (a.parentVersion !== undefined) {
          if (!parentId)
            throw new ToolError('"parentVersion" needs a "parentId".')
          if (d.cache.readPage(parentId)?.version !== a.parentVersion)
            throw new ToolError(
              'That page changed since you read it. Nothing was changed. Read it again.',
            )
        }
        const at = now()
        const made = pageIntoNotebook(page, {
          now: at,
          newId,
          batchId: newId(),
          notebookId: a.notebookId,
          parentId,
          lastSiblingOrder: d.cache.lastPageOrder(a.notebookId, parentId),
        })
        await push(await seal(asOuts(made.records), at))
        const note = await afterSave(
          'add_page',
          [a.notebookId, ...made.pageIds],
          made.counts,
        )
        return {
          pageId: made.pageIds[0],
          notebook: nb.title,
          ...made.counts,
          ...note,
        }
      }),

    append_to_page: (a: {
      pageId: string
      markdown: string
      expectedVersion: string
    }) =>
      serial(() =>
        appendBlocks(
          'append_to_page',
          a.pageId,
          a.expectedVersion,
          (page, at) => {
            const blocks = markdownToBlocks(a.markdown)
            if (blocks.length === 0)
              throw new ToolError(
                'There is nothing to add: the Markdown is empty.',
              )
            const spec = checkSpec({
              version: SPEC_VERSION,
              title: 'page',
              pages: [{ title: 'page', blocks }],
            })
            const made = pageIntoNotebook(spec.pages[0], {
              now: at,
              newId,
              batchId: newId(),
              notebookId: page.notebookId,
              parentId: null,
              lastSiblingOrder: null,
            })
            return intoPage(made, page, false)
          },
        ),
      ),

    add_cards: (a: {
      pageId: string
      cards: unknown[]
      expectedVersion: string
    }) =>
      serial(() =>
        appendBlocks('add_cards', a.pageId, a.expectedVersion, (page, at) => {
          // Validated with a stand-in block, then built with none.
          const filler: SpecBlock = { type: 'paragraph', text: 'x' }
          const spec = checkSpec({
            version: SPEC_VERSION,
            title: 'cards',
            pages: [{ title: 'cards', blocks: [filler] }],
            cards: a.cards,
          })
          const made = notebookFromSpec(
            { ...spec, pages: [{ title: 'cards', blocks: [] }] },
            {
              now: at,
              newId,
              batchId: newId(),
              workspaceId: 'unused',
              lastNotebookOrder: null,
            },
          )
          // The notebook and page it made are dropped; only blocks and cards are kept.
          const out = intoPage(
            made,
            page,
            d.cache.hasHeading(page.id, CARDS_HEADING),
          )
          return out.map((o) =>
            o.table === 'cards'
              ? { ...o, value: { ...o.value, notebookId: page.notebookId } }
              : o,
          )
        }),
      ),
  }
}

export type WriteTools = ReturnType<typeof makeWriteTools>
