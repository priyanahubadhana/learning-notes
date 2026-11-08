import { t } from '../i18n/t'
import type { AppSchema } from './schema'
import { adopterIn } from '../ink/inkTransfer'

/**
 * Copy and paste beyond the browser's own Ctrl+C / Ctrl+V (which already
 * keep text, formatting, links and pictures, inside the app):
 *  - copy as plain text, copy as Markdown, copy the page with pictures
 *    (HTML + plain text, pictures embedded as data: URLs for Word / Gmail);
 *  - paste as plain text (menu item and Ctrl/Cmd+Shift+V);
 *  - cleaning pasted HTML (`sanitizePastedHtml`).
 * Pure helpers are separate from the functions that touch the clipboard.
 */

type Editor = AppSchema['BlockNoteEditor']
export type Toast = (message: string) => void

/** The parts of a block the plain-text export reads. */
interface TextBlock {
  content?: unknown
  children?: TextBlock[]
}

// ---- Plain text ----

/** The text of inline content (links give their words; styles are dropped). */
export function inlineText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((node: { type?: string; text?: string; content?: unknown }) =>
      node.type === 'link' ? inlineText(node.content) : (node.text ?? ''),
    )
    .join('')
}

/** One table cell is inline content, or an object holding it. */
const cellText = (cell: unknown): string =>
  inlineText(
    cell && typeof cell === 'object' && 'content' in cell
      ? (cell as { content: unknown }).content
      : cell,
  )

function blockLines(block: TextBlock, out: string[]): void {
  const content = block.content as
    { type?: string; rows?: { cells: unknown[] }[] } | unknown[] | undefined
  if (content && !Array.isArray(content) && content.type === 'tableContent') {
    for (const row of content.rows ?? []) {
      out.push(row.cells.map(cellText).join('\t'))
    }
  } else if (content !== undefined) {
    out.push(inlineText(content))
  }
  for (const child of block.children ?? []) blockLines(child, out)
}

/** The blocks' words, one block per line (children follow their parent). */
export function blocksToPlainText(blocks: readonly TextBlock[]): string {
  const lines: string[] = []
  for (const block of blocks) blockLines(block, lines)
  return lines.join('\n')
}

// ---- Cleaning pasted HTML ----

/** Elements dropped together with everything inside them. */
const DROP = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template',
  'svg', 'math', 'link', 'meta', 'head', 'title', 'form', 'button',
  'textarea', 'select', 'audio', 'video', 'canvas', 'frame', 'frameset',
]) // prettier-ignore

/** Elements kept; any other element is unwrapped (its content stays). */
const KEEP = new Set([
  'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol',
  'li', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike', 'code', 'pre',
  'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th',
  'td', 'hr', 'sub', 'sup', 'figure', 'figcaption', 'mark', 'details',
  'summary',
]) // prettier-ignore

/** The only attributes kept, per element. */
const ATTRS: Record<string, string[]> = {
  a: ['href'],
  img: ['src', 'alt'],
  details: ['open'],
  div: ['data-ln-callout'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
}

/** Links to web pages, mail and phone numbers only (no javascript:). */
export const isSafeHref = (value: string): boolean =>
  /^(https?:|mailto:|tel:)/i.test(value.trim())

/** Web pictures, pasted-in pictures and this app's own pictures. */
export const isSafeSrc = (value: string): boolean =>
  /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,|lnimg:)/i.test(
    value.trim(),
  )

/**
 * Notion's callout (`figure.callout`: an icon box, then the text) becomes a
 * plain div carrying only the icon, which our callout block reads. The icon
 * is cut to two characters; the rest of the figure is kept as text.
 */
function markCallouts(doc: Document): void {
  for (const fig of [...doc.querySelectorAll('figure.callout')]) {
    const icon = fig.querySelector('.icon, [class*="icon"]')
    const emoji = [...(icon?.textContent?.trim() ?? '')].slice(0, 2).join('')
    icon?.closest('div')?.remove()
    const box = doc.createElement('div')
    box.setAttribute('data-ln-callout', emoji || '💡')
    box.append(...[...fig.childNodes])
    fig.replaceWith(box)
  }
}

/**
 * An empty paragraph (Notion's blank line) is dropped by the parser unless it
 * holds a line break. Give each one a break, but keep at most one blank line
 * in a row and none at the very start or end of the paste.
 */
function keepBlankLines(body: HTMLElement): void {
  const isBlank = (el: Element | null) =>
    el?.tagName === 'P' &&
    !el.querySelector('img') &&
    (el.textContent ?? '').replace(/[\p{Cf}\s]/gu, '') === ''
  for (const p of [...body.querySelectorAll('p')]) {
    if (!isBlank(p)) continue
    const edge = !p.previousElementSibling || !p.nextElementSibling
    if (edge || isBlank(p.previousElementSibling)) p.remove()
    else p.replaceChildren(p.ownerDocument.createElement('br'))
  }
}

/**
 * Makes pasted HTML safe: scripts, styles, frames, forms and event handlers
 * go; only a small set of text elements and attributes stay; links and
 * pictures must use safe addresses. The result is parsed into a detached
 * document, so nothing in it runs or loads while cleaning.
 */
