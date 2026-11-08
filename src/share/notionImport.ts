import {
  strFromU8,
  Unzip,
  UnzipInflate,
  UnzipPassThrough,
  unzipSync,
} from 'fflate'
import { saveAttachment } from '../core/attachments'
import { fileRef } from '../core/fileRef'
import type { BlockInput } from '../core/blockBulk'
import { addBlocks } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import type { JsonObject, JsonValue } from '../core/types'
import { parseCsv } from '../databases/csv'
import {
  guessType,
  importCsvRows,
  parseDate,
  type ColumnMapping,
} from '../databases/csvTransfer'
import {
  createDatabase,
  deleteDatabase,
  listRows,
} from '../databases/databaseService'
import { inlineRuns, markdownToBlocks } from '../editor/textBlocks'
import { imageRef, MAX_IMAGE_BYTES } from '../images/imageRef'
import { saveImage } from '../images/imageService'
import { createNotebook, deleteNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'

/**
 * Import of Notion's free export (Settings › Export › "Markdown & CSV",
 * with sub-pages): pages become pages and sub-pages, each CSV a database
 * (column types guessed), each row's .md the content of its row page,
 * pictures and files are kept, links between pages are rewritten. Read with
 * the same guards as backups (zip size, entry count, expanded size, one file
 * at a time) and nothing in it is run. No Notion API, no account.
 */

const MAX_ZIP_BYTES = 400 * 1024 * 1024
const MAX_ENTRIES = 20_000
const MAX_EXPANDED = 800 * 1024 * 1024
const MAX_MD_BYTES = 2 * 1024 * 1024
const MAX_CSV_BYTES = 30 * 1024 * 1024
const MAX_FILE_BYTES = 50 * 1024 * 1024
const MAX_PAGES = 5000

export class NotionImportError extends Error {}

export interface PlanNode {
  /** Path without the extension (the key links and folders use). */
  key: string
  title: string
  id: string
  md?: string
  csv?: string[][]
  /** Key of the page or database this sits under (null = top). */
  parentKey: string | null
  /** A row of a database: its content goes into the row's page. */
  rowOf?: string
}

export interface NotionPlan {
  name: string
  nodes: PlanNode[]
  files: Map<string, Uint8Array>
  pages: number
  databases: number
  rows: number
  images: number
  attachments: number
}

const HEX = /^(.*?)\s+([0-9a-f]{32})$/i

/** "Roadmap 1a2b…32 hex" → title and id. */
export function splitName(stem: string): { title: string; id: string } {
  const m = HEX.exec(stem)
  return m
    ? { title: m[1].trim(), id: m[2].toLowerCase() }
    : { title: stem.trim(), id: '' }
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const baseOf = (path: string) => path.split('/').pop() ?? path
const dirOf = (path: string) => path.split('/').slice(0, -1).join('/')
const stemOf = (path: string) => path.replace(/\.[^./]+$/, '')

/** A path with "." and ".." resolved; null if it climbs out of the zip. */
function resolvePath(dir: string, href: string): string | null {
  const out = dir ? dir.split('/') : []
  for (const part of safeDecode(href).split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (out.length === 0) return null
      out.pop()
    } else out.push(part)
  }
  return out.join('/')
}

/** Is this zip path one we must never read (traversal, absolute, hidden OS files)? */
const unsafeName = (name: string) =>
  name.startsWith('/') ||
  name.includes('\\') ||
  name.split('/').some((p) => p === '..') ||
  name.startsWith('__MACOSX/')

/** Reads a Notion export zip into a plan (counts and nodes). Nothing is written. */
export function planNotionZip(bytes: Uint8Array, fileName = ''): NotionPlan {
  if (bytes.length > MAX_ZIP_BYTES) throw new NotionImportError('toobig')
  let total = 0
  let count = 0
  let raw: Record<string, Uint8Array>
  try {
    raw = unzipSync(bytes, {
      filter: (f) => {
        if (++count > MAX_ENTRIES) throw new NotionImportError('entries')
        total += f.originalSize
        if (total > MAX_EXPANDED) throw new NotionImportError('expanded')
        return entryAllowed(f.name, f.originalSize)
      },
    })
  } catch (e) {
    if (e instanceof NotionImportError) throw e
    throw new NotionImportError('damaged')
  }
  return buildPlan(raw, fileName)
}

/** Does the zip entry fit the limits? (Folders and unsafe names never do.) */
function entryAllowed(name: string, size: number): boolean {
  if (name.endsWith('/') || unsafeName(name)) return false
  const lower = name.toLowerCase()
  if (lower.endsWith('.md')) return size <= MAX_MD_BYTES
  if (lower.endsWith('.csv')) return size <= MAX_CSV_BYTES
  return size <= MAX_FILE_BYTES
}

/**
 * Reads a Notion export zip as a stream: the file is read in chunks and each
 * allowed entry is inflated on its own, so the whole zip is never in memory
 * next to its contents (large exports on an iPad). Same limits as
 * planNotionZip; entries over their limit are skipped before inflating, and
 * entries whose size is not in the header are cut off when they grow past it.
 */
export async function planNotionStream(
  file: Blob,
  fileName = '',
): Promise<NotionPlan> {
  if (file.size > MAX_ZIP_BYTES) throw new NotionImportError('toobig')
  const raw: Record<string, Uint8Array> = {}
  let count = 0
  let total = 0
  let failure: unknown = null
  const unzip = new Unzip((entry) => {
    try {
      if (++count > MAX_ENTRIES) throw new NotionImportError('entries')
      const known = entry.originalSize
      total += known ?? 0
      if (total > MAX_EXPANDED) throw new NotionImportError('expanded')
      if (!entryAllowed(entry.name, known ?? 0)) return // skipped, never inflated
      const chunks: Uint8Array[] = []
      let size = 0
      entry.ondata = (err, chunk, final) => {
        if (failure) return
        try {
          if (err) throw err
          size += chunk.length
          if (known === undefined) total += chunk.length
          if (total > MAX_EXPANDED) throw new NotionImportError('expanded')
          if (!entryAllowed(entry.name, size)) {
            chunks.length = 0 // grew past its limit: drop it
            return
          }
          chunks.push(chunk)
          if (final) {
            const out = new Uint8Array(size)
            let at = 0
            for (const c of chunks) {
              out.set(c, at)
              at += c.length
            }
            raw[entry.name] = out
          }
        } catch (e) {
          failure = e
        }
      }
      entry.start()
    } catch (e) {
      failure = e
    }
  })
  unzip.register(UnzipInflate)
  unzip.register(UnzipPassThrough)
  try {
    const reader = file.stream().getReader()
    for (;;) {
      const { done, value } = await reader.read()
      unzip.push(value ?? new Uint8Array(0), done)
      if (failure) {
        await reader.cancel()
        break
      }
      if (done) break
    }
  } catch (e) {
    failure ??= e
  }
  if (failure) {
    if (failure instanceof NotionImportError) throw failure
    throw new NotionImportError('damaged')
  }
  return buildPlan(raw, fileName)
}

function buildPlan(
  raw: Record<string, Uint8Array>,
  fileName: string,
): NotionPlan {
  const nodes = new Map<string, PlanNode>()
  const files = new Map<string, Uint8Array>()
  let nested = 0
  for (const [path, data] of Object.entries(raw)) {
    const lower = path.toLowerCase()
    if (lower.endsWith('.zip')) nested++
    const isMd = lower.endsWith('.md')
    const isCsv = lower.endsWith('.csv')
    if (!isMd && !isCsv) {
      files.set(path, data)
      continue
    }
    // Notion also writes "<name>_all.csv" (the same table, every column).
    if (
      isCsv &&
      /_all\.csv$/i.test(path) &&
      raw[path.replace(/_all\.csv$/i, '.csv')]
    ) {
      continue
    }
    const key = stemOf(path)
    const { title, id } = splitName(baseOf(key))
    const node: PlanNode = nodes.get(key) ?? {
      key,
      title,
      id,
      parentKey: null,
    }
    if (isMd) node.md = strFromU8(data)
    else node.csv = parseCsv(strFromU8(data)).rows
    nodes.set(key, node)
  }
  if (nodes.size === 0) {
    throw new NotionImportError(nested > 0 ? 'nested' : 'nothing')
  }
  if (nodes.size > MAX_PAGES) throw new NotionImportError('pages')
  let databases = 0
  let rowPages = 0
  let rows = 0
  for (const node of nodes.values()) {
    const parent = nodes.get(dirOf(node.key))
    node.parentKey = parent ? parent.key : null
    if (node.csv) {
      databases++
      rows += Math.max(node.csv.length - 1, 0)
    }
    if (parent?.csv) {
      node.rowOf = parent.key
      rowPages++
    }
  }
  const imageFiles = [...files.entries()].filter(([, d]) => isImageBytes(d))
  return {
    name: fileName.replace(/\.zip$/i, '').slice(0, 100) || 'Notion',
    nodes: [...nodes.values()].sort((a, b) => a.key.localeCompare(b.key)),
    files,
    pages: nodes.size - databases - rowPages,
    databases,
    rows,
    images: imageFiles.length,
    attachments: files.size - imageFiles.length,
  }
}

const isImageBytes = (b: Uint8Array) =>
  (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e) ||
  (b[0] === 0xff && b[1] === 0xd8) ||
  (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) ||
  (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57)

const imageMime = (b: Uint8Array) =>
  b[0] === 0x89
    ? 'image/png'
    : b[0] === 0xff
      ? 'image/jpeg'
      : b[0] === 0x47
        ? 'image/gif'
        : 'image/webp'

// ---------------------------------------------------------------- columns

const MONTHS =
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},\s+\d{4}/i

