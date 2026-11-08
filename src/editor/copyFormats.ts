import { blockToNode } from '@blocknote/core'
import { Fragment, Slice } from 'prosemirror-model'
import { t } from '../i18n/t'
import { embedPictures, inlineText } from './clipboard'
import type { AppSchema } from './schema'

/**
 * Copy side of the clipboard. A copy of whole blocks (Ctrl/Cmd+C, Lasso Copy,
 * block menu Copy) puts four things on the clipboard together:
 *  - text/html: rich, clean HTML (headings, nested lists, tables, toggles as
 *    <details>, cards as Q/A, links, code);
 *  - text/plain: clean Markdown of the same blocks;
 *  - blocknote/html: our own lossless format (paste back = identical blocks);
 *  - one picture alone also goes as an image.
 * "Copy as..." writes one format only. Pure serializers first; the parts that
 * touch the clipboard are at the bottom.
 */

type Editor = AppSchema['BlockNoteEditor']
export type CopyKind = 'markdown' | 'rich' | 'plain' | 'html'

/** A block as BlockNote hands it over (loosely typed on purpose). */
export interface CopyBlock {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: unknown
  children?: CopyBlock[]
}
type Inline = {
  type?: string
  text?: string
  href?: string
  styles?: Record<string, unknown>
  content?: unknown
  props?: Record<string, unknown>
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// ---- Markdown -------------------------------------------------------------

const isWeb = (u: string) => /^https?:\/\//i.test(u)
const mdEscape = (s: string) => s.replace(/([\\`*_[\]])/g, '\\$1')

function mdInline(content: unknown): string {
  if (typeof content === 'string') return mdEscape(content)
  if (!Array.isArray(content)) return ''
  return (content as Inline[])
    .map((n) => {
      if (n.type === 'link') {
        const words = mdInline(n.content)
        return isWeb(str(n.href)) || /^(mailto|tel):/i.test(str(n.href))
          ? `[${words}](${n.href})`
          : words
      }
      if (n.type === 'noteLink') return str(n.props?.label)
      if (n.type === 'tag') return `#${str(n.props?.label)}`
      let s = n.text ?? ''
      if (s === '') return ''
      const st = n.styles ?? {}
      if (st.code) return '`' + s.replace(/`/g, "'") + '`'
      s = mdEscape(s)
      const lead = /^\s*/.exec(s)![0]
      const trail = /\s*$/.exec(s.slice(lead.length))![0]
      let core = s.slice(lead.length, s.length - trail.length)
      if (core === '') return s
      if (st.bold) core = `**${core}**`
      if (st.italic) core = `*${core}*`
      if (st.strike) core = `~~${core}~~`
      return lead + core + trail
    })
    .join('')
}

type Cell = unknown
const cellInline = (cell: Cell): unknown =>
  cell && typeof cell === 'object' && !Array.isArray(cell) && 'content' in cell
    ? (cell as { content: unknown }).content
    : cell

function tableRows(content: unknown): unknown[][] {
  const c = content as { rows?: { cells: Cell[] }[] } | undefined
  return (c?.rows ?? []).map((r) => r.cells.map(cellInline))
}

const pipe = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function mdTable(content: unknown): string {
  const rows = tableRows(content).map((r) => r.map((c) => pipe(mdInline(c))))
  if (rows.length === 0) return ''
  const cols = Math.max(...rows.map((r) => r.length))
  const pad = (r: string[]) => [...r, ...Array(cols - r.length).fill('')]
  const line = (r: string[]) => `| ${pad(r).join(' | ')} |`
  return [
    line(rows[0]),
    `| ${Array(cols).fill('---').join(' | ')} |`,
    ...rows.slice(1).map(line),
  ].join('\n')
}

/** Text of a block's own line(s), without prefix. */
function lines(s: string, indent: string): string {
  return s
    .split('\n')
    .map((l, i) => (i === 0 ? l : indent + l))
    .join('\n')
}

function mdBlock(b: CopyBlock, n: number, depth: number): string {
  const pad = '  '.repeat(depth)
  const kids = (more = depth + 1) => mdBlocks(b.children ?? [], more)
  const p = b.props ?? {}
  switch (b.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(p.level) || 1))
      const head = `${'#'.repeat(level)} ${mdInline(b.content)}`
      return kids(depth) ? `${head}\n\n${kids(depth)}` : head
    }
    case 'bulletListItem':
    case 'numberedListItem':
    case 'checkListItem': {
      const mark =
        b.type === 'bulletListItem'
          ? '-'
          : b.type === 'numberedListItem'
            ? `${n}.`
            : p.checked
              ? '- [x]'
              : '- [ ]'
      const own = `${pad}${mark} ${lines(mdInline(b.content), pad + '  ')}`
      const sub = kids()
      return sub ? `${own}\n${sub}` : own
    }
    case 'toggleListItem': {
      const inner = kids(0)
      return (
        `<details>\n<summary>${htmlInline(b.content)}</summary>\n\n` +
        (inner ? `${inner}\n\n` : '') +
        '</details>'
      )
    }
    case 'quote':
      return mdInline(b.content)
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'callout':
      return `> ${str(p.emoji) || '💡'} ${mdInline(b.content)}`
    case 'codeBlock': {
      const code = inlineText(b.content)
      const fence = code.includes('```') ? '~~~' : '```'
      const lang = str(p.language)
      return `${fence}${lang === 'text' ? '' : lang}\n${code}\n${fence}`
    }
    case 'divider':
      return '---'
    case 'table':
      return mdTable(b.content)
    case 'card': {
      const answer = mdBlocks(b.children ?? [], 0)
      return `**Q:** ${mdInline(b.content)}${answer ? `\n\n**A:** ${answer}` : ''}`
    }
    case 'image': {
      const url = str(p.url)
      const alt = mdEscape(str(p.caption) || str(p.name))
      return isWeb(url) ? `![${alt}](${url})` : alt ? `*${alt}*` : ''
    }
    case 'embed': {
      const url = str(p.url)
      const name = mdEscape(str(p.caption) || url)
      return isWeb(url) ? `[${name}](${url})` : name
    }
    case 'math':
      return `$$\n${str(p.latex)}\n$$`
    case 'file':
      return mdEscape(str(p.name) || str(p.caption))
    case 'paragraph':
      return mdInline(b.content)
    default:
      return Array.isArray(b.content) ? mdInline(b.content) : ''
  }
}

