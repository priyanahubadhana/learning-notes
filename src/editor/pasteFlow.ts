import { undo as undoPage } from '../core/historySteps'
import { t } from '../i18n/t'
import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../settings/settingsService'
import { isFlagOn } from '../app/flags'
import { readPref } from '../app/uiPrefs'
import { pasteModeSetting, type PasteMode } from '../settings/builtinSettings'
import type { LearningNotesDB } from '../core/db'
import type { AppSchema } from './schema'
import {
  insertPlainText,
  sanitizePastedHtml,
  takePlainNext,
  tsvToRows,
} from './clipboard'
import {
  fenceTrees,
  htmlHasFormatting,
  htmlHasStructure,
  looksLikeMarkdown,
  markdownTableRows,
  treeSegments,
} from './pasteSources'
import { embedProps, parseEmbedUrl } from './embed/embedUrl'
import { readAiConfig } from '../ai/route'
import { boxHost, pasteIntoNewBox } from './pasteBox'
import {
  hasWebPictures as textHasWebPictures,
  localizeHtml,
  localizeMarkdown,
} from '../images/remoteImages'

/**
 * The paste pipeline. Order: our own copies keep everything (BlockNote's
 * handler); then text/html (cleaned and normalised by source), then Markdown
 * looking text, then tree drawings, then tab-separated rows, then plain text.
 * Rich pastes can open the paste chooser (PasteChooser.tsx) and always leave
 * a small "Pasted as ..." chip that swaps the result in one Undo.
 */

type Editor = AppSchema['BlockNoteEditor']

export type PasteKind =
  'html' | 'markdown' | 'tree' | 'table' | 'database' | 'url' | 'text'

export type PasteChoice =
  'keep' | 'plain' | 'table' | 'link' | 'cleanup' | 'box'

/** Longest text one AI clean-up takes (cleanupAi.ts has the same limit). */
const CLEANUP_MAX = 24_000

export interface PastePlan {
  kind: PasteKind
  /** Sanitised HTML (kind html). */
  html?: string
  /** Markdown text (kind markdown). */
  markdown?: string
  /** Rows (kind table / database, and the "As table" choice). */
  rows?: string[][]
  /** First row is a header (database from a Notion table with <th>). */
  header?: string[]
  /** The plain text on the clipboard. */
  text: string
  /** The address (kind url). */
  url?: string
  /** Rich content worth asking about. */
  rich: boolean
  /** The Markdown came back from "Clean up with AI". */
  cleaned?: boolean
}

/** What the browser gave us (a ClipboardEvent's data, or a test double). */
export interface PasteData {
  html: string
  text: string
  /** True for copies made inside this app (BlockNote's own format). */
  own: boolean
}

// ---- Planning -------------------------------------------------------------

/** Notion's database view markers in clipboard HTML. */
export function isNotionDatabase(html: string): boolean {
  return /collection-content|notion-collection|notion-table-view|property-icon|data-block-id=["'][^"']*["'][^>]*>\s*<(table|div)[^>]*(collection|table-view)/i.test(
    html,
  )
}

/** Does the HTML look like it came from Notion at all? */
export const isNotionHtml = (html: string): boolean =>
  /notion|data-block-id|class=["'][^"']*(toggle|bulleted-list|numbered-list|collection)/i.test(
    html,
  )

