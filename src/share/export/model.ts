import type { LearningNotesDB } from '../../core/db'
import { inReadingOrder } from '../../core/blockService'
import { inPaperOrder } from '../../paper/boxes'
import { byOrder } from '../../core/order'
import { isLive } from '../../core/records'
import type { Block, JsonObject, JsonValue, Page } from '../../core/types'
import { noteLinkProps, tagRefProps } from '../../editor/mapping'
import { parseMindMap, toOutline } from '../../editor/mindMap/model'
import { parseImageRef } from '../../images/imageRef'

/**
 * One neutral picture of a page for every export format (J1): Markdown,
 * text, Word and the print view all read this, so they stay in step. Nothing
 * here touches the screen or the editor.
 */

/** A piece of text with the same look. */
export interface Run {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  code?: boolean
  /** A hex colour (#rrggbb) or nothing. */
  color?: string
  /** Highlight colour as a hex value, or nothing. */
  bg?: string
  href?: string
}

export type NodeKind =
  | 'paragraph'
  | 'heading'
  | 'bullet'
  | 'number'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'image'
  | 'table'
  | 'card'
  | 'callout'
  | 'toggle'
  | 'plain'

export interface ExportNode {
  kind: NodeKind
  runs: Run[]
  level?: number
  checked?: boolean
  lang?: string
  /** Picture id (image nodes) when it is stored in the app. */
  imageId?: string
  /** A web address for pictures that are not stored (shown as a link). */
  imageUrl?: string
  caption?: string
  /** Table rows of cells of runs. */
  rows?: Run[][][]
  children: ExportNode[]
}

/** A page ready to write out, with its sub-pages. */
export interface ExportPage {
  title: string
  nodes: ExportNode[]
  children: ExportPage[]
  /** Pictures of the page's ink, drawn by the screen (PNG bytes), if any. */
  inkPng?: Uint8Array
  inkSize?: { w: number; h: number }
}

const isObject = (v: JsonValue | undefined): v is JsonObject =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/** BlockNote colour names in the app's editor, as hex (text on white paper). */
const COLOURS: Record<string, string> = {
  gray: '#787774',
  brown: '#9f6b53',
  red: '#e03e3e',
  orange: '#d9730d',
  yellow: '#cb912f',
  green: '#448361',
  blue: '#337ea9',
  purple: '#9065b0',
  pink: '#c14c8a',
}
const BACKGROUNDS: Record<string, string> = {
  gray: '#ebeced',
  brown: '#e9e5e3',
  red: '#fbe4e4',
  orange: '#faebdd',
  yellow: '#fbf3db',
  green: '#ddedea',
  blue: '#ddebf1',
  purple: '#eae4f2',
  pink: '#f4dfeb',
}
const colour = (
  v: unknown,
  table: Record<string, string>,
): string | undefined =>
  typeof v !== 'string' ? undefined : /^#[0-9a-f]{6}$/i.test(v) ? v : table[v]

/** Rich text (`content.text`) as runs. Links, note links and tags become text. */
function runsOf(value: JsonValue | undefined, href?: string): Run[] {
  if (typeof value === 'string') return value ? [{ text: value, href }] : []
  if (!Array.isArray(value)) return []
  const out: Run[] = []
  for (const run of value) {
    if (typeof run === 'string') {
      if (run) out.push({ text: run, ...(href && { href }) })
      continue
    }
    if (!isObject(run)) continue
    if (run.type === 'link' && typeof run.href === 'string') {
      out.push(...runsOf(run.content, run.href))
      continue
    }
    const link = noteLinkProps(run)
    if (link) {
      if (link.label) out.push({ text: link.label, ...(href && { href }) })
      continue
    }
    const tag = tagRefProps(run)
    if (tag) {
      if (tag.label) out.push({ text: `#${tag.label}` })
      continue
    }
    if (typeof run.text !== 'string' || run.text === '') continue
    const s = isObject(run.styles) ? run.styles : {}
    const r: Run = { text: run.text }
    if (s.bold) r.bold = true
    if (s.italic) r.italic = true
    if (s.underline) r.underline = true
    if (s.strike) r.strike = true
    if (s.code) r.code = true
    const c = colour(s.textColor, COLOURS)
    const b = colour(s.backgroundColor, BACKGROUNDS)
    if (c) r.color = c
    if (b) r.bg = b
    if (href) r.href = href
    out.push(r)
  }
  return out
}

/** The plain words of some runs. */
export const runsText = (runs: readonly Run[]): string =>
  runs.map((r) => r.text).join('')

/** Cells of a BlockNote table: either runs or `{ type: 'tableCell', content }`. */
function tableRows(value: JsonValue | undefined): Run[][][] {
  if (!isObject(value) || !Array.isArray(value.rows)) return []
  return value.rows.map((row) => {
    const cells = isObject(row) && Array.isArray(row.cells) ? row.cells : []
    return cells.map((cell) =>
      runsOf(isObject(cell) && 'content' in cell ? cell.content : cell),
    )
  })
}

const str = (v: JsonValue | undefined): string =>
  typeof v === 'string' ? v : ''

