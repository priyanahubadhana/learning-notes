// GENERATED from supabase/functions/_shared/notesWrite.ts by scripts/sync-mcp-write.mjs. Do not edit here.
/**
 * Turns a notebook spec (src/connector/spec.ts, validated first) into the
 * app's own records: notebook, pages, blocks and recall cards, in the same
 * shapes the app stores (src/core/types.ts). Pure: no network, no clock of
 * its own, so the Node tests can check every field.
 *
 * Everything Claude makes is marked `source: 'ai'` with one `batchId`, so the
 * app's "Remove this AI result" can take a whole creation away in one step.
 * There is no delete here, and no way to touch an existing record: new ids
 * only, saved with "must be new" (see PushItem.baseRev = 0).
 *
 * Not supported yet (the call is refused with a plain message, nothing is
 * written): mind maps, databases and database blocks (slice 6).
 */
import { stableId } from '../../../src/core/ids'
import { ToolError as ToolFail } from '../tools'
import type {
  NotebookSpec,
  SpecBlock,
  SpecPage,
} from '../../../src/connector/spec'
import type { Notebook } from '../model'

type Rec = Record<string, unknown>
export interface MadeRecord {
  table: 'notebooks' | 'pages' | 'blocks' | 'cards'
  id: string
  value: Rec
}
export interface Made {
  /** In the order they must be saved: blocks and cards first, the page or notebook last. */
  records: MadeRecord[]
  notebookId: string
  pageIds: string[]
  counts: { pages: number; blocks: number; cards: number }
}
export interface MakeOptions {
  now: number
  newId: () => string
  /** One id for everything made in this call (the "AI result"). */
  batchId: string
}

// ---- order keys (fractional indexing, as src/core/order.ts) ----

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** The i-th key of an increasing run, valid for the app's fractional-indexing library. */
export function orderKey(i: number): string {
  if (i < 62) return 'a' + DIGITS[i]
  const j = i - 62
  if (j < 62 * 62) return 'b' + DIGITS[Math.floor(j / 62)] + DIGITS[j % 62]
  const k = j - 62 * 62
  if (k < 62 ** 3)
    return (
      'c' +
      DIGITS[Math.floor(k / 3844)] +
      DIGITS[Math.floor(k / 62) % 62] +
      DIGITS[k % 62]
    )
  throw new ToolFail('Too many items in one place.')
}

/**
 * A key that sorts after `last` (a sibling's key) and never ends in "0".
 * Two random digits make a clash with another device unlikely.
 */
export function orderAfter(last: string | null): string {
  if (last === null) return orderKey(0)
  const pick = crypto.getRandomValues(new Uint8Array(2))
  return last + 'V' + DIGITS[1 + (pick[0] % 61)] + DIGITS[1 + (pick[1] % 61)]
}

// ---- inline Markdown -> the editor's rich-text runs (as src/editor/textBlocks.ts inlineRuns) ----

type Run = Rec
const run = (text: string, styles: Rec = {}): Run => ({
  type: 'text',
  text,
  styles,
})
const isHttps = (u: string) => {
  try {
    return new URL(u).protocol === 'https:'
  } catch {
    return false
  }
}

/** **bold**, __bold__, *italic*, `code`, [text](https://link). Nothing else is read as markup. */
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = []
  const pattern =
    /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0
    if (at > last) runs.push(run(text.slice(last, at)))
    if (m[1] ?? m[2]) runs.push(run(m[1] ?? m[2], { bold: true }))
    else if (m[3]) runs.push(run(m[3], { italic: true }))
    else if (m[4]) runs.push(run(m[4], { code: true }))
    else if (m[5] && isHttps(m[6])) {
      runs.push({ type: 'link', href: m[6], content: [run(m[5])] })
    } else runs.push(run(m[0]))
    last = at + m[0].length
  }
  if (last < text.length) runs.push(run(text.slice(last)))
  return runs
}

/** "The {{heart}} pumps" -> runs with the hidden word styled as a blank. */
function clozeRuns(
  text: string,
  newId: () => string,
): { runs: Run[]; blanks: string[] } {
  const runs: Run[] = []
  const blanks: string[] = []
  let last = 0
  for (const m of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
    const at = m.index ?? 0
    if (at > last) runs.push(...inlineRuns(text.slice(last, at)))
    const id = newId()
    blanks.push(id)
    runs.push(run(m[1], { blank: id }))
    last = at + m[0].length
  }
  if (last < text.length) runs.push(...inlineRuns(text.slice(last)))
  return { runs, blanks }
}

// ---- building ----

const norm = (s: string): string => s.trim().toLocaleLowerCase()
const baseFields = (id: string, now: number) => ({
  id,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
})

/** What the spec asks for that the online connector cannot make yet. */
export function unsupported(spec: NotebookSpec): string[] {
  const out: string[] = []
  if (spec.databases?.length)
    out.push('databases (use create_database later; not available yet)')
  const bad = new Set<string>()
  const visit = (blocks: readonly SpecBlock[]) => {
    for (const b of blocks) {
      if (b.type === 'mindMap' || b.type === 'database') bad.add(b.type)
      if (b.children) visit(b.children)
    }
  }
  for (const p of spec.pages) visit(p.blocks)
  for (const t of bad)
    out.push(`${t} blocks (not available yet; use a bulleted list instead)`)
  return out
}

