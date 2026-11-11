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
import {
  cardsIntoPage,
  databaseIntoNotebook,
  edited,
  notebookFromSpec,
  pageIntoNotebook,
  styleFields,
  type MadeRecord,
} from './notesWrite.ts'
import {
  describeErrors,
  SPEC_VERSION,
  TAB_COLOURS,
  validateSpec,
  type NotebookSpec,
  type SpecPage,
  type SpecStyle,
} from './spec.ts'
import { byOrder, plain } from './markdown.ts'
import {
  inboxReasons,
  type InboxReason,
  inboxRecord,
  parseOps,
  planRefine,
  versionRecord,
  type Plan,
} from './refine.ts'

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
  const pages = view.pages(undefined, false)
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
    .pages(notebookId, false)
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
  // Titles are note content too: they go inside the envelope, never beside it.
  const head = json({
    pageId: r.page.id,
    version: r.version,
    blocks: r.blocks,
  })
  const preview = (t: unknown) =>
    plain(t as never)
      .replace(/\s+/g, ' ')
      .slice(0, 60)
  const index = view
    .blocksOfPage(r.page.id)
    .map(
      ({ b }) =>
        `${b.id} ${b.parentId ? '(child of ' + b.parentId + ') ' : ''}${b.type}: ${preview(b.content.text)}`,
    )
    .join('\n')
  const info = `Title: ${r.page.title}\nNotebook: ${view.notebookTitle(r.page.notebookId)}\n\n${markdown}`
  return [
    head + note,
    envelope(`page ${r.page.id}`, info),
    'Block ids (for refine_page):',
    envelope(`blocks ${r.page.id}`, index),
  ].join('\n')
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

interface AuditInfo {
  tool: string
  ids: string[]
  counts: Record<string, number>
}

/** Seals and saves records (all or nothing per chunk), then writes the audit line. */
async function save(
  ctx: ClaudeCtx,
  grant: Grant,
  opened: Opened,
  records: readonly MadeRecord[],
  audit: AuditInfo,
): Promise<void> {
  const now = ctx.now()
  const items: PushItem[] = []
  for (let i = 0; i < records.length; i++) {
    const rec = records[i]
    const baseRev = rec.baseRev ?? 0
    // The clock stamp: time, a counter that keeps this call's records in order, our device id.
    const h = `${String(now).padStart(15, '0')}-${String(i).padStart(6, '0')}-${DEVICE_ID}`
    const env = { f: SYNC_FORMAT_VERSION, h, d: DEVICE_ID, r: rec.value }
    const sealed = await sealRecord(
      opened.master,
      rec.table,
      rec.id,
      baseRev + 1,
      env,
    )
    items.push({
      id: remoteId(rec.table, rec.id),
      baseRev,
      keyId: sealed.keyId,
      data: sealed.data,
    })
  }
  try {
    for (let i = 0; i < items.length; i += CHUNK)
      await ctx.backend.push(grant.userId, items.slice(i, i + CHUNK))
  } catch (e) {
    if (e instanceof PushConflict) throw e
    if (e instanceof StoreError)
      throw new ToolFail('Could not save just now. Nothing was changed.')
    throw e
  }
  // The audit line: what was done, never the content. It must not undo a save.
  await ctx.backend
    .addAudit({
      userId: grant.userId,
      at: now,
      tool: audit.tool,
      clientId: grant.clientId,
      ids: audit.ids.slice(0, 60),
      counts: audit.counts,
    })
    .catch(() => undefined)
}

const CHANGED_MEANWHILE =
  'Something changed while saving. Nothing was changed; try again.'

/** `save`, with a clash reported in plain words. */
async function saveOrSay(
  ctx: ClaudeCtx,
  grant: Grant,
  opened: Opened,
  records: readonly MadeRecord[],
  audit: AuditInfo,
): Promise<void> {
  try {
    await save(ctx, grant, opened, records, audit)
  } catch (e) {
    if (e instanceof PushConflict) throw new ToolFail(CHANGED_MEANWHILE)
    throw e
  }
}

function checkSpec(input: unknown): NotebookSpec {
  const r = validateSpec(input)
  if (!r.ok)
    throw new ToolFail(
      `The notebook spec is not valid. Nothing was changed.\n${describeErrors(r.errors)}`,
    )
  return r.spec
}