function mdBlocks(blocks: readonly CopyBlock[], depth: number): string {
  let out = ''
  let n = 0
  let prevList = false
  for (const b of blocks) {
    n = b.type === 'numberedListItem' ? n + 1 : 0
    const text = mdBlock(b, n, depth)
    const list = /^(bullet|numbered|check)/.test(b.type)
    if (text === '' && b.type !== 'paragraph') continue
    // Lists stay tight; everything else gets a blank line between.
    if (out !== '') out += prevList && list ? '\n' : '\n\n'
    out += text
    prevList = list
  }
  return out.replace(/^\n+|\s+$/g, '')
}

/** Clean Markdown of blocks (what text/plain and "Markdown" carry). */
export function blocksToMarkdown(blocks: readonly CopyBlock[]): string {
  return mdBlocks(blocks, 0)
}

// ---- HTML -----------------------------------------------------------------

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s: string) => esc(s).replace(/"/g, '&quot;')
const safeLink = (u: string) => /^(https?:|mailto:|tel:)/i.test(u.trim())

function htmlInline(content: unknown): string {
  if (typeof content === 'string') return esc(content)
  if (!Array.isArray(content)) return ''
  return (content as Inline[])
    .map((n) => {
      if (n.type === 'link') {
        const inner = htmlInline(n.content)
        return safeLink(str(n.href))
          ? `<a href="${attr(str(n.href))}">${inner}</a>`
          : inner
      }
      if (n.type === 'noteLink') return esc(str(n.props?.label))
      if (n.type === 'tag') return esc(`#${str(n.props?.label)}`)
      let s = esc(n.text ?? '').replace(/\n/g, '<br>')
      const st = n.styles ?? {}
      if (st.code) s = `<code>${s}</code>`
      if (st.bold) s = `<strong>${s}</strong>`
      if (st.italic) s = `<em>${s}</em>`
      if (st.underline) s = `<u>${s}</u>`
      if (st.strike) s = `<s>${s}</s>`
      return s
    })
    .join('')
}

export interface HtmlOptions {
  /** Keep picture addresses that are not web addresses (to be embedded later). */
  keepSrc?: boolean
}

function htmlBlock(b: CopyBlock, o: HtmlOptions): string {
  const p = b.props ?? {}
  const kids = htmlBlocks(b.children ?? [], o)
  switch (b.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(p.level) || 1))
      return `<h${level}>${htmlInline(b.content)}</h${level}>${kids}`
    }
    case 'quote':
      return `<blockquote>${htmlInline(b.content)}</blockquote>${kids}`
    case 'callout':
      return `<blockquote>${esc(str(p.emoji) || '💡')} ${htmlInline(b.content)}</blockquote>${kids}`
    case 'toggleListItem':
      return `<details open><summary>${htmlInline(b.content)}</summary>${kids}</details>`
    case 'codeBlock':
      return `<pre><code>${esc(inlineText(b.content))}</code></pre>`
    case 'divider':
      return '<hr>'
    case 'table': {
      const rows = tableRows(b.content)
      const tr = (r: unknown[], tag: string) =>
        `<tr>${r.map((c) => `<${tag}>${htmlInline(c)}</${tag}>`).join('')}</tr>`
      return rows.length
        ? `<table><tbody>${rows.map((r, i) => tr(r, i === 0 ? 'th' : 'td')).join('')}</tbody></table>`
        : ''
    }
    case 'card': {
      const answer = htmlBlocks(b.children ?? [], o)
      return (
        `<p><strong>Q:</strong> ${htmlInline(b.content)}</p>` +
        (answer ? `<div><strong>A:</strong>${answer}</div>` : '')
      )
    }
    case 'image': {
      const url = str(p.url)
      const alt = str(p.caption) || str(p.name)
      return isWeb(url) || o.keepSrc || url.startsWith('data:image/')
        ? `<p><img src="${attr(url)}" alt="${attr(alt)}"></p>`
        : alt
          ? `<p><em>${esc(alt)}</em></p>`
          : ''
    }
    case 'embed': {
      const url = str(p.url)
      const name = str(p.caption) || url
      return isWeb(url)
        ? `<p><a href="${attr(url)}">${esc(name)}</a></p>`
        : `<p>${esc(name)}</p>`
    }
    case 'math':
      return `<p>$$${esc(str(p.latex))}$$</p>`
    case 'file':
      return `<p>${esc(str(p.name) || str(p.caption))}</p>`
    case 'paragraph':
      return `<p>${htmlInline(b.content)}</p>${kids}`
    default:
      return Array.isArray(b.content)
        ? `<p>${htmlInline(b.content)}</p>${kids}`
        : ''
  }
}

