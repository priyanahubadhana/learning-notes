import { createId } from '../core/ids'

/**
 * Anki fields are small pieces of HTML. Only the text (and bold / italic /
 * underline) is kept; everything else is dropped, so nothing from an
 * imported file can put markup or scripts into a note.
 */

export interface TextRun {
  type: 'text'
  text: string
  styles: Record<string, string | boolean>
}

type StyleName = 'bold' | 'italic' | 'underline'
interface Char {
  ch: string
  styles: Partial<Record<StyleName, true>>
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decode(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (whole, name: string) => {
      if (name[0] === '#') {
        const code =
          name[1] === 'x' || name[1] === 'X'
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : whole
      }
      return ENTITIES[name.toLowerCase()] ?? whole
    },
  )
}

const BLOCK_TAGS = new Set([
  'div',
  'p',
  'li',
  'ul',
  'ol',
  'tr',
  'table',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
])
const STYLE_TAGS: Record<string, StyleName> = {
  b: 'bold',
  strong: 'bold',
  i: 'italic',
  em: 'italic',
  u: 'underline',
}
const DROP_CONTENT = new Set(['script', 'style'])

/** One line of characters, each with its bold/italic/underline. */
function toLines(html: string): Char[][] {
  const lines: Char[][] = [[]]
  const open: Record<StyleName, number> = { bold: 0, italic: 0, underline: 0 }
  const newLine = () => lines.push([])
  const push = (text: string) => {
    const styles: Char['styles'] = {}
    for (const name of Object.keys(open) as StyleName[]) {
      if (open[name] > 0) styles[name] = true
    }
    for (const ch of text) {
      if (ch === '\n') newLine()
      else lines[lines.length - 1].push({ ch, styles })
    }
  }
  const source = html.replace(/\[sound:[^\]]*\]/g, '')
  let i = 0
  let skipUntil: string | null = null
  while (i < source.length) {
    if (source[i] !== '<') {
      const next = source.indexOf('<', i)
      const end = next === -1 ? source.length : next
      if (!skipUntil) push(decode(source.slice(i, end)).replace(/\r/g, ''))
      i = end
      continue
    }
    const close = source.indexOf('>', i)
    if (close === -1) {
      if (!skipUntil) push(decode(source.slice(i)))
      break
    }
    const tag = /^<\s*(\/?)\s*([a-z0-9]+)/i.exec(source.slice(i, close + 1))
    i = close + 1
    if (!tag) continue
    const closing = tag[1] === '/'
    const name = tag[2].toLowerCase()
    if (skipUntil) {
      if (closing && name === skipUntil) skipUntil = null
      continue
    }
    if (DROP_CONTENT.has(name) && !closing) skipUntil = name
    else if (name === 'br') newLine()
    else if (name === 'img')
      push('[image]') // pictures are not imported
    else if (BLOCK_TAGS.has(name)) newLine()
    else if (name in STYLE_TAGS) {
      const style = STYLE_TAGS[name]
      open[style] = Math.max(0, open[style] + (closing ? -1 : 1))
    }
  }
  return lines
}

const sameStyles = (a: Char['styles'], b: Char['styles']) =>
  !!a.bold === !!b.bold &&
  !!a.italic === !!b.italic &&
  !!a.underline === !!b.underline

/** Characters → runs (neighbours with the same styles share a run). */
function toRuns(chars: readonly (Char & { blank?: string })[]): TextRun[] {
  const runs: TextRun[] = []
  let last: (Char & { blank?: string }) | undefined
  for (const c of chars) {
    if (last && sameStyles(last.styles, c.styles) && last.blank === c.blank) {
      runs[runs.length - 1].text += c.ch
    } else {
      const styles: TextRun['styles'] = { ...c.styles }
      if (c.blank) styles.blank = c.blank
      runs.push({ type: 'text', text: c.ch, styles })
    }
    last = c
  }
  return runs
}

const trimLine = (line: Char[]): Char[] => {
  const text = line.map((c) => c.ch).join('')
  const start = text.length - text.trimStart().length
  const end = text.trimEnd().length
  return line.slice(start, end)
}

/**
 * A field's text as lines of runs (empty lines at the ends are dropped; a
 * run of empty lines in the middle becomes one).
 */
export function htmlToLines(html: string): TextRun[][] {
  const lines = toLines(html).map(trimLine)
  const out: Char[][] = []
  for (const line of lines) {
    if (line.length === 0 && (out.length === 0 || out.at(-1)!.length === 0)) {
      continue
    }
    out.push(line)
  }
  while (out.length > 0 && out.at(-1)!.length === 0) out.pop()
  return out.map((line) => toRuns(line))
}

/** Plain text of a field (lines joined with a newline). */
export function htmlToText(html: string): string {
  return htmlToLines(html)
    .map((line) => line.map((r) => r.text).join(''))
    .join('\n')
}

const CLOZE = /\{\{c(\d+)::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g

/**
 * A cloze field ("The {{c1::heart}} has {{c2::four}} chambers") as lines
 * whose hidden words carry a `blank` style. Deletions with the same number
 * share one blank id (one card), like Anki.
 */
export function clozeToLines(html: string): TextRun[][] {
  const ids = new Map<string, string>()
  const idFor = (n: string) => {
    let id = ids.get(n)
    if (!id) ids.set(n, (id = createId()))
    return id
  }
  const lines = toLines(html).map(trimLine)
  while (lines.length > 0 && lines[0].length === 0) lines.shift()
  while (lines.length > 0 && lines.at(-1)!.length === 0) lines.pop()
  return lines.map((line) => {
    const text = line.map((c) => c.ch).join('')
    const out: (Char & { blank?: string })[] = []
    let at = 0
    for (const m of text.matchAll(CLOZE)) {
      const start = m.index
      const answerStart = start + `{{c${m[1]}::`.length
      const answerEnd = answerStart + m[2].length
      out.push(...line.slice(at, start))
      for (const c of line.slice(answerStart, answerEnd)) {
        out.push({ ...c, blank: idFor(m[1]) })
      }
      at = start + m[0].length
    }
    out.push(...line.slice(at))
    return toRuns(out)
  })
}

/** True if a field uses Anki's cloze markers. */
export const hasCloze = (html: string): boolean => /\{\{c\d+::/.test(html)
