/**
 * Markdown for the online connector's read tools. A SMALL COPY of
 * mcp/src/markdown.ts (Deno cannot import that package's extension-less
 * files); `src/connector/parity.test.ts` runs both on the same blocks and
 * checks the output is identical, so they cannot drift apart.
 */
import type { Block, Json } from './notesModel.ts'

/** Same order as the app: the order key, then the id. */
export const byOrder = (
  a: { order: string; id: string },
  b: { order: string; id: string },
) => (a.order < b.order ? -1 : a.order > b.order ? 1 : a.id < b.id ? -1 : 1)

type Obj = { [k: string]: Json }
const isObj = (v: Json | undefined): v is Obj =>
  !!v && typeof v === 'object' && !Array.isArray(v)

function runLabel(run: Obj): string {
  if (typeof run.text === 'string') return run.text
  const props = run.props
  if (isObj(props) && typeof props.label === 'string') return props.label
  return ''
}

/** Plain text of rich-text runs; the blank `blankId` shows as an ellipsis. */
export function plain(runs: Json | undefined, blankId?: string): string {
  let out = ''
  let inBlank = false
  const visit = (list: Json | undefined) => {
    if (!Array.isArray(list)) return
    for (const run of list) {
      if (!isObj(run)) continue
      const styles = run.styles
      if (blankId !== undefined && isObj(styles) && styles.blank === blankId) {
        if (!inBlank) out += '…'
        inBlank = true
        continue
      }
      inBlank = false
      out += runLabel(run)
      visit(run.content)
    }
  }
  visit(runs)
  return out.trim()
}

/** Rich-text runs as inline Markdown. */
export function inline(runs: Json | undefined): string {
  if (!Array.isArray(runs)) return ''
  let out = ''
  for (const run of runs) {
    if (!isObj(run)) continue
    if (run.type === 'link' && typeof run.href === 'string') {
      out += `[${inline(run.content)}](${run.href})`
      continue
    }
    let text = runLabel(run)
    if (!text) continue
    const s = isObj(run.styles) ? run.styles : {}
    if (s.code) text = '`' + text + '`'
    else {
      const lead = /^\s*/.exec(text)![0]
      const trail = /\s*$/.exec(text)![0]
      let core = text.trim()
      if (core) {
        if (s.bold) core = `**${core}**`
        if (s.italic) core = `*${core}*`
        if (s.strike) core = `~~${core}~~`
        text = lead + core + trail
      }
    }
    out += text
  }
  return out
}

function table(content: Obj): string {
  const t = content.text
  if (!isObj(t) || !Array.isArray(t.rows)) return ''
  const rows = t.rows.map((row) => {
    const cells = isObj(row) && Array.isArray(row.cells) ? row.cells : []
    return cells.map((c) =>
      inline(isObj(c) ? c.content : c)
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' '),
    )
  })
  if (rows.length === 0) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (r: string[]) =>
    `| ${[...r, ...Array<string>(width - r.length).fill('')].join(' | ')} |`
  return [
    pad(rows[0]),
    pad(Array<string>(width).fill('---')),
    ...rows.slice(1).map(pad),
  ].join('\n')
}

const LIST = /^(bulletListItem|numberedListItem|checkListItem|toggleListItem)$/

/** One block (without its children) as Markdown. */
function one(b: Block, n: number): string {
  const c = b.content
  const text = inline(c.text)
  switch (b.type) {
    case 'heading': {
      const level = Math.min(Math.max(Number(c.level) || 1, 1), 3)
      return `${'#'.repeat(level)} ${text}`
    }
    case 'bulletListItem':
    case 'toggleListItem':
      return `- ${text}`
    case 'numberedListItem':
      return `${n}. ${text}`
    case 'checkListItem':
      return `- [${c.checked ? 'x' : ' '}] ${text}`
    case 'quote':
      return `> ${text}`
    case 'callout':
      return `> ${typeof c.emoji === 'string' ? c.emoji + ' ' : ''}${text}`
    case 'divider':
      return '---'
    case 'codeBlock': {
      const lang =
        typeof c.language === 'string' && c.language !== 'plaintext'
          ? c.language
          : ''
      return '```' + lang + '\n' + plain(c.text) + '\n```'
    }
    case 'image':
      return typeof c.caption === 'string' && c.caption
        ? `[Picture: ${c.caption}]`
        : '[Picture]'
    case 'table':
      return table(c)
    case 'math':
      return typeof c.latex === 'string' ? `$$${c.latex}$$` : ''
    case 'card':
      return `**Card.** Question: ${text}`
    case 'paragraph':
      return text
    default:
      return text || `[${b.type}]`
  }
}

/** A page's live blocks as Markdown, in reading order. */
export function blocksToMarkdown(blocks: readonly Block[]): string {
  const live = blocks.filter((b) => !b.deletedAt && !b.purgedAt)
  const ids = new Set(live.map((b) => b.id))
  const kids = new Map<string | null, Block[]>()
  for (const b of live) {
    // A block whose parent is gone is shown at the top level.
    const key = b.parentId && ids.has(b.parentId) ? b.parentId : null
    kids.set(key, [...(kids.get(key) ?? []), b])
  }
  const lines: { md: string; list: boolean }[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null, depth: number) => {
    let n = 0
    for (const b of (kids.get(parent) ?? []).sort(byOrder)) {
      if (seen.has(b.id)) continue
      seen.add(b.id)
      n = b.type === 'numberedListItem' ? n + 1 : 0
      const md = one(b, n)
      if (md !== '') {
        const list = LIST.test(b.type)
        const indent = '  '.repeat(depth)
        lines.push({
          md: list
            ? md
                .split('\n')
                .map((l) => indent + l)
                .join('\n')
            : md,
          list,
        })
      }
      walk(b.id, depth + 1)
    }
  }
  walk(null, 0)
  let text = ''
  lines.forEach((l, i) => {
    if (i > 0) text += l.list && lines[i - 1].list ? '\n' : '\n\n'
    text += l.md
  })
  return text
}