const LIST_TAG: Record<string, string> = {
  bulletListItem: 'ul',
  numberedListItem: 'ol',
  checkListItem: 'ul',
}

function htmlBlocks(blocks: readonly CopyBlock[], o: HtmlOptions): string {
  let out = ''
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const tag = LIST_TAG[b.type]
    if (!tag) {
      out += htmlBlock(b, o)
      continue
    }
    // A run of list items of the same kind becomes one list.
    let items = ''
    let j = i
    for (; j < blocks.length && blocks[j].type === b.type; j++) {
      const it = blocks[j]
      const box =
        it.type === 'checkListItem'
          ? `<input type="checkbox" disabled${it.props?.checked ? ' checked' : ''}> `
          : ''
      items += `<li>${box}${htmlInline(it.content)}${htmlBlocks(it.children ?? [], o)}</li>`
    }
    out += `<${tag}>${items}</${tag}>`
    i = j - 1
  }
  return out
}

/** Clean, rich HTML of blocks (text/html and "Rich text" / "HTML"). */
export function blocksToHtml(
  blocks: readonly CopyBlock[],
  o: HtmlOptions = {},
): string {
  return htmlBlocks(blocks, o)
}

/** The words only, one block per line. */
export function blocksToPlain(blocks: readonly CopyBlock[]): string {
  const out: string[] = []
  const walk = (list: readonly CopyBlock[]) => {
    for (const b of list) {
      if (b.type === 'table') {
        for (const r of tableRows(b.content)) {
          out.push(r.map((c) => inlineText(c)).join('\t'))
        }
      } else if (b.content !== undefined && b.type !== 'divider') {
        out.push(inlineText(b.content))
      }
      walk(b.children ?? [])
    }
  }
  walk(blocks)
  return out.join('\n')
}