export function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  markCallouts(doc)
  const clean = (parent: Node) => {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === Node.COMMENT_NODE) {
        node.parentNode?.removeChild(node)
        continue
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const el = node as Element
      const tag = el.tagName.toLowerCase()
      if (DROP.has(tag)) {
        el.remove()
        continue
      }
      clean(el)
      if (!KEEP.has(tag)) {
        el.replaceWith(...el.childNodes) // unwrap: keep the words
        continue
      }
      const allowed = ATTRS[tag] ?? []
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase()
        const ok =
          allowed.includes(name) &&
          (name === 'href'
            ? isSafeHref(attr.value)
            : name === 'src'
              ? isSafeSrc(attr.value)
              : true)
        if (!ok) el.removeAttribute(attr.name)
      }
      if (tag === 'img' && !el.getAttribute('src')) el.remove()
    }
  }
  clean(doc.body)
  keepBlankLines(doc.body)
  return doc.body.innerHTML
}

// ---- Writing to the clipboard ----

/** Old-browser copy: a hidden text box and the copy command. */
function legacyCopy(text: string): boolean {
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  box.style.position = 'fixed'
  box.style.opacity = '0'
  document.body.appendChild(box)
  box.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    box.remove()
  }
}

/** Puts text on the clipboard; false if the browser refused. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return legacyCopy(text)
  }
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/**
 * Replaces every picture address in `html` with a data: URL, so the
 * pictures travel inside the copied page. `resolve` turns an address into
 * one that can be fetched (app pictures become blob: URLs). A picture that
 * cannot be read is left as it is.
 */
export async function embedPictures(
  html: string,
  resolve: (src: string) => Promise<string>,
): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const img of [...doc.querySelectorAll('img')]) {
    const src = img.getAttribute('src') ?? ''
    if (!src || src.startsWith('data:')) continue
    try {
      const url = await resolve(src)
      const blob = await (await fetch(url)).blob()
      img.setAttribute('src', await blobToDataUrl(blob))
    } catch {
      /* keep the address */
    }
  }
  // Nothing internal travels with the page: no ids, no editor attributes.
  for (const el of [...doc.body.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('data-') || attr.name === 'classname') {
        el.removeAttribute(attr.name)
      }
    }
  }
  // The empty line the editor keeps at the end stays out of the copy.
  const last = doc.body.lastElementChild
  if (
    last?.tagName === 'P' &&
    !last.querySelector('img') &&
    last.textContent?.replace(/￼/g, '').trim() === ''
  ) {
    last.remove()
  }
  return doc.body.innerHTML
}

// ---- What the menus call ----

type Blocks = Parameters<Editor['blocksToMarkdownLossy']>[0]

/** The words (or blocks) a menu copies: the selection, else the cursor's block. */
function selectionTarget(editor: Editor): { blocks: Blocks; text: string } {
  const selected = editor.getSelectedText()
  const cut = editor.getSelectionCutBlocks().blocks
  const blocks = (
    selected
      ? cut
      : (editor.getSelection()?.blocks ?? [
          editor.getTextCursorPosition().block,
        ])
  ) as Blocks
  return {
    blocks,
    text: selected || blocksToPlainText((blocks ?? []) as TextBlock[]),
  }
}

/** Copy as plain text / Markdown for the given blocks, or the selection. */
export async function copyAs(
  editor: Editor,
  kind: 'plain' | 'markdown',
  toast: Toast,
  blocks?: readonly unknown[],
  /** Cut: the lines' ink leaves with them (Phase Q rule 9). */
  cut = false,
): Promise<void> {
  const target = blocks
    ? {
        blocks: blocks as Blocks,
        text: blocksToPlainText(blocks as TextBlock[]),
      }
    : selectionTarget(editor)
  const text =
    kind === 'plain' ? target.text : editor.blocksToMarkdownLossy(target.blocks)
  const done = await copyText(text)
  // Rule 9: whole lines copied in the app carry their ink.
  const dom = editor.domElement
  const ink = dom ? adopterIn(dom) : null
  if (done && ink) {
    // A selection: only lines whose words it covers in full.
    const ids =
      !blocks && editor.getSelectedText()
        ? ink.wholeLines()
        : (target.blocks as { id: string }[]).map((b) => b.id)
    ink.copyLines(ids, text, cut)
  }
  toast(done ? t('copy.done') : t('copy.blocked'))
}

/** Copies the whole page: HTML with pictures inside, plus plain text. */
export async function copyPageWithPictures(
  editor: Editor,
  toast: Toast,
): Promise<void> {
  const blocks = editor.document
  const plain = blocksToPlainText(blocks as TextBlock[])
  try {
    if (typeof ClipboardItem === 'undefined') throw new Error('no items')
    const html = await embedPictures(editor.blocksToHTMLLossy(blocks), (src) =>
      editor.resolveFileUrl ? editor.resolveFileUrl(src) : Promise.resolve(src),
    )
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
    toast(t('copy.done'))
  } catch {
    // The browser blocked rich copy: the words still go.
    toast((await copyText(plain)) ? t('copy.doneTextOnly') : t('copy.blocked'))
  }
}

