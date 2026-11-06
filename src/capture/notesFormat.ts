/**
 * The notes format any AI can fill (`ln-notes/1`, spec: docs/features/
 * ai-notes-format.md). A pure parser: Markdown in, a plain description out.
 * Tolerant of heading case, bold labels, code fences around the answer and
 * extra sections; strict about size.
 */

/** Largest text parsed (characters) and most cards kept. */
export const MAX_NOTES_CHARS = 2_000_000
export const MAX_CARDS = 500

export type ParsedCard =
  { kind: 'qa'; q: string; a: string } | { kind: 'cloze'; text: string }

export interface ParsedNotes {
  title: string
  keyPoints: string[]
  steps: string[]
  /** An indented bullet list, as written (feeds the mind map block). */
  mindMap: string
  cards: ParsedCard[]
  screenshots: { time: string; seconds: number; what: string }[]
  /** Any other section, kept in order as Markdown. */
  rest: { heading: string; body: string }[]
}

export class NotesFormatError extends Error {}

type SectionKind =
  'keyPoints' | 'steps' | 'mindMap' | 'cards' | 'screenshots' | 'other'

const NAMES: Record<Exclude<SectionKind, 'other'>, RegExp> = {
  keyPoints: /^(key\s*points?|key\s*takeaways?|main\s*points?|takeaways?)$/i,
  steps: /^(steps?|workflow|procedure|how\s*to|process)$/i,
  mindMap: /^(mind\s*-?\s*map|mindmap)$/i,
  cards: /^(cards?|flash\s*cards?|flashcards?|questions?)$/i,
  screenshots: /^(screenshots?|key\s*frames?|frames?|visuals?)$/i,
}

function kindOf(heading: string): SectionKind {
  // Letters, digits and spaces only: emoji, bold marks and colons go.
  const h = heading
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [kind, re] of Object.entries(NAMES)) {
    if (re.test(h)) return kind as SectionKind
  }
  return 'other'
}

/** "12:34" or "1:02:03" → seconds (0 when it is not a time). */
export function clockToSeconds(clock: string): number {
  const parts = clock.split(':').map(Number)
  if (parts.some((n) => !Number.isFinite(n)) || parts.length > 3) return 0
  return parts.reduce((total, n) => total * 60 + n, 0)
}