/** Notion's "November 9, 2026 3:00 PM" (a leading "@" is dropped) as "2026-11-09". */
export function notionDate(text: string): string | null {
  const t = text.trim().replace(/^@/, '')
  const exact = parseDate(t)
  if (exact) return exact
  if (!MONTHS.test(t)) return null
  const d = new Date(t.replace(/\s+(am|pm)$/i, ' $1').split(/\s+→\s+/)[0])
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Column type of one Notion CSV column: date, number, select, multi-select, checkbox, url, else text. */
export function guessNotionType(values: readonly string[]): string {
  const filled = values.map((v) => v.trim()).filter(Boolean)
  if (filled.length === 0) return 'text'
  if (filled.every((v) => notionDate(v) !== null)) return 'date'
  const base = guessType(filled)
  if (base !== 'text' && base !== 'choice') return base
  const distinct = new Set(filled.map((v) => v.toLowerCase()))
  const multi = filled.some((v) => v.includes(', '))
  if (multi) {
    const tokens = filled
      .flatMap((v) => v.split(/,\s*/))
      .map((v) => v.toLowerCase())
    const kinds = new Set(tokens)
    if (
      kinds.size <= 30 &&
      kinds.size < tokens.length &&
      filled.every((v) => v.length < 200)
    ) {
      return 'choices'
    }
    return 'text'
  }
  if (
    filled.length >= 2 &&
    distinct.size <= 10 &&
    distinct.size < filled.length &&
    filled.every((v) => v.length < 60)
  ) {
    return 'choice'
  }
  return base
}

// --------------------------------------------------------------- markdown

export interface MarkdownContext {
  /** Notion link target → a page id of ours (and its title), or null. */
  link: (href: string) => { pageId: string; title: string } | null
  /** Picture or file path → a block for it, or null. */
  media: (href: string, alt: string) => BlockInput | null
}

const MARK = String.fromCharCode(0xe000)
const MARK_END = String.fromCharCode(0xe001)
const MARK_SEP = String.fromCharCode(0xe002)

/** Internal links in a line become marked text (`markLinks`), later split into note links. */
function markLinks(line: string, ctx: MarkdownContext): string {
  return line.replace(
    /\[([^\]]*)\]\(([^)\s]+)\)/g,
    (whole, label: string, href: string) => {
      if (/^(https?:|mailto:|tel:)/i.test(href)) return whole
      const hit = ctx.link(href)
      return hit
        ? `${MARK}${hit.pageId}${MARK_SEP}${label || hit.title}${MARK_END}`
        : label
    },
  )
}