// ---- Paste as plain text ----

/** Puts text at the cursor as plain words: line breaks become new lines. */
export function insertPlainText(editor: Editor, text: string): void {
  const [first, ...rest] = text.replace(/\r\n?/g, '\n').split('\n')
  editor.insertInlineContent(first)
  if (rest.length === 0) return
  const here = editor.getTextCursorPosition().block
  const added = editor.insertBlocks(
    rest.map((line) => ({ type: 'paragraph', content: line })) as never,
    here,
    'after',
  )
  const last = added[added.length - 1]
  if (last) editor.setTextCursorPosition(last, 'end')
}

/** The menu item: reads the clipboard's text (needs permission) and pastes it. */
export async function pastePlainFromClipboard(
  editor: Editor,
  toast: Toast,
): Promise<void> {
  try {
    const text = await navigator.clipboard.readText()
    editor.focus()
    const dom = editor.domElement
    const ink = dom ? adopterIn(dom) : null
    // Rule 9: the copied lines' ink comes with them.
    if (ink) ink.pasteLines(text, () => insertPlainText(editor, text))
    else insertPlainText(editor, text)
    toast(t('paste.done'))
  } catch {
    toast(t('paste.blocked'))
  }
}

// ---- Ctrl/Cmd+Shift+V and cleaning on paste ----

let plainNext = false
let plainTimer = 0

/** True for Ctrl/Cmd+Shift+V. */
export const isPlainPasteKey = (e: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}) => e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v'

/** Remembers a Ctrl/Cmd+Shift+V; the paste that follows is plain text. */
export function noteKeyForPaste(e: KeyboardEvent): void {
  if (!isPlainPasteKey(e)) return
  plainNext = true
  window.clearTimeout(plainTimer)
  plainTimer = window.setTimeout(() => (plainNext = false), 1000)
}

const TSV_MAX_ROWS = 500
const TSV_MAX_COLS = 50
const TSV_MAX_CHARS = 200_000

/**
 * Tab-separated text (copied rows of a Notion database, a spreadsheet or an
 * HTML table without markup): rows of cells, or null when it is not a grid.
 * Every line needs a tab; the first line is never treated as a heading.
 */
export function tsvToRows(text: string): string[][] | null {
  if (text.length > TSV_MAX_CHARS || !text.includes('\t')) return null
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
  if (lines.length < 2 || lines.length > TSV_MAX_ROWS) return null
  if (lines.some((l) => !l.includes('\t'))) return null
  const rows = lines.map((l) => l.split('\t').map((c) => c.trim()))
  const cols = Math.max(...rows.map((r) => r.length))
  if (cols < 2 || cols > TSV_MAX_COLS) return null
  return rows.map((r) => [...r, ...Array(cols - r.length).fill('')])
}

/** Puts rows at the cursor as a Table block (replaces an empty line). */
function insertTable(editor: Editor, rows: string[][]): void {
  const here = editor.getTextCursorPosition().block
  const table = {
    type: 'table',
    content: {
      type: 'tableContent',
      rows: rows.map((cells) => ({
        cells: cells.map((c) => [{ type: 'text', text: c, styles: {} }]),
      })),
    },
  }
  const empty =
    Array.isArray(here.content) &&
    here.content.every((n) => (n as { text?: string }).text === '')
  if (empty || (Array.isArray(here.content) && here.content.length === 0)) {
    editor.replaceBlocks([here], [table] as never)
  } else {
    editor.insertBlocks([table] as never, here, 'after')
  }
}

/**
 * The editor's paste handler. Ctrl/Cmd+Shift+V: plain text only. Pasted HTML
 * from other apps is cleaned first. BlockNote's own copies (same page,
 * another page or notebook) keep everything, through the default handler.
 */
export function pasteHandler({
  event,
  editor,
  defaultPasteHandler,
}: {
  event: ClipboardEvent
  editor: unknown
  defaultPasteHandler: () => boolean | undefined
}): boolean | undefined {
  const data = event.clipboardData
  if (!data) return defaultPasteHandler()
  if (plainNext) {
    plainNext = false
    insertPlainText(editor as Editor, data.getData('text/plain'))
    return true
  }
  const html = data.getData('text/html')
  // Rows copied as text (Notion database rows, spreadsheets): a Table block.
  // Real <table> HTML goes the normal way below and stays a table.
  const grid = /<table[\s>]/i.test(html)
    ? null
    : tsvToRows(data.getData('text/plain'))
  if (grid && !data.types.includes('blocknote/html')) {
    insertTable(editor as Editor, grid)
    return true
  }
  if (html && !data.types.includes('blocknote/html')) {
    ;(editor as Editor).pasteHTML(sanitizePastedHtml(html))
    return true
  }
  // Several lines of plain text: one block per line (a single block with
  // line breaks cannot be moved off the gap between sheets line by line).
  const text = data.getData('text/plain')
  if (
    !html &&
    text.trim().includes('\n') &&
    !data.types.includes('blocknote/html')
  ) {
    insertPlainText(editor as Editor, text)
    return true
  }
  return defaultPasteHandler()
}