// ---- Our own lossless format ------------------------------------------------

/** BlockNote's own clipboard HTML for blocks (what paste reads back exactly). */
export function internalHtml(
  editor: Editor,
  blocks: readonly CopyBlock[],
): string | null {
  try {
    const schema = editor.pmSchema
    const nodes = blocks.map((b) => blockToNode(b as never, schema))
    const slice = new Slice(Fragment.from(nodes), 0, 0)
    return (
      editor.prosemirrorView?.serializeForClipboard(slice).dom.innerHTML ?? null
    )
  } catch {
    return null
  }
}

// ---- Writing to the clipboard ---------------------------------------------

/** The blocks a copy takes: the selection, else the cursor's block. */
export function copyTargetBlocks(editor: Editor): CopyBlock[] {
  const sel = editor.getSelection()
  if (sel) return editor.getSelectionCutBlocks().blocks as CopyBlock[]
  return [editor.getTextCursorPosition().block as CopyBlock]
}

/** Writes every format into a copy event's data. */
export function fillClipboardData(
  data: DataTransfer,
  editor: Editor,
  blocks: readonly CopyBlock[],
  /** Words inside one block: no block format, so they paste into a line. */
  inlineOnly = false,
): void {
  data.setData('text/plain', blocksToMarkdown(blocks))
  data.setData('text/html', blocksToHtml(blocks))
  const own = inlineOnly ? null : internalHtml(editor, blocks)
  if (own) data.setData('blocknote/html', own)
}

/** A picture alone: its block, else null. */
export function lonePicture(blocks: readonly CopyBlock[]): CopyBlock | null {
  return blocks.length === 1 &&
    blocks[0].type === 'image' &&
    str(blocks[0].props?.url) !== ''
    ? blocks[0]
    : null
}

/** Puts a picture on the clipboard as an image (converted to PNG). */
export async function copyPictureAsImage(
  editor: Editor,
  block: CopyBlock,
): Promise<boolean> {
  try {
    const src = str(block.props?.url)
    const url = editor.resolveFileUrl ? await editor.resolveFileUrl(src) : src
    const blob = await (await fetch(url)).blob()
    const png = blob.type === 'image/png' ? blob : await toPng(blob)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    return true
  } catch {
    return false
  }
}

async function toPng(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  canvas.getContext('2d')!.drawImage(bmp, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('png'))),
      'image/png',
    ),
  )
}

/**
 * Ctrl/Cmd+C and Ctrl/Cmd+X in a page editor: BlockNote has already written
 * its three formats; for whole blocks we replace the text ones with the clean
 * Markdown and rich HTML (the lossless format stays). A single picture also
 * goes as an image. Words inside one block are left to BlockNote.
 */