/** Splits marked text runs into text and note-link runs. */
function splitMarks(runs: JsonValue[]): JsonValue[] {
  const out: JsonValue[] = []
  for (const run of runs as JsonObject[]) {
    if (run.type !== 'text' || !String(run.text).includes(MARK)) {
      out.push(run)
      continue
    }
    const parts = String(run.text).split(MARK)
    if (parts[0]) out.push({ ...run, text: parts[0] })
    for (const part of parts.slice(1)) {
      const end = part.indexOf(MARK_END)
      const [pageId, label] = part.slice(0, end).split(MARK_SEP)
      out.push({ type: 'noteLink', props: { pageId, blockId: '', label } })
      if (part.slice(end + 1)) out.push({ ...run, text: part.slice(end + 1) })
    }
  }
  return out
}

/** Inline runs of a line; internal links become note links. */
function runsOf(line: string, ctx: MarkdownContext): JsonValue[] {
  return splitMarks(inlineRuns(markLinks(line, ctx)))
}

/** Blocks from the plain reader, with marked links turned into note links. */
function linked(blocks: BlockInput[]): BlockInput[] {
  return blocks.map((b) => ({
    ...b,
    content: Array.isArray(b.content.text)
      ? { ...b.content, text: splitMarks(b.content.text) }
      : b.content,
    ...(b.children && { children: linked(b.children) }),
  }))
}