/** Rows (and header) of the first HTML table, from its text. */
export function htmlTableRows(
  clean: string,
): { header: string[] | null; rows: string[][] } | null {
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  const table = doc.querySelector('table')
  if (!table) return null
  const cells = (tr: Element) =>
    [...tr.querySelectorAll('th, td')].map((c) =>
      (c.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )
  const trs = [...table.querySelectorAll('tr')]
  if (trs.length === 0) return null
  const headRow = trs[0].querySelector('th') ? cells(trs[0]) : null
  const body = (headRow ? trs.slice(1) : trs).map(cells)
  if (body.length === 0) return null
  const cols = Math.max(...body.map((r) => r.length), headRow?.length ?? 0)
  const pad = (r: string[]) => [...r, ...Array(cols - r.length).fill('')]
  return { header: headRow ? pad(headRow) : null, rows: body.map(pad) }
}

/** Decides what to do with a paste; null = leave it to the default handler. */
export function planPaste(data: PasteData): PastePlan | null {
  if (data.own) return null
  const { html, text } = data
  const grid = /<table[\s>]/i.test(html) ? null : tsvToRows(text)
  // A lone address (a video, a web page): embed, link or plain.
  const lone = parseEmbedUrl(text.trim())
  if (lone && !/\s/.test(text.trim()) && /^https?:\/\//i.test(text.trim())) {
    const words = html
      ? (
          new DOMParser().parseFromString(html, 'text/html').body.textContent ??
          ''
        ).trim()
      : text.trim()
    if (words === text.trim()) {
      return { kind: 'url', url: lone.url, text: text.trim(), rich: true }
    }
  }
  if (html) {
    const clean = sanitizePastedHtml(html)
    // Rows of a Notion database view: our Database block.
    if (isNotionDatabase(html) || (grid && isNotionHtml(html))) {
      const fromHtml = htmlTableRows(clean)
      const rows = fromHtml?.rows ?? grid
      if (rows && rows.length > 0 && rows[0].length >= 2) {
        return {
          kind: 'database',
          rows,
          header: fromHtml?.header ?? undefined,
          text,
          rich: true,
        }
      }
    }
    if (grid) return { kind: 'table', rows: grid, text, rich: true }
    if (!htmlHasStructure(clean) && looksLikeMarkdown(text)) {
      return {
        kind: 'markdown',
        markdown: fenceTrees(text),
        text,
        rich: true,
      }
    }
    if (
      !/<pre\b/i.test(clean) &&
      treeSegments(text) &&
      !htmlHasStructure(clean)
    ) {
      return { kind: 'tree', text, rich: true }
    }
    if (clean.trim() === '' && text.trim() !== '') {
      return text.includes('\n') ? { kind: 'text', text, rich: false } : null
    }
    return { kind: 'html', html: clean, text, rich: htmlHasFormatting(clean) }
  }
  if (grid) return { kind: 'table', rows: grid, text, rich: true }
  if (looksLikeMarkdown(text)) {
    return { kind: 'markdown', markdown: fenceTrees(text), text, rich: true }
  }
  if (treeSegments(text)) return { kind: 'tree', text, rich: true }
  if (text.trim().includes('\n')) return { kind: 'text', text, rich: false }
  return null
}

/** Is "Clean up with AI" offered: messy text, AI on with a key, not too long. */
export function cleanupOffered(plan: PastePlan): boolean {
  if (
    plan.cleaned ||
    !['html', 'markdown', 'text', 'tree'].includes(plan.kind)
  ) {
    return false
  }
  const n = plan.text.trim().length
  if (n < (plan.rich ? 40 : 200) || n > CLEANUP_MAX) return false
  const c = readAiConfig()
  return c.enabled && c.candidates.length > 0
}

/** The choices a plan offers (the first is "Keep original format"). */
export function choicesFor(
  plan: PastePlan,
  /** `box`: the editor is on a paper page (the paste can go in a new box). */
  o: { box?: boolean } = {},
): PasteChoice[] {
  const out: PasteChoice[] = ['keep']
  if (plan.kind === 'url') out.push('link')
  if (plan.rich) out.push('plain')
  const rows = plan.rows ?? tsvToRows(plan.text) ?? markdownTableRows(plan.text)
  if (
    rows &&
    plan.kind !== 'table' &&
    plan.kind !== 'database' &&
    plan.kind !== 'url'
  ) {
    out.push('table')
  }
  if (cleanupOffered(plan)) out.push('cleanup')
  if (o.box && plan.rich && !['url', 'database'].includes(plan.kind)) {
    out.push('box')
  }
  return out.length > 1 ? out : ['keep']
}

/** Rows for "As table". */
const tableRowsOf = (plan: PastePlan): string[][] | null =>
  plan.rows ?? tsvToRows(plan.text) ?? markdownTableRows(plan.text)

/** Is this address one that shows a player (YouTube, Vimeo, Loom, a video file)? */
const parsePlayer = (url: string): boolean => {
  const p = parseEmbedUrl(url)
  return !!p && p.provider !== 'link'
}

/** The text key naming a choice (an address says Embed / Link card / Plain URL). */
export function labelKey(plan: PastePlan, choice: PasteChoice): string {
  if (plan.kind === 'url') {
    if (choice === 'keep') {
      return parsePlayer(plan.url ?? '')
        ? 'pasteChooser.embed'
        : 'pasteChooser.linkCard'
    }
    if (choice === 'link') return 'pasteChooser.link'
    return 'pasteChooser.plainUrl'
  }
  if (choice === 'cleanup') return 'pasteChooser.cleanup'
  if (choice === 'box') return 'pasteChooser.asBox'
  return choice === 'keep'
    ? plan.cleaned
      ? 'pasteChooser.cleaned'
      : 'pasteChooser.keep'
    : choice === 'table'
      ? 'pasteChooser.asTable'
      : 'pasteChooser.plain'
}

/** One short line shown under an option. */
export function previewOf(plan: PastePlan, choice: PasteChoice): string {
  const clip = (s: string) => {
    const one = s.replace(/\s+/g, ' ').trim()
    return one.length > 60 ? `${one.slice(0, 57)}…` : one
  }
  if (choice === 'cleanup') return t('pasteChooser.preview.cleanup')
  if (choice === 'box') return t('pasteChooser.preview.box')
  if (choice === 'plain' || choice === 'link') return clip(plan.text)
  if (plan.kind === 'url') return clip(plan.url ?? plan.text)
  if (choice === 'table') {
    const r = tableRowsOf(plan)
    return r
      ? t('pasteChooser.preview.table', { rows: r.length, cols: r[0].length })
      : ''
  }
  if (plan.kind === 'database' && plan.rows) {
    return t('pasteChooser.preview.database', { rows: plan.rows.length })
  }
  if (plan.kind === 'table' && plan.rows) {
    return t('pasteChooser.preview.table', {
      rows: plan.rows.length,
      cols: plan.rows[0].length,
    })
  }
  if (plan.kind === 'tree') return t('pasteChooser.preview.tree')
  const source = plan.html ?? plan.markdown ?? ''
  const count = (re: RegExp) => (source.match(re) ?? []).length
  const bits: string[] = []
  const h = count(plan.html ? /<h[1-6]\b/gi : /^#{1,6}\s/gm)
  const tb = count(plan.html ? /<table\b/gi : /^\s*\|?\s*:?-{3,}/gm)
  const li = count(plan.html ? /<li\b/gi : /^\s*([-*+]|\d+[.)])\s/gm)
  if (h)
    bits.push(
      h === 1
        ? t('pasteChooser.preview.heading')
        : t('pasteChooser.preview.headings', { n: h }),
    )
  if (tb) bits.push(t('pasteChooser.preview.tables', { n: tb }))
  if (li) bits.push(t('pasteChooser.preview.items', { n: li }))
  return clip(bits.length ? bits.join(' · ') : plan.text)
}

// ---- Applying -------------------------------------------------------------

/** Where the editor lives (set by PageEditor) for pastes that make records. */
export interface PasteContext {
  db: LearningNotesDB
  notebookId: string
  toast: (
    message: string,
    action?: { label: string; onSelect: () => void },
  ) => void
}
let context: PasteContext | null = null
export const pasteContext = (): PasteContext | null => context
export const setPasteContext = (c: PasteContext | null): void => {
  context = c
}

/** Puts blocks at the cursor (replaces an empty line); cursor ends after them. */
export function insertBlocksAtCursor(editor: Editor, blocks: unknown[]): void {
  if (blocks.length === 0) return
  const here = editor.getTextCursorPosition().block
  const empty =
    here.type === 'paragraph' &&
    Array.isArray(here.content) &&
    here.content.every((n) => (n as { text?: string }).text === '')
  const added = empty
    ? editor.replaceBlocks([here], blocks as never).insertedBlocks
    : editor.insertBlocks(blocks as never, here, 'after')
  const last = added[added.length - 1]
  if (last) editor.setTextCursorPosition(last, 'end')
}

const tableBlock = (rows: string[][]) => ({
  type: 'table',
  content: {
    type: 'tableContent',
    rows: rows.map((cells) => ({
      cells: cells.map((c) => [{ type: 'text', text: c, styles: {} }]),
    })),
  },
})

/** Tree drawings stay in a code-style block (spaces kept); other lines stay lines. */
function treeBlocks(text: string): unknown[] {
  const out: unknown[] = []
  for (const seg of treeSegments(text) ?? []) {
    if (seg.code) {
      out.push({ type: 'codeBlock', content: seg.text.replace(/\s+$/, '') })
    } else {
      for (const line of seg.text.split('\n')) {
        out.push({ type: 'paragraph', content: line })
      }
    }
  }
  return out
}

/** Makes a Database block from pasted rows (first column = title). */
async function databaseBlock(plan: PastePlan): Promise<unknown | null> {
  if (!context || !plan.rows) return null
  const { db, notebookId } = context
  const notebook = await db.notebooks.get(notebookId)
  if (!notebook) return null
  const { createDatabase } = await import('../databases/databaseService')
  const { importCsvRows, guessType } = await import('../databases/csvTransfer')
  const database = await createDatabase(
    db,
    notebook.workspaceId,
    notebook.kind ? null : notebook.id,
  )
  const cols = plan.rows[0].length
  const header =
    plan.header ??
    Array.from({ length: cols }, (_, i) =>
      i === 0
        ? t('database.titleColumn')
        : t('pasteChooser.column', { n: i + 1 }),
    )
  const mapping = header.map((_, c) =>
    c === 0
      ? { kind: 'title' as const }
      : {
          kind: 'new' as const,
          type: guessType(plan.rows!.map((r) => r[c] ?? '')) as never,
        },
  )
  await importCsvRows(db, database.id, header, plan.rows, mapping)
  return { type: 'database', props: { databaseId: database.id } }
}

/** The pasted content as editor blocks (for a new box). */
async function blocksOfPlan(
  editor: Editor,
  plan: PastePlan,
): Promise<unknown[]> {
  switch (plan.kind) {
    case 'html':
      return editor.tryParseHTMLToBlocks(plan.html ?? '')
    case 'markdown':
      return editor.tryParseMarkdownToBlocks(plan.markdown ?? '')
    case 'tree':
      return treeBlocks(plan.text)
    case 'table':
      return [tableBlock(plan.rows ?? [])]
    default:
      return plan.text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => ({ type: 'paragraph', content: line }))
  }
}