/** A one-page spec around parts of a call, so the spec rules and error paths apply to them. */
const wrapSpec = (extra: Record<string, unknown>) =>
  checkSpec({
    version: SPEC_VERSION,
    title: 'Notebook',
    pages: [{ title: 'Page', blocks: [] }],
    ...extra,
  })

/** The notebook, ready for Claude to write in: shared, and not locked against edits. */
function writableNotebook(view: NotesView, notebookId: string) {
  const nb = view.notebook(notebookId)
  if (!nb)
    throw new ToolFail('No such notebook (or it is not shared with Claude).')
  if (nb.editLocked)
    throw new ToolFail('That notebook is locked against edits in the app.')
  return nb
}

/** A page Claude may edit: readable, in a writable notebook, not locked against edits. */
function writablePage(view: NotesView, pageId: string) {
  const page = view.pageIfReadable(pageId)
  if (!page)
    throw new ToolFail('No such page (or it is not shared with Claude).')
  writableNotebook(view, page.notebookId)
  if (page.editLocked)
    throw new ToolFail('That page is locked against edits in the app.')
  return page
}

async function checkVersion(
  view: NotesView,
  pageId: string,
  expected: unknown,
) {
  if (expected === undefined) return
  if (typeof expected !== 'string')
    throw new ToolFail('The version must be the text from read.')
  if ((await view.readPage(pageId))?.version !== expected)
    throw new ToolFail(
      'That page changed since you read it. Nothing was changed. Read it again.',
    )
}

const sortedTop = (view: NotesView, pageId: string) =>
  view
    .blocksOfPage(pageId)
    .map((x) => x.b)
    .filter((b) => b.parentId === null)
    .sort(byOrder)

const asCounts = (c: object) => c as Record<string, number>

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
    lastDatabaseOrder: view.lastDatabaseOrder(),
  })
  await saveOrSay(ctx, grant, opened, made.records, {
    tool: 'create_notebook',
    ids: [made.notebookId, ...made.pageIds],
    counts: asCounts(made.counts),
  })
  // A notebook Claude made is Claude's to keep working in: add it to the person's choice.
  if (opened.scope)
    await ctx.backend
      .setEscrowScope(grant.userId, [...opened.scope, made.notebookId])
      .catch(() => undefined)
  const extra = made.counts.databases
    ? `, ${made.counts.databases} databases with ${made.counts.rows} rows`
    : ''
  return `Created the notebook "${spec.title}" (id ${made.notebookId}) with ${made.counts.pages} pages, ${made.counts.blocks} blocks and ${made.counts.cards} recall cards${extra}. It appears in Learning Notes after the app next syncs. It can be removed in the app with "Remove this AI result".`
}

export async function addPage(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const notebookId = idArg(a, 'notebookId')
  const parentId = a.parentId === undefined ? null : idArg(a, 'parentId')
  // Validate as a one-page spec so the same rules and error paths apply.
  const spec = checkSpec({
    version: SPEC_VERSION,
    title: 'page',
    pages: [a.page],
  })
  const page: SpecPage = spec.pages[0]
  const { opened, view } = await open(ctx, grant)
  writableNotebook(view, notebookId)
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
    await checkVersion(view, parentId, expected)
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
  await saveOrSay(ctx, grant, opened, made.records, {
    tool: 'add_page',
    ids: [made.notebookId, ...made.pageIds],
    counts: asCounts(made.counts),
  })
  return `Added the page "${page.title}" (id ${made.pageIds[0]}) with ${made.counts.blocks} blocks to notebook ${notebookId}. It appears in Learning Notes after the app next syncs.`
}

// ---------- slice 6 ----------

export async function addCards(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const pageId = idArg(a, 'pageId')
  if (
    Array.isArray(a.cards) &&
    a.cards.some((c) => c && typeof c === 'object' && 'page' in c)
  )
    throw new ToolFail(
      'Do not set "page" on cards here; the cards go on the page given by pageId.',
    )
  const cards = wrapSpec({ cards: a.cards }).cards ?? []
  if (cards.length === 0) throw new ToolFail('Give at least one card.')
  const { opened, view } = await open(ctx, grant)
  const page = writablePage(view, pageId)
  await checkVersion(view, pageId, a.pageVersion)
  const top = sortedTop(view, pageId)
  const made = cardsIntoPage(cards, {
    now: ctx.now(),
    newId: () => crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    notebookId: page.notebookId,
    pageId,
    pageTitle: page.title,
    lastBlockOrder: top.at(-1)?.order ?? null,
    hasHeading: top.some(
      (b) => b.type === 'heading' && plain(b.content.text) === 'Recall cards',
    ),
  })
  await saveOrSay(ctx, grant, opened, made.records, {
    tool: 'add_cards',
    ids: [page.notebookId, pageId],
    counts: asCounts(made.counts),
  })
  return `Added ${made.counts.cards} recall cards at the end of the page (${made.counts.blocks} blocks). They appear in Learning Notes after the app next syncs and can be removed with "Remove this AI result".`
}