const text = (line: string, ctx: MarkdownContext): JsonObject => ({
  text: runsOf(line, ctx),
})

const EMOJI = /^(\p{Extended_Pictographic}\p{M}*)\s*/u

/**
 * Notion Markdown to blocks: headings, lists, quotes, check items, code,
 * dividers, tables, pictures and files, `<details>` toggles (nested) and
 * `<aside>` callouts. Everything else goes through the plain Markdown reader.
 * `rowProperties`: the "Name: value" lines under a row's title are dropped
 * (the database holds them).
 */
export function notionMarkdownToBlocks(
  markdown: string,
  ctx: MarkdownContext,
  rowProperties = false,
): BlockInput[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let start = 0
  while (start < lines.length && lines[start].trim() === '') start++
  if (/^#\s+/.test(lines[start] ?? '')) start++
  if (rowProperties) {
    let i = start
    while (i < lines.length && lines[i].trim() === '') i++
    let j = i
    while (j < lines.length && /^[^:\n]{1,80}:(\s.*)?$/.test(lines[j])) j++
    if (j > i) start = j
  }
  return parseLines(lines.slice(start), ctx)
}

function parseLines(lines: string[], ctx: MarkdownContext): BlockInput[] {
  const out: BlockInput[] = []
  let plain: string[] = []
  const flush = () => {
    if (plain.length === 0) return
    // Internal links are marked first, then become note links.
    const source = markLinks(plain.join('\n'), ctx)
    plain = []
    out.push(...linked(markdownToBlocks(source)))
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const fence = /^```(\w*)/.exec(trimmed)
    if (fence) {
      flush()
      const body: string[] = []
      while (++i < lines.length && !lines[i].trim().startsWith('```'))
        body.push(lines[i])
      out.push({
        type: 'codeBlock',
        content: {
          language: fence[1] || 'text',
          text: [{ type: 'text', text: body.join('\n'), styles: {} }],
        },
      })
    } else if (/^<details/i.test(trimmed)) {
      flush()
      const inner: string[] = []
      let depth = 1
      while (++i < lines.length) {
        if (/^<details/i.test(lines[i].trim())) depth++
        if (/^<\/details>/i.test(lines[i].trim()) && --depth === 0) break
        inner.push(lines[i])
      }
      const first = inner.findIndex((l) => l.trim() !== '')
      const summary = /^<summary>(.*)<\/summary>$/i.exec(
        inner[first]?.trim() ?? '',
      )
      const children = parseLines(summary ? inner.slice(first + 1) : inner, ctx)
      out.push({
        type: 'toggleListItem',
        content: text(summary ? summary[1].replace(/<[^>]+>/g, '') : '', ctx),
        ...(children.length > 0 && { children }),
      })
    } else if (/^<aside>/i.test(trimmed)) {
      flush()
      const inner: string[] = [trimmed.replace(/^<aside>/i, '')]
      while (!/<\/aside>/i.test(inner[inner.length - 1]) && ++i < lines.length)
        inner.push(lines[i])
      const body = inner
        .join('\n')
        .replace(/<\/aside>/i, '')
        .trim()
      const m = EMOJI.exec(body)
      out.push({
        type: 'callout',
        content: {
          emoji: m ? m[1] : '💡',
          ...text(
            body
              .slice(m ? m[0].length : 0)
              .replace(/\s+/g, ' ')
              .trim(),
            ctx,
          ),
        },
      })
    } else if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flush()
      out.push({ type: 'divider', content: {} })
    } else if (/^\|.*\|$/.test(trimmed)) {
      flush()
      const rows: string[][] = []
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        const cells = lines[i]
          .trim()
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      i--
      out.push({
        type: 'table',
        content: {
          text: {
            type: 'tableContent',
            rows: rows.map((cells) => ({
              cells: cells.map((c) => runsOf(c, ctx)),
            })),
          },
        },
      })
    } else if (/^>\s?/.test(trimmed)) {
      flush()
      out.push({
        type: 'quote',
        content: text(trimmed.replace(/^>\s?/, ''), ctx),
      })
    } else if (/^[-*]\s+\[[ xX]\]\s/.test(trimmed)) {
      flush()
      out.push({
        type: 'checkListItem',
        content: {
          checked: /\[[xX]\]/.test(trimmed),
          ...text(trimmed.replace(/^[-*]\s+\[[ xX]\]\s+/, ''), ctx),
        },
      })
    } else {
      const media = /^!?\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed)
      const block =
        media && !/^(https?:|mailto:|tel:)/i.test(media[2])
          ? ctx.media(media[2], media[1])
          : null
      if (block) {
        flush()
        out.push(block)
      } else plain.push(line)
    }
  }
  flush()
  return out
}