/** "As text box": the paste goes into a new box at the paste spot. */
async function applyAsBox(editor: Editor, plan: PastePlan): Promise<void> {
  if (!context) return
  const undo = await pasteIntoNewBox(
    context.db,
    editor,
    (await blocksOfPlan(editor, plan)) as never,
  )
  if (!undo) {
    // No paper around the editor: the paste goes in as it would have.
    await applyPaste(editor, plan, 'keep')
    return
  }
}

/** Runs a choice. Resolves when the content is in the page. */
export async function applyPaste(
  editor: Editor,
  plan: PastePlan,
  choice: PasteChoice,
): Promise<void> {
  if (choice === 'plain') {
    editor.transact(() => insertPlainText(editor, plan.text))
    return
  }
  if (choice === 'link') {
    editor.transact(() =>
      editor.insertInlineContent([
        { type: 'link', href: plan.url ?? plan.text, content: plan.text },
      ] as never),
    )
    return
  }
  if (choice === 'box') return applyAsBox(editor, plan)
  if (choice === 'table') {
    const rows = tableRowsOf(plan)
    if (rows)
      editor.transact(() => insertBlocksAtCursor(editor, [tableBlock(rows)]))
    return
  }
  switch (plan.kind) {
    case 'html':
      editor.pasteHTML(plan.html ?? '')
      return
    case 'markdown': {
      const blocks = await editor.tryParseMarkdownToBlocks(plan.markdown ?? '')
      editor.transact(() => insertBlocksAtCursor(editor, blocks))
      return
    }
    case 'tree':
      editor.transact(() => insertBlocksAtCursor(editor, treeBlocks(plan.text)))
      return
    case 'url': {
      const parsed = parseEmbedUrl(plan.url ?? plan.text)
      if (!parsed) return
      const props = embedProps(parsed)
      editor.transact(() =>
        insertBlocksAtCursor(editor, [{ type: 'embed', props }]),
      )
      return
    }
    case 'table':
      editor.transact(() =>
        insertBlocksAtCursor(editor, [tableBlock(plan.rows ?? [])]),
      )
      return
    case 'database': {
      const block = await databaseBlock(plan)
      editor.transact(() =>
        insertBlocksAtCursor(editor, [block ?? tableBlock(plan.rows ?? [])]),
      )
      return
    }
    default:
      editor.transact(() => insertPlainText(editor, plan.text))
  }
}