interface PageCtx extends MakeOptions {
  notebookId: string
  pageId: string
  /** page title (normalised) -> page id, for page links. */
  pageIds: Map<string, string>
  records: MadeRecord[]
  counts: { pages: number; blocks: number; cards: number }
}

function contentFor(b: SpecBlock, c: PageCtx): Rec {
  const text = () => inlineRuns(b.text ?? '')
  switch (b.type) {
    case 'paragraph':
    case 'bulletListItem':
    case 'numberedListItem':
    case 'quote':
    case 'toggleListItem':
    case 'card':
      return { text: text() }
    case 'heading':
      return { level: b.level ?? 1, text: text() }
    case 'checkListItem':
      return { checked: b.checked ?? false, text: text() }
    case 'divider':
      return {}
    case 'codeBlock':
      // Code is literal: no Markdown, line breaks kept.
      return {
        language: b.language ?? 'plaintext',
        text: b.text ? [run(b.text)] : [],
      }
    case 'callout':
      return { emoji: b.emoji ?? '💡', text: text() }
    case 'table':
      return {
        text: {
          type: 'tableContent',
          rows: (b.rows ?? []).map((cells) => ({
            cells: cells.map((cell) => inlineRuns(cell)),
          })),
        },
      }
    case 'math':
      return { latex: b.latex ?? '' }
    case 'embed':
      return {
        url: b.url ?? '',
        provider: 'link',
        videoId: '',
        start: 0,
        caption: b.caption ?? '',
      }
    case 'pageLink':
      return { pageId: c.pageIds.get(norm(b.page ?? '')) ?? '' }
    default:
      // mindMap and database are refused before we get here.
      throw new ToolFail(`The block type "${b.type}" is not available yet.`)
  }
}

/** Adds blocks (and their children) as records; returns the ids of the top-level ones. */
function addBlocks(
  c: PageCtx,
  list: readonly SpecBlock[],
  parentId: string | null,
): void {
  list.forEach((b, i) => {
    const id = c.newId()
    c.records.push({
      table: 'blocks',
      id,
      value: {
        ...baseFields(id, c.now),
        pageId: c.pageId,
        parentId,
        type: b.type,
        content: contentFor(b, c),
        order: orderKey(i),
        source: 'ai',
        batchId: c.batchId,
      },
    })
    c.counts.blocks++
    if (b.type === 'card') addCardRecord(c, id, 'main')
    if (b.children?.length) addBlocks(c, b.children, id)
  })
}

function addCardRecord(c: PageCtx, blockId: string, part: string): void {
  const id = stableId(`card:${blockId}/${part}`)
  c.records.push({
    table: 'cards',
    id,
    value: {
      ...baseFields(id, c.now),
      blockId,
      part,
      pageId: c.pageId,
      notebookId: c.notebookId,
      due: c.now,
      intervalDays: 0,
      step: 0,
      reps: 0,
      lapses: 0,
      suspendedAt: null,
    },
  })
  c.counts.cards++
}

interface Style {
  inkBg?: string
  sheet?: string
}

function pageRecord(
  page: SpecPage,
  id: string,
  o: {
    notebookId: string
    parentId: string | null
    order: string
    now: number
    style?: Style
  },
): MadeRecord {
  return {
    table: 'pages',
    id,
    value: {
      ...baseFields(id, o.now),
      notebookId: o.notebookId,
      parentId: o.parentId,
      title: page.title,
      order: o.order,
      ...(page.summary ? { summary: page.summary } : {}),
      ...(page.tabColour ? { tabColour: page.tabColour } : {}),
      ...(o.style?.inkBg ? { inkBg: o.style.inkBg } : {}),
      ...(o.style?.sheet ? { sheet: o.style.sheet } : {}),
    },
  }
}