// ----------------------------------------------------------------- import

export interface NotionImportResult {
  notebookId: string
  /** Everything made, so Undo can move it to Trash. */
  created: { notebook?: string; pages: string[]; databases: string[] }
  pages: number
  databases: number
  rows: number
  images: number
}

const imageBlock = (id: string, caption: string): BlockInput => ({
  type: 'image',
  content: { url: imageRef(id), caption },
})

const IMAGE_REFS = /!\[[^\]]*\]\(([^)\s]+)\)/g

/**
 * Makes the plan's pages, databases and rows in `notebookId` (null = a new
 * notebook named after the export). `undoNotionImport` moves all of it to
 * Trash; a failure half-way does that by itself.
 */
export async function runNotionImport(
  db: LearningNotesDB,
  workspaceId: string,
  plan: NotionPlan,
  notebookId: string | null,
  onProgress: (done: number, total: number) => void = () => {},
): Promise<NotionImportResult> {
  const created: NotionImportResult['created'] = { pages: [], databases: [] }
  let target = notebookId
  if (!target) {
    const nb = await createNotebook(db, workspaceId, plan.name)
    created.notebook = nb.id
    target = nb.id
  }
  const nodeByKey = new Map(plan.nodes.map((n) => [n.key, n]))
  const underRow = (node: PlanNode): boolean => {
    for (let p = node.parentKey; p; p = nodeByKey.get(p)?.parentKey ?? null) {
      if (nodeByKey.get(p)?.rowOf) return true
    }
    return false
  }
  try {
    // Pass 1: every page and database exists, so links can point to them.
    const pageOf = new Map<string, string>() // node key → page or database id
    const byId = new Map<string, string>() // Notion id → ours
    const dbOf = new Map<string, string>() // CSV node key → database id
    const total = plan.nodes.length
    let done = 0
    const makePage = async (node: PlanNode) => {
      const parent = node.parentKey ? pageOf.get(node.parentKey) : undefined
      const page = await createPage(
        db,
        target,
        parent && !dbOf.has(node.parentKey ?? '') ? parent : null,
        node.title.slice(0, 200),
      )
      created.pages.push(page.id)
      pageOf.set(node.key, page.id)
      if (node.id) byId.set(node.id, page.id)
    }
    for (const node of plan.nodes) {
      if (node.rowOf || underRow(node)) continue
      if (node.csv) {
        const database = await createDatabase(
          db,
          workspaceId,
          target,
          node.title || 'Database',
        )
        created.databases.push(database.id)
        dbOf.set(node.key, database.id)
        pageOf.set(node.key, database.id)
        if (node.id) byId.set(node.id, database.id)
      } else await makePage(node)
    }
    // Pass 2: database rows (types guessed), then pages under rows.
    let rowCount = 0
    const rowPage = new Set<string>()
    for (const [key, databaseId] of dbOf) {
      const [header, ...body] = nodeByKey.get(key)?.csv ?? []
      if (!header || header.length === 0) continue
      const mapping: ColumnMapping[] = header.map((_, c) => {
        if (c === 0) return { kind: 'title' }
        const type = guessNotionType(body.map((r) => r[c] ?? ''))
        if (type === 'date') {
          for (const r of body) r[c] = notionDate(r[c] ?? '') ?? ''
        }
        return { kind: 'new', type }
      })
      await importCsvRows(db, databaseId, header, body, mapping)
      const rows = await listRows(db, databaseId)
      const byTitle = new Map(
        rows.map((r) => [r.title.trim().toLowerCase(), r.id]),
      )
      for (const row of plan.nodes.filter((n) => n.rowOf === key)) {
        const id = byTitle.get(row.title.trim().toLowerCase())
        if (!id) continue
        rowPage.add(row.key)
        pageOf.set(row.key, id)
        if (row.id) byId.set(row.id, id)
      }
      rowCount += rows.length
    }
    for (const row of plan.nodes.filter(
      (n) => n.rowOf && !rowPage.has(n.key),
    )) {
      await makePage({ ...row, parentKey: null }) // a .md the CSV did not list
      rowPage.add(row.key)
    }
    for (const node of plan.nodes) {
      if (!node.rowOf && underRow(node)) await makePage(node)
    }
    // Pass 3: every page's content, with its pictures, files and links.
    const images = new Map<string, string>() // zip path → image id
    for (const node of plan.nodes) {
      onProgress(++done, total)
      const pageId = pageOf.get(node.key)
      if (!pageId || node.csv) continue
      const dir = dirOf(node.key)
      const md = node.md ?? ''
      for (const m of md.matchAll(IMAGE_REFS)) {
        const path = resolvePath(dir, m[1])
        const data = path ? plan.files.get(path) : undefined
        if (!path || !data || images.has(path)) continue
        if (!isImageBytes(data) || data.length > MAX_IMAGE_BYTES) continue
        const stored = await saveImage(
          db,
          new File([data.slice().buffer as ArrayBuffer], baseOf(path), {
            type: imageMime(data),
          }),
        )
        images.set(path, stored.id)
      }
      const ctx: MarkdownContext = {
        link: (href) => {
          const path = resolvePath(dir, stemOf(safeDecode(href)))
          const hit =
            (path ? nodeByKey.get(path) : undefined) ??
            plan.nodes.find((n) => n.id && href.toLowerCase().includes(n.id))
          const id = hit && pageOf.get(hit.key)
          return hit && id ? { pageId: id, title: hit.title } : null
        },
        media: (href, alt) => {
          const path = resolvePath(dir, href)
          const id = path ? images.get(path) : undefined
          return id ? imageBlock(id, alt) : null
        },
      }
      const blocks = notionMarkdownToBlocks(md, ctx, !!node.rowOf)
      if (blocks.length > 0) await addBlocks(db, pageId, blocks)
      // Other files in the page's folder: kept on the page as File blocks.
      for (const [path, data] of plan.files) {
        if (
          dirOf(path) !== node.key ||
          isImageBytes(data) ||
          data.length === 0
        ) {
          continue
        }
        const stored = await saveAttachment(
          db,
          pageId,
          new File([data.slice().buffer as ArrayBuffer], baseOf(path)),
        )
        await addBlocks(db, pageId, [
          {
            type: 'file',
            content: {
              url: fileRef(stored.id),
              name: stored.name,
              size: stored.size,
              caption: '',
            },
          },
        ])
      }
    }
    return {
      notebookId: target,
      created,
      pages: created.pages.length,
      databases: created.databases.length,
      rows: rowCount,
      images: images.size,
    }
  } catch (e) {
    await undoNotionImport(db, created)
    throw e
  }
}

/** Moves everything the import made to Trash (the new notebook, or its top-level parts). */
export async function undoNotionImport(
  db: LearningNotesDB,
  created: NotionImportResult['created'],
): Promise<void> {
  if (created.notebook) {
    await deleteNotebook(db, created.notebook)
    return
  }
  for (const id of created.databases) {
    await deleteDatabase(db, id).catch(() => {})
  }
  for (const id of created.pages) await deletePage(db, id).catch(() => {})
}