// ---- The chooser and the chip (React side: PasteChooser.tsx) --------------

export interface ChooserRequest {
  owner: unknown
  plan: PastePlan
  choices: PasteChoice[]
  pick: (choice: PasteChoice, remember: boolean) => void
  cancel: () => void
}
export interface ChipState {
  owner: unknown
  plan: PastePlan
  choices: PasteChoice[]
  current: PasteChoice
  swap: (choice: PasteChoice) => void
}
/** "Clean up with AI" waiting for the owner (CleanupDialog.tsx). */
export interface CleanupRequest {
  owner: unknown
  plan: PastePlan
  /** Puts the cleaned Markdown in the page (and shows the chip). */
  insert: (markdown: string) => void
  cancel: () => void
}
type Ui = {
  chooser: ChooserRequest | null
  chip: ChipState | null
  cleanup: CleanupRequest | null
}
let ui: Ui = { chooser: null, chip: null, cleanup: null }
const listeners = new Set<() => void>()
export const pasteUiSubscribe = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const pasteUiState = (): Ui => ui
const setUi = (next: Partial<Ui>): void => {
  ui = { ...ui, ...next }
  for (const fn of listeners) fn()
}
export const closePasteUi = (): void =>
  setUi({ chooser: null, chip: null, cleanup: null })