/** Strips a code fence an AI sometimes wraps its whole answer in. */
function unfence(text: string): string {
  const m = /^\s*```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i.exec(text)
  return m ? m[1] : text
}

const stripBullet = (line: string) =>
  line
    .replace(/^\s*(?:[-*•]|\d{1,3}[.)])\s+/, '')
    .replace(/\s+$/, '')
    .trim()

function parseCards(lines: string[]): ParsedCard[] {
  const cards: ParsedCard[] = []
  let q: string | null = null
  let a: string[] = []
  let into: 'q' | 'a' | null = null
  const flush = () => {
    if (q !== null && q.trim()) {
      cards.push({
        kind: 'qa',
        q: q.trim(),
        a: a.join(' ').trim(),
      } as ParsedCard)
    }
    q = null
    a = []
    into = null
  }
  const label = (s: string) =>
    s.replace(/^\s*(?:[-*•]\s+|\d{1,3}[.)]\s+)?/, '').replace(/\*\*|__/g, '')
  for (const raw of lines) {
    const line = label(raw)
    const cloze = /^cloze\s*:\s*(.+)$/i.exec(line)
    const question = /^(?:q|question)\s*\d*\s*[:.)]\s*(.*)$/i.exec(line)
    const answer = /^(?:a|answer)\s*\d*\s*[:.)]\s*(.*)$/i.exec(line)
    if (cloze) {
      flush()
      cards.push({ kind: 'cloze', text: cloze[1].trim() })
    } else if (question) {
      flush()
      q = question[1]
      into = 'q'
    } else if (answer && q !== null) {
      a = [answer[1]]
      into = 'a'
    } else if (line.trim() === '') {
      if (into === 'a') flush()
    } else if (into === 'a') a.push(line.trim())
    else if (into === 'q') q = `${q} ${line.trim()}`
  }
  flush()
  return cards.filter((c) => c.kind === 'cloze' || c.q)
}

/**
 * Parses an AI answer. Never throws for odd content; throws
 * `NotesFormatError` only when the text is too big or holds nothing usable.
 */
export function parseNotes(source: string): ParsedNotes {
  if (source.length > MAX_NOTES_CHARS) {
    throw new NotesFormatError('too big')
  }
  const text = unfence(source.replace(/\r\n?/g, '\n')).replace(
    /<!--[\s\S]*?-->/g,
    '',
  )
  const out: ParsedNotes = {
    title: '',
    keyPoints: [],
    steps: [],
    mindMap: '',
    cards: [],
    screenshots: [],
    rest: [],
  }
  type Section = { kind: SectionKind; heading: string; lines: string[] }
  const sections: Section[] = []
  let current: Section | null = null
  const preface: string[] = []
  for (const line of text.split('\n')) {
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (h) {
      const level = h[1].length
      if (level === 1 && !out.title && sections.length === 0) {
        out.title = h[2].replace(/[*_`]/g, '').trim()
        continue
      }
      current = { kind: kindOf(h[2]), heading: h[2].trim(), lines: [] }
      sections.push(current)
    } else if (current) current.lines.push(line)
    else preface.push(line)
  }
  // Text before the first section: a title line, or free text.
  const loose = preface.join('\n').trim()
  if (!out.title && loose && sections.length > 0) {
    const first = loose
      .split('\n')[0]
      .replace(/^\*\*(.*)\*\*$/, '$1')
      .trim()
    if (first.length <= 120 && !/^[-*•\d]/.test(first)) {
      out.title = first
      const rest = loose.split('\n').slice(1).join('\n').trim()
      if (rest) out.rest.push({ heading: '', body: rest })
    } else out.rest.push({ heading: '', body: loose })
  } else if (loose) out.rest.push({ heading: '', body: loose })

  for (const s of sections) {
    const body = s.lines.join('\n').trim()
    switch (s.kind) {
      case 'keyPoints':
        out.keyPoints.push(...s.lines.map(stripBullet).filter((l) => l !== ''))
        break
      case 'steps':
        out.steps.push(...s.lines.map(stripBullet).filter((l) => l !== ''))
        break
      case 'mindMap':
        out.mindMap += (out.mindMap ? '\n' : '') + body
        break
      case 'cards':
        out.cards.push(...parseCards(s.lines))
        break
      case 'screenshots':
        for (const line of s.lines) {
          const m =
            /^\s*(?:[-*•]\s+)?[[(]?\s*(\d{1,2}(?::\d{2}){1,2})\s*[\])]?\s*[-–—:]?\s*(.*)$/.exec(
              line,
            )
          if (m) {
            out.screenshots.push({
              time: m[1],
              seconds: clockToSeconds(m[1]),
              what: m[2].replace(/\*\*|__/g, '').trim(),
            })
          }
        }
        break
      default:
        if (body) out.rest.push({ heading: s.heading, body })
    }
  }
  out.cards = out.cards.slice(0, MAX_CARDS)
  const usable =
    out.keyPoints.length +
    out.steps.length +
    out.cards.length +
    out.screenshots.length +
    out.rest.length +
    (out.mindMap ? 1 : 0)
  if (usable === 0) throw new NotesFormatError('nothing found')
  return out
}

/** `{{word}}` or `{{c1::word}}` markers of a cloze line, as parts. */
export function clozeParts(text: string): { text: string; blank: boolean }[] {
  const parts: { text: string; blank: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(/\{\{(?:c\d+::)?([^}]+?)(?:::[^}]*)?\}\}/g)) {
    const at = m.index ?? 0
    if (at > last) parts.push({ text: text.slice(last, at), blank: false })
    parts.push({ text: m[1], blank: true })
    last = at + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), blank: false })
  return parts
}