/** Turns the page's live blocks into nodes (nested like the page). */
function nodesOf(blocks: readonly Block[]): ExportNode[] {
  const kids = new Map<string | null, Block[]>()
  const ids = new Set(blocks.map((b) => b.id))
  for (const b of [...blocks].sort(byOrder)) {
    const parent =
      b.parentId !== null && ids.has(b.parentId) ? b.parentId : null
    kids.set(parent, [...(kids.get(parent) ?? []), b])
  }
  const build = (parent: string | null): ExportNode[] =>
    (kids.get(parent) ?? []).flatMap((b) => {
      const node = nodeOf(b)
      if (!node) return []
      node.children = build(b.id)
      return [node]
    })
  return build(null)
}

function nodeOf(b: Block): ExportNode | null {
  const c = b.content
  const base = { runs: runsOf(c.text), children: [] as ExportNode[] }
  switch (b.type) {
    case 'paragraph':
      return { kind: 'paragraph', ...base }
    case 'heading':
      return {
        kind: 'heading',
        ...base,
        level: Math.min(3, Math.max(1, Number(c.level) || 1)),
      }
    case 'bulletListItem':
      return { kind: 'bullet', ...base }
    case 'numberedListItem':
      return { kind: 'number', ...base }
    case 'checkListItem':
      return { kind: 'todo', ...base, checked: c.checked === true }
    case 'toggleListItem':
      return { kind: 'toggle', ...base }
    case 'quote':
      return { kind: 'quote', ...base }
    case 'callout':
      return { kind: 'callout', ...base }
    case 'codeBlock':
      return { kind: 'code', ...base, lang: str(c.language) }
    case 'divider':
      return { kind: 'divider', runs: [], children: [] }
    case 'card':
      return { kind: 'card', ...base }
    case 'image': {
      const url = str(c.url)
      const id = parseImageRef(url)
      return {
        kind: 'image',
        runs: [],
        children: [],
        caption: str(c.caption),
        ...(id ? { imageId: id } : url ? { imageUrl: url } : {}),
      }
    }
    case 'table':
      return { kind: 'table', runs: [], rows: tableRows(c.text), children: [] }
    case 'math': {
      const latex = str(c.latex).trim()
      return latex
        ? { kind: 'plain', runs: [{ text: `$$ ${latex} $$` }], children: [] }
        : null
    }
    case 'mindMap': {
      const text = toOutline(parseMindMap(c.data))
      return text.trim()
        ? { kind: 'plain', runs: [{ text }], children: [] }
        : null
    }
    case 'embed': {
      const url = str(c.url)
      return url
        ? {
            kind: 'paragraph',
            runs: [{ text: str(c.caption) || url, href: url }],
            children: [],
          }
        : null
    }
    case 'file': {
      const name = str(c.name)
      return name
        ? { kind: 'paragraph', runs: [{ text: `📎 ${name}` }], children: [] }
        : null
    }
    default:
      // Databases, card lists and the like are views of other data.
      return null
  }
}

/** Live sub-pages of a page, in order. */
const childrenOf = (pages: readonly Page[], id: string): Page[] =>
  pages.filter((p) => p.parentId === id && isLive(p)).sort(byOrder)

/**
 * A page and (optionally) its sub-pages as an export tree. Locked pages are
 * left out unless they are `unlocked` (the one open now); `skipped` counts
 * them.
 */
export async function loadExportPage(
  db: LearningNotesDB,
  pageId: string,
  options: { subpages?: boolean; unlocked?: ReadonlySet<string> } = {},
): Promise<{ page: ExportPage | null; skipped: number }> {
  const root = await db.pages.get(pageId)
  if (!root || !isLive(root)) return { page: null, skipped: 0 }
  const all = options.subpages
    ? (
        await db.pages.where('notebookId').equals(root.notebookId).toArray()
      ).filter(isLive)
    : [root]
  let skipped = 0
  const build = async (p: Page): Promise<ExportPage | null> => {
    if (p.locked && !options.unlocked?.has(p.id)) {
      skipped++
      return null
    }
    // Phase Q: box by box, top to bottom, then left to right.
    const blocks = inPaperOrder(
      p,
      (await db.blocks.where('pageId').equals(p.id).toArray()).filter(isLive),
      inReadingOrder,
    )
    const children: ExportPage[] = []
    if (options.subpages) {
      for (const child of childrenOf(all, p.id)) {
        const built = await build(child)
        if (built) children.push(built)
      }
    }
    return { title: p.title, nodes: nodesOf(blocks), children }
  }
  return { page: await build(root), skipped }
}

/** A notebook's pages as export trees (top pages in order). */
export async function loadExportNotebook(
  db: LearningNotesDB,
  notebookId: string,
): Promise<{ pages: ExportPage[]; skipped: number }> {
  const all = (
    await db.pages.where('notebookId').equals(notebookId).toArray()
  ).filter(isLive)
  const tops = all.filter((p) => p.parentId === null).sort(byOrder)
  const pages: ExportPage[] = []
  let skipped = 0
  for (const top of tops) {
    const r = await loadExportPage(db, top.id, { subpages: true })
    skipped += r.skipped
    if (r.page) pages.push(r.page)
  }
  return { pages, skipped }
}