const hasWebPictures = (plan: PastePlan): boolean =>
  textHasWebPictures(plan.html ?? plan.markdown ?? '')

/**
 * Web pictures in a paste are copied into the app first (when their server
 * allows it); the ones that cannot be copied show a "Load remote image"
 * card in the page instead of loading by themselves.
 */
export async function withLocalImages(plan: PastePlan): Promise<PastePlan> {
  const db = context?.db
  if (!db) return plan
  if (plan.html) return { ...plan, html: await localizeHtml(db, plan.html) }
  if (plan.markdown) {
    return { ...plan, markdown: await localizeMarkdown(db, plan.markdown) }
  }
  return plan
}

/** Does the work of a pick and shows the chip that can swap it. */
export async function run(
  editor: Editor,
  plan: PastePlan,
  choices: PasteChoice[],
  choice: PasteChoice,
): Promise<void> {
  // Only a paste with web pictures waits (a plain one lands at once).
  if (hasWebPictures(plan)) plan = await withLocalImages(plan)
  await applyPaste(editor, plan, choice)
  // A box has its own Undo (the toast); no chip.
  if (choice === 'box') return setUi({ chip: null })
  // The chip swaps between forms of the same paste; a clean-up is its own step.
  choices = choices.filter((c) => c !== 'cleanup' && c !== 'box')
  if (choices.length < 2) return setUi({ chip: null })
  setUi({
    chip: {
      owner: editor,
      plan,
      choices,
      current: choice,
      swap: (next) => {
        if (next === choice) return
        // One Undo: take the paste back, then put the other form in.
        void undoPage().then(() => run(editor, plan, choices, next))
      },
    },
  })
}

