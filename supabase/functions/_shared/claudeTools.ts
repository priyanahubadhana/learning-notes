/**
 * The tools of the online connector that touch notes (plan B, slices 4-5):
 * search, read, list_notebooks, list_pages, list_cards (read) and
 * create_notebook, add_page (write). Each takes the already-checked grant and
 * returns plain text for Claude; failures are `ToolFail` with a safe message
 * (never note text, never keys).
 *
 * Every call opens the escrow key in memory, does its work and drops it.
 * Writes: validated with spec.ts, saved as sealed records by the device id
 * `claude-remote` with a hybrid-logical-clock stamp, new ids only (must be
 * new), all or nothing per chunk, then one audit line (tool, ids, counts, no
 * content).
 */
import { remoteId, sealRecord } from './e2e.ts'
import { PushConflict, StoreError, type PushItem } from './claudeStore.ts'
import { openEscrow, ToolFail, type ClaudeCtx, type Opened } from './escrow.ts'
import type { Grant } from './oauth.ts'
import {
  MAX_PAGE_CHARS,
  NotesView,
  envelope,
  iso,
  loadNotes,
} from './notesRead.ts'
import { notebookFromSpec, pageIntoNotebook, type Made } from './notesWrite.ts'
import {
  describeErrors,
  validateSpec,
  type NotebookSpec,
  type SpecPage,
} from './spec.ts'
import { byOrder } from './markdown.ts'

type Args = Record<string, unknown>
export const DEVICE_ID = 'claude-remote'
const SYNC_FORMAT_VERSION = 1
const CHUNK = 1000

const clamp = (n: unknown, def: number, max: number) =>
  Math.min(Math.max(Math.floor(typeof n === 'number' ? n : def), 1), max)
const idArg = (a: Args, key: string): string => {
  const v = a[key]
  if (typeof v !== 'string' || v.length === 0 || v.length > 64)
    throw new ToolFail(`Give a valid "${key}".`)
  return v
}

async function open(ctx: ClaudeCtx, grant: Grant) {
  const opened = await openEscrow(ctx, grant.userId)
  let loaded
  try {
    loaded = await loadNotes(ctx.backend, grant.userId, opened.master)
  } catch (e) {
    if (e instanceof ToolFail) throw e
    throw new ToolFail('Could not reach your notes just now. Try again.')
  }
  return { opened, view: new NotesView(loaded, opened.scope) }
}

const json = (v: unknown) => JSON.stringify(v, null, 1)

// ---------- read tools ----------

export async function listNotebooks(ctx: ClaudeCtx, _a: Args, grant: Grant) {
  const { view } = await open(ctx, grant)
  const pages = view.pages()
  const hidden = view.hiddenNotebookCount()
  const out = {
    notebooks: view.notebooks().map((n) => ({
      id: n.id,
      title: n.title,
      kind: n.kind ?? 'notebook',
      pageCount: pages.filter((p) => p.notebookId === n.id).length,
    })),
    ...(hidden > 0
      ? {
          note: `${hidden} notebook(s) are not shared with Claude (Settings > Claude in the app).`,
        }
      : {}),
  }
  return envelope('notebooks', json(out))
}

export async function listPages(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const notebookId = idArg(a, 'notebookId')
  const { view } = await open(ctx, grant)
  if (!view.notebook(notebookId))
    throw new ToolFail('No such notebook (or it is not shared with Claude).')
  const parent = a.parentId
  const pages = view
    .pages(notebookId)
    .filter((p) =>
      parent === undefined || parent === null ? true : p.parentId === parent,
    )
    .slice(0, 500)
    .map((p) => ({
      id: p.id,
      title: p.title,
      parentId: p.parentId,
      updatedAt: p.updatedAt ? iso(p.updatedAt) : null,
    }))
  return envelope('pages', json({ pages }))
}

export async function search(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const query = a.query
  if (typeof query !== 'string' || query.trim().length === 0)
    throw new ToolFail('Give some words to search.')
  const { view } = await open(ctx, grant)
  const results = view.search(query.slice(0, 200), clamp(a.limit, 10, 50))
  return envelope('search results', json({ results }))
}

export async function read(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const pageId = idArg(a, 'pageId')
  const { view } = await open(ctx, grant)
  const r = await view.readPage(pageId)
  if (!r) throw new ToolFail('No such page (or it is not shared with Claude).')
  let markdown = r.markdown
  let note = ''
  if (markdown.length > MAX_PAGE_CHARS) {
    markdown = markdown.slice(0, MAX_PAGE_CHARS)
    note = `\n(The page is longer; only the first ${MAX_PAGE_CHARS} characters are shown.)`
  }
  const head = json({
    pageId: r.page.id,
    title: r.page.title,
    notebook: view.notebookTitle(r.page.notebookId),
    version: r.version,
    blocks: r.blocks,
  })
  return `${head}${note}\n${envelope(`page ${r.page.id}`, markdown)}`
}

export async function listCards(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const pageId = a.pageId === undefined ? undefined : idArg(a, 'pageId')
  const notebookId =
    a.notebookId === undefined ? undefined : idArg(a, 'notebookId')
  const { view } = await open(ctx, grant)
  const all = view.cards({ pageId, notebookId })
  const limit = clamp(a.limit, 50, 200)
  return envelope(
    'cards',
    json({
      total: all.length,
      cards: all.slice(0, limit).map((c) => ({
        id: c.id,
        pageId: c.pageId,
        page: c.pageTitle,
        question: c.front,
        answer: c.back,
        due: iso(c.due),
        reviews: c.reps,
        lapses: c.lapses,
        suspended: c.suspended,
      })),
    }),
  )
}