export async function createDatabase(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const notebookId = idArg(a, 'notebookId')
  const pageId = a.pageId === undefined ? undefined : idArg(a, 'pageId')
  const db = wrapSpec({ databases: [a.database] }).databases![0]
  const { opened, view } = await open(ctx, grant)
  writableNotebook(view, notebookId)
  const workspaceId = view.workspaceId()
  if (!workspaceId)
    throw new ToolFail(
      'Open Learning Notes once so your notes have synced, then try again.',
    )
  let page
  if (pageId) {
    const p = writablePage(view, pageId)
    if (p.notebookId !== notebookId)
      throw new ToolFail('That page is not in that notebook.')
    page = {
      id: pageId,
      title: p.title,
      lastBlockOrder: sortedTop(view, pageId).at(-1)?.order ?? null,
    }
  }
  const made = databaseIntoNotebook(db, {
    now: ctx.now(),
    newId: () => crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    workspaceId,
    notebookId,
    lastOrder: view.lastDatabaseOrder(),
    page,
  })
  await saveOrSay(ctx, grant, opened, made.records, {
    tool: 'create_database',
    ids: [notebookId, ...made.pageIds, made.databaseId],
    counts: asCounts(made.counts),
  })
  return `Created the database "${db.title}" (id ${made.databaseId}) with ${db.columns.length} columns and ${db.rows.length} rows${page ? ', shown at the end of the page' : ''}. It appears in Learning Notes after the app next syncs.`
}

export async function applyStyle(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const notebookId = idArg(a, 'notebookId')
  const pageId = a.pageId === undefined ? undefined : idArg(a, 'pageId')
  const style: SpecStyle =
    a.style === undefined ? {} : (wrapSpec({ style: a.style }).style ?? {})
  let tabColour: string | undefined
  if (a.tabColour !== undefined) {
    if (!pageId || !(TAB_COLOURS as readonly unknown[]).includes(a.tabColour))
      throw new ToolFail(
        `"tabColour" needs a pageId and one of: ${TAB_COLOURS.join(', ')}.`,
      )
    tabColour = a.tabColour as string
  }
  const f = styleFields(style)
  if (pageId && Object.keys(f.notebook).length)
    throw new ToolFail(
      'With a pageId only sheet, inkBg and tabColour apply; colour, view and pathStyle change the whole notebook.',
    )
  if (
    Object.keys(f.notebook).length + Object.keys(f.page).length === 0 &&
    !tabColour
  )
    throw new ToolFail('Give a "style" (and/or a "tabColour" with a pageId).')
  const { opened, view } = await open(ctx, grant)
  writableNotebook(view, notebookId)
  const now = ctx.now()
  const records: MadeRecord[] = []
  const differs = (
    value: Record<string, unknown>,
    c: Record<string, unknown>,
  ) => Object.entries(c).some(([k, v]) => value[k] !== v)
  const held = view.loaded.tables.notebooks.get(notebookId)!
  if (
    Object.keys(f.notebook).length &&
    differs(held.value as Record<string, unknown>, f.notebook)
  )
    records.push(
      edited(
        'notebooks',
        held.value as Record<string, unknown>,
        held.rev,
        f.notebook,
        now,
      ),
    )
  const pageChanges = { ...f.page, ...(tabColour ? { tabColour } : {}) }
  if (Object.keys(pageChanges).length) {
    const targets = pageId
      ? [writablePage(view, pageId).id]
      : view
          .pages(notebookId, false)
          .filter((p) => !p.editLocked)
          .map((p) => p.id)
          .slice(0, 500)
    for (const id of targets) {
      const h = view.pageWithRev(id)
      if (
        h &&
        differs(h.page as unknown as Record<string, unknown>, pageChanges)
      )
        records.push(
          edited(
            'pages',
            h.page as unknown as Record<string, unknown>,
            h.rev,
            pageChanges,
            now,
          ),
        )
    }
  }
  if (records.length === 0)
    return 'Nothing to change: it already looks like that.'
  await saveOrSay(ctx, grant, opened, records, {
    tool: 'apply_style',
    ids: [notebookId, ...(pageId ? [pageId] : [])],
    counts: {
      notebooks: records.filter((r) => r.table === 'notebooks').length,
      pages: records.filter((r) => r.table === 'pages').length,
    },
  })
  return `Changed the look: ${records.length} record(s) updated. It appears in Learning Notes after the app next syncs.`
}