/** Opens the clean-up step; its Insert runs the cleaned Markdown as a paste. */
export function openCleanup(editor: Editor, plan: PastePlan): void {
  setUi({
    cleanup: {
      owner: editor,
      plan,
      cancel: () => {
        setUi({ cleanup: null })
        editor.focus()
      },
      insert: (markdown) => {
        setUi({ cleanup: null })
        editor.focus()
        const cleaned: PastePlan = {
          kind: 'markdown',
          markdown,
          text: plan.text,
          rich: true,
          cleaned: true,
        }
        void run(editor, cleaned, ['keep', 'plain'], 'keep')
      },
    },
  })
}

/**
 * The "Paste as" setting. With flag page.menus "Keep original" is the default
 * until the owner picks one (PM-43); "Always ask" keeps today's chooser.
 */
function effectivePasteMode(): PasteMode {
  const mode = readDeviceSetting(pasteModeSetting)
  if (!isFlagOn('page.menus')) return mode
  const stored = readPref<string>(
    pasteModeSetting.id,
    (v): v is string => typeof v === 'string',
    '',
  )
  return stored ? mode : 'keep'
}

/** Ctrl/Cmd+Shift+V waits here (kept in clipboard.ts for its key note). */
export function pasteWith(
  editor: Editor,
  data: PasteData,
  plain: boolean,
): boolean {
  if (plain) {
    insertPlainText(editor, data.text)
    return true
  }
  const plan = planPaste(data)
  if (!plan) return false
  const choices = choicesFor(plan, { box: !!boxHost(editor) })
  const mode = effectivePasteMode()
  setUi({ chip: null })
  if (
    (plan.rich || choices.includes('cleanup')) &&
    choices.length > 1 &&
    mode === 'ask'
  ) {
    setUi({
      chooser: {
        owner: editor,
        plan,
        choices,
        pick: (choice, remember) => {
          setUi({ chooser: null })
          if (choice === 'cleanup') return openCleanup(editor, plan)
          if (choice === 'box') {
            editor.focus()
            return void run(editor, plan, choices, 'box')
          }
          if (remember && (choice === 'keep' || choice === 'plain')) {
            writeDeviceSetting(
              pasteModeSetting,
              choice === 'plain' ? 'plain' : 'keep',
            )
          }
          editor.focus()
          void run(editor, plan, choices, choice)
        },
        cancel: () => {
          setUi({ chooser: null })
          editor.focus()
        },
      },
    })
    return true
  }
  void run(
    editor,
    plan,
    choices,
    plan.rich && mode === 'plain' ? 'plain' : 'keep',
  )
  return true
}

/**
 * The editor's paste handler. Ctrl/Cmd+Shift+V: plain text only. BlockNote's
 * own copies (same page, another page or notebook) keep everything through
 * the default handler; everything else goes through the pipeline above.
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
  const plain = takePlainNext()
  const ok = pasteWith(
    editor as Editor,
    {
      html: data.getData('text/html'),
      text: data.getData('text/plain'),
      own: data.types.includes('blocknote/html'),
    },
    plain,
  )
  return ok ? true : defaultPasteHandler()
}