/** Everything a validated notebook spec makes. `opts.workspaceId` is the person's workspace. */
export function notebookFromSpec(
  spec: NotebookSpec,
  opts: MakeOptions & {
    workspaceId: string
    lastNotebookOrder: string | null
  },
): Made {
  const why = unsupported(spec)
  if (why.length)
    throw new ToolFail(
      `This notebook asks for things the online connector cannot make yet: ${why.join('; ')}. Nothing was changed. Remove them and try again.`,
    )
  const notebookId = opts.newId()
  const records: MadeRecord[] = []
  const counts = { pages: 0, blocks: 0, cards: 0 }
  const pageIds = new Map<string, string>()
  const ids = spec.pages.map((p) => {
    const id = opts.newId()
    pageIds.set(norm(p.title), id)
    return id
  })
  const style = spec.style
  const pagesOut: MadeRecord[] = []
  spec.pages.forEach((page, i) => {
    const c: PageCtx = {
      ...opts,
      notebookId,
      pageId: ids[i],
      pageIds,
      records,
      counts,
    }
    const blocks: SpecBlock[] = [...page.blocks]
    if (i === 0 && spec.summary)
      blocks.unshift({ type: 'callout', emoji: '📝', text: spec.summary })
    // Recall cards the spec lists for this page (or, with no page named, the first).
    const mine = (spec.cards ?? []).filter((card) =>
      card.page ? norm(card.page) === norm(page.title) : i === 0,
    )
    addBlocks(c, blocks, null)
    if (mine.length) {
      const startAt = blocks.length
      const headId = opts.newId()
      records.push({
        table: 'blocks',
        id: headId,
        value: {
          ...baseFields(headId, opts.now),
          pageId: c.pageId,
          parentId: null,
          type: 'heading',
          content: { level: 2, text: [run('Recall cards')] },
          order: orderKey(startAt),
          source: 'ai',
          batchId: opts.batchId,
        },
      })
      counts.blocks++
      mine.forEach((card, j) => {
        const id = opts.newId()
        const order = orderKey(startAt + 1 + j)
        if (card.kind === 'qa') {
          records.push({
            table: 'blocks',
            id,
            value: {
              ...baseFields(id, opts.now),
              pageId: c.pageId,
              parentId: null,
              type: 'card',
              content: { text: inlineRuns(card.q) },
              order,
              source: 'ai',
              batchId: opts.batchId,
            },
          })
          counts.blocks++
          addCardRecord(c, id, 'main')
          const ans = opts.newId()
          records.push({
            table: 'blocks',
            id: ans,
            value: {
              ...baseFields(ans, opts.now),
              pageId: c.pageId,
              parentId: id,
              type: 'paragraph',
              content: { text: inlineRuns(card.a) },
              order: orderKey(0),
              source: 'ai',
              batchId: opts.batchId,
            },
          })
          counts.blocks++
        } else {
          const { runs, blanks } = clozeRuns(card.text, opts.newId)
          records.push({
            table: 'blocks',
            id,
            value: {
              ...baseFields(id, opts.now),
              pageId: c.pageId,
              parentId: null,
              type: 'paragraph',
              content: { text: runs },
              order,
              source: 'ai',
              batchId: opts.batchId,
            },
          })
          counts.blocks++
          for (const part of blanks) addCardRecord(c, id, part)
        }
      })
    }
    pagesOut.push(
      pageRecord(page, ids[i], {
        notebookId,
        parentId: null,
        order: orderKey(i),
        now: opts.now,
        style,
      }),
    )
    counts.pages++
  })
  // Saved in this order: the notebook comes last, so a save that stops half
  // way leaves only records no notebook points to (invisible), never a
  // notebook with holes.
  records.push(...pagesOut)
  const nb: Notebook & Rec = {
    ...baseFields(notebookId, opts.now),
    workspaceId: opts.workspaceId,
    title: spec.title,
    order: orderAfter(opts.lastNotebookOrder),
    tabs: defaultTabs(notebookId),
    ...(style?.colour ? { colour: style.colour } : {}),
    ...(style?.view ? { view: style.view } : {}),
    ...(style?.pathStyle ? { pathStyle: style.pathStyle } : {}),
  } as unknown as Notebook & Rec
  records.push({ table: 'notebooks', id: notebookId, value: nb as Rec })
  return { records, notebookId, pageIds: ids, counts }
}

/** The default tabs of a normal notebook (src/databases/notebookTabs.ts `defaultNotebookTabs`). */
export function defaultTabs(notebookId: string) {
  return [
    { id: 'notes', kind: 'notes' },
    { id: 'summary', kind: 'summary' },
    { id: 'database', kind: 'database', databaseId: `tracker:${notebookId}` },
    { id: 'cards', kind: 'cards' },
    { id: 'revise', kind: 'revise' },
  ]
}

/** One page for an existing notebook (a validated one-page spec). */
export function pageIntoNotebook(
  page: SpecPage,
  opts: MakeOptions & {
    notebookId: string
    parentId: string | null
    lastSiblingOrder: string | null
    style?: Style
  },
): Made {
  const spec = {
    version: 'ln-spec/1',
    title: 'page',
    pages: [page],
  } as NotebookSpec
  const why = unsupported(spec)
  if (why.length)
    throw new ToolFail(
      `This page asks for things the online connector cannot make yet: ${why.join('; ')}. Nothing was changed.`,
    )
  const pageId = opts.newId()
  const records: MadeRecord[] = []
  const counts = { pages: 1, blocks: 0, cards: 0 }
  const c: PageCtx = {
    ...opts,
    pageId,
    pageIds: new Map([[norm(page.title), pageId]]),
    records,
    counts,
  }
  addBlocks(c, page.blocks, null)
  records.push(
    pageRecord(page, pageId, {
      notebookId: opts.notebookId,
      parentId: opts.parentId,
      order: orderAfter(opts.lastSiblingOrder),
      now: opts.now,
      style: opts.style,
    }),
  )
  return { records, notebookId: opts.notebookId, pageIds: [pageId], counts }
}