// ---------- write tools ----------

async function save(
  ctx: ClaudeCtx,
  grant: Grant,
  opened: Opened,
  made: Made,
  tool: string,
): Promise<void> {
  const now = ctx.now()
  const items: PushItem[] = []
  for (let i = 0; i < made.records.length; i++) {
    const rec = made.records[i]
    // The clock stamp: time, a counter that keeps this call's records in order, our device id.
    const h = `${String(now).padStart(15, '0')}-${String(i).padStart(6, '0')}-${DEVICE_ID}`
    const env = { f: SYNC_FORMAT_VERSION, h, d: DEVICE_ID, r: rec.value }
    const sealed = await sealRecord(opened.master, rec.table, rec.id, 1, env)
    items.push({
      id: remoteId(rec.table, rec.id),
      baseRev: 0,
      keyId: sealed.keyId,
      data: sealed.data,
    })
  }
  try {
    for (let i = 0; i < items.length; i += CHUNK)
      await ctx.backend.push(grant.userId, items.slice(i, i + CHUNK))
  } catch (e) {
    if (e instanceof PushConflict)
      throw new ToolFail(
        'Something changed while saving. Nothing was changed; try again.',
      )
    if (e instanceof StoreError)
      throw new ToolFail('Could not save just now. Nothing was changed.')
    throw e
  }
  // The audit line: what was done, never the content. It must not undo a save.
  await ctx.backend
    .addAudit({
      userId: grant.userId,
      at: now,
      tool,
      clientId: grant.clientId,
      ids: [made.notebookId, ...made.pageIds].slice(0, 60),
      counts: made.counts,
    })
    .catch(() => undefined)
}

function checkSpec(input: unknown): NotebookSpec {
  const r = validateSpec(input)
  if (!r.ok)
    throw new ToolFail(
      `The notebook spec is not valid. Nothing was changed.\n${describeErrors(r.errors)}`,
    )
  return r.spec
}

export async function createNotebook(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const spec = checkSpec(a.spec)
  const { opened, view } = await open(ctx, grant)
  const workspaceId = view.workspaceId()
  if (!workspaceId)
    throw new ToolFail(
      'Open Learning Notes once so your notes have synced, then try again.',
    )
  const lastOrder =
    [...view.loaded.tables.notebooks.values()]
      .map(
        (h) =>
          h.value as { order: string; id: string; deletedAt?: number | null },
      )
      .filter((n) => !n.deletedAt)
      .sort(byOrder)
      .at(-1)?.order ?? null
  const made = notebookFromSpec(spec, {
    now: ctx.now(),
    newId: () => crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    workspaceId,
    lastNotebookOrder: lastOrder,
  })
  await save(ctx, grant, opened, made, 'create_notebook')
  // A notebook Claude made is Claude's to keep working in: add it to the person's choice.
  if (opened.scope)
    await ctx.backend
      .setEscrowScope(grant.userId, [...opened.scope, made.notebookId])
      .catch(() => undefined)
  return `Created the notebook "${spec.title}" (id ${made.notebookId}) with ${made.counts.pages} pages, ${made.counts.blocks} blocks and ${made.counts.cards} recall cards. It appears in Learning Notes after the app next syncs. It can be removed in the app with "Remove this AI result".`
}

export async function addPage(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const notebookId = idArg(a, 'notebookId')
  const parentId = a.parentId === undefined ? null : idArg(a, 'parentId')
  // Validate as a one-page spec so the same rules and error paths apply.
  const spec = checkSpec({
    version: 'ln-spec/1',
    title: 'page',
    pages: [a.page],
  })
  const page: SpecPage = spec.pages[0]
  const { opened, view } = await open(ctx, grant)
  const nb = view.notebook(notebookId)
  if (!nb)
    throw new ToolFail('No such notebook (or it is not shared with Claude).')
  if ((nb as { editLocked?: boolean }).editLocked)
    throw new ToolFail('That notebook is locked against edits in the app.')
  if (parentId && view.pageIfReadable(parentId)?.notebookId !== notebookId)
    throw new ToolFail('No such parent page in that notebook.')
  // The version check: if Claude read the parent page first and passes its
  // `version`, the page must not have changed since (someone may be editing).
  const expected = a.parentVersion
  if (expected !== undefined) {
    if (typeof expected !== 'string' || !parentId)
      throw new ToolFail(
        '"parentVersion" needs a "parentId" and a version from read.',
      )
    if ((await view.readPage(parentId))?.version !== expected)
      throw new ToolFail(
        'That page changed since you read it. Nothing was changed. Read it again.',
      )
  }
  // After EVERY sibling, including locked or removed ones Claude cannot see, so
  // the new page never lands between pages the person has hidden.
  const siblings = [...view.loaded.tables.pages.values()]
    .map(
      (h) =>
        h.value as {
          notebookId: string
          parentId: string | null
          order: string
          id: string
        },
    )
    .filter((p) => p.notebookId === notebookId && p.parentId === parentId)
    .sort(byOrder)
  const made = pageIntoNotebook(page, {
    now: ctx.now(),
    newId: () => crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    notebookId,
    parentId,
    lastSiblingOrder: siblings.at(-1)?.order ?? null,
  })
  await save(ctx, grant, opened, made, 'add_page')
  return `Added the page "${page.title}" (id ${made.pageIds[0]}) with ${made.counts.blocks} blocks to "${nb.title}". It appears in Learning Notes after the app next syncs.`
}