// ---------- slice 7: refine_page ----------

const describePlan = (plan: Plan) =>
  `${plan.added} new and ${plan.replaced} replaced block(s)`

export async function refinePage(ctx: ClaudeCtx, a: Args, grant: Grant) {
  const pageId = idArg(a, 'pageId')
  const baseRevision = a.baseRevision
  if (
    typeof baseRevision !== 'string' ||
    baseRevision.length === 0 ||
    baseRevision.length > 64
  )
    throw new ToolFail(
      'Give "baseRevision": the version from read of this page.',
    )
  const ops = parseOps(a.ops)
  const { opened, view } = await open(ctx, grant)
  const page = writablePage(view, pageId)
  const current = await view.readPage(pageId)
  if (!current)
    throw new ToolFail('No such page (or it is not shared with Claude).')
  const blocks = view.blocksOfPage(pageId)
  const now = ctx.now()
  const batchId = crypto.randomUUID()
  const newId = () => crypto.randomUUID()
  const plan = planRefine({
    ops,
    blocks,
    cardBlocks: view.blocksWithCards(pageId),
    notebookId: page.notebookId,
    pageId,
    pageTitle: page.title,
    opts: { now, newId, batchId },
  })
  const counts = {
    blocks: plan.added,
    replaced: plan.replaced,
    added: plan.added,
  }
  const toInbox = async (reasons: InboxReason[]) => {
    try {
      await save(
        ctx,
        grant,
        opened,
        [
          inboxRecord({
            id: newId(),
            now,
            pageId,
            notebookId: page.notebookId,
            pageTitle: page.title,
            baseRevision,
            reasons,
            plan,
            batchId,
          }),
        ],
        {
          tool: 'refine_page',
          ids: [page.notebookId, pageId],
          counts: { ...counts, inbox: 1 },
        },
      )
    } catch (e) {
      if (e instanceof PushConflict || e instanceof StoreError)
        throw new ToolFail('Could not save just now. Nothing was changed.')
      throw e
    }
    const why = reasons
      .map((r) =>
        r === 'big'
          ? 'it changes more than 30% of the page'
          : r === 'cards'
            ? 'it touches recall cards'
            : 'the page changed after you read it',
      )
      .join(' and ')
    return `NOT applied yet: ${why}. ${describePlan(plan)} wait in the person's Inbox (Learning Notes > Settings > Claude > Inbox) for Accept or Reject. Tell the person to check it. Read the page again before proposing more.`
  }
  const reasons = inboxReasons(plan, baseRevision !== current.version)
  if (reasons.length) return toInbox(reasons)

  // Small, no cards, page as Claude read it: apply now. The page as it was is
  // saved first (in the same all-or-nothing save), so History can bring it back.
  const held = view.pageWithRev(pageId)!
  const pageValue = held.page as unknown as Record<string, unknown>
  const records: MadeRecord[] = [
    versionRecord({
      id: newId(),
      now,
      page: pageValue,
      blocks: blocks.map((x) => x.b),
    }),
    ...plan.records,
    edited('pages', pageValue, held.rev, {}, now),
  ]
  try {
    await save(ctx, grant, opened, records, {
      tool: 'refine_page',
      ids: [page.notebookId, pageId],
      counts,
    })
  } catch (e) {
    // The page changed between the read and the save: never overwrite; ask the person.
    if (e instanceof PushConflict) return toInbox(['conflict'])
    throw e
  }
  return `Applied ${describePlan(plan)}. The page as it was before is saved in its History. It appears in Learning Notes after the app next syncs. Read the page again before changing it more.`
}