export function installCopyFormats(editor: Editor): () => void {
  const onCopy = (e: ClipboardEvent) => {
    const dom = editor.domElement
    const data = e.clipboardData
    if (!dom || !data || !dom.contains(e.target as Node)) return
    if (!data.types.includes('blocknote/html')) return
    const sel = editor.getSelection()
    const picked = editor.prosemirrorView?.state.selection as
      { node?: unknown } | undefined
    if (!sel && !picked?.node) return
    const blocks = (
      sel
        ? editor.getSelectionCutBlocks().blocks
        : [editor.getTextCursorPosition().block]
    ) as CopyBlock[]
    data.setData('text/plain', blocksToMarkdown(blocks))
    data.setData('text/html', blocksToHtml(blocks))
    const pic = lonePicture(blocks)
    if (pic) void copyPictureAsImage(editor, pic)
  }
  document.addEventListener('copy', onCopy)
  document.addEventListener('cut', onCopy)
  return () => {
    document.removeEventListener('copy', onCopy)
    document.removeEventListener('cut', onCopy)
  }
}

/** Old-fashioned copy command with our own data; false if refused. */
function copyWithEvent(fill: (data: DataTransfer) => void): boolean {
  const handler = (e: ClipboardEvent) => {
    if (!e.clipboardData) return
    e.preventDefault()
    e.stopImmediatePropagation()
    e.clipboardData.clearData()
    fill(e.clipboardData)
  }
  document.addEventListener('copy', handler, true)
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.removeEventListener('copy', handler, true)
  }
}

async function writeItem(items: Record<string, string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined') throw new Error('no items')
    const entry: Record<string, Blob> = {}
    for (const [type, text] of Object.entries(items)) {
      entry[type] = new Blob([text], { type })
    }
    await navigator.clipboard.write([new ClipboardItem(entry)])
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(items['text/plain'] ?? '')
      return true
    } catch {
      return false
    }
  }
}

/** Copy (all formats together) of the given blocks, or the selection. */
export async function copyBlocksAllFormats(
  editor: Editor,
  toast: (m: string) => void,
  blocks?: readonly CopyBlock[],
): Promise<string | null> {
  // Words inside one block copy as a line, not as a block.
  const inlineOnly =
    !blocks && !editor.getSelection() && !!editor.getSelectedText()
  const list = inlineOnly
    ? (editor.getSelectionCutBlocks().blocks as CopyBlock[]).map((b) => ({
        type: 'paragraph',
        content: b.content,
      }))
    : blocks
      ? [...blocks]
      : copyTargetBlocks(editor)
  const pic = lonePicture(list)
  if (pic && (await copyPictureAsImage(editor, pic))) {
    toast(t('copy.done'))
    return blocksToMarkdown(list)
  }
  let done = copyWithEvent((d) =>
    fillClipboardData(d, editor, list, inlineOnly),
  )
  if (!done) {
    done = await writeItem({
      'text/plain': blocksToMarkdown(list),
      'text/html': blocksToHtml(list),
    })
  }
  toast(done ? t('copy.done') : t('copy.blocked'))
  return done ? blocksToMarkdown(list) : null
}

/** "Copy as...": exactly one format. */
export async function copyBlocksAs(
  editor: Editor,
  kind: CopyKind,
  toast: (m: string) => void,
  blocks?: readonly CopyBlock[],
): Promise<boolean> {
  const list = blocks ? [...blocks] : copyTargetBlocks(editor)
  let done: boolean
  if (kind === 'markdown') {
    done = await writeItem({ 'text/plain': blocksToMarkdown(list) })
  } else if (kind === 'plain') {
    done = await writeItem({ 'text/plain': blocksToPlain(list) })
  } else if (kind === 'html') {
    done = await writeItem({ 'text/plain': blocksToHtml(list) })
  } else {
    const html = await embedPictures(
      blocksToHtml(list, { keepSrc: true }),
      (s) =>
        editor.resolveFileUrl ? editor.resolveFileUrl(s) : Promise.resolve(s),
    )
    done = await writeItem({
      'text/html': html,
      'text/plain': blocksToPlain(list),
    })
  }
  toast(done ? t('copy.done') : t('copy.blocked'))
  return done
}
