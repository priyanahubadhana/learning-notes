import type { SkillPart } from './promptModel'

/**
 * The answer format of a skill (`ln-skill/1`): ONE JSON object holding every
 * output of a run. This file describes it to the AI (the exact text is also
 * what Copy puts on the clipboard for the paste-in path) and reads it back
 * strictly: size limits, types, no HTML, links only http(s), numbers clamped.
 * Anything unknown is ignored; a pasted answer is data, never instructions.
 */

export const SKILL_FORMAT = 'ln-skill/1'

/** Largest answer read (characters). */
export const MAX_ANSWER_CHARS = 400_000
const MAX_POINTS = 200
const MAX_CARDS = 300
const MAX_PAGES = 40
const MAX_KEYWORDS = 60
const MAX_SOURCES = 100
const MAX_PAGE_BODY = 20_000

export type Level = 'must' | 'good' | 'extra'
export const CARD_KINDS = ['qa', 'cloze', 'truefalse', 'reverse'] as const
export type SkillCardKind = (typeof CARD_KINDS)[number]

/** Stars 8-10 Must know, 4-7 Good to know, 1-3 Extra. */
export const levelOf = (stars: number): Level =>
  stars >= 8 ? 'must' : stars >= 4 ? 'good' : 'extra'

/** The icon a Must-know point gets when the AI sent none. */
export const DEFAULT_ICON = '⭐'

export interface SkillSource {
  n: number
  title: string
  /** http or https only; '' when none. */
  url: string
}

export interface SkillPoint {
  text: string
  stars: number
  level: Level
  /** An emoji; always set for Must-know points. */
  icon: string
  topic: string
  /** Source numbers this point rests on. */
  sources: number[]
  /** False when no source backs it (shown "unchecked"), or a fact check doubted it. */
  checked: boolean
  /** Set by the fact check. */
  flag?: 'doubt' | 'wrong'
  note?: string
}

export interface SkillCard {
  kind: SkillCardKind
  q: string
  a: string
  /** Index of the point it tests, or null. */
  point: number | null
}

export interface SkillPage {
  title: string
  body: string
}

export interface SkillResult {
  title: string
  summary: string
  keywords: string[]
  sources: SkillSource[]
  points: SkillPoint[]
  pages: SkillPage[]
  cards: SkillCard[]
}

export type FormatProblem = 'empty' | 'tooLong' | 'notJson' | 'noContent'
export class SkillFormatError extends Error {
  problem: FormatProblem
  constructor(problem: FormatProblem) {
    super(problem)
    this.problem = problem
  }
}

// ------------------------------------------------------------ describing it

/** The format text for the AI, for the parts a skill makes. */
export function answerFormat(parts: readonly SkillPart[]): string {
  const has = (p: SkillPart) => parts.includes(p)
  const lines: string[] = [
    `  "format": "${SKILL_FORMAT}",`,
    '  "title": "short title",',
  ]
  if (has('summary')) {
    lines.push('  "summary": "the whole text in 2 to 4 short sentences",')
  }
  if (has('keywords')) {
    lines.push('  "keywords": ["keyword", "..."],')
  }
  lines.push(
    '  "sources": [{"n": 1, "title": "name of the source", "url": "https://... or empty"}],',
  )
  lines.push(
    '  "points": [{"text": "one key point", "stars": 9, "icon": "emoji", "topic": "group name", "sources": [1]}],',
  )
  if (has('pages')) {
    lines.push(
      '  "pages": [{"title": "page title", "body": "detailed notes in Markdown, with [1] marks after claims"}],',
    )
  }
  if (has('cards')) {
    lines.push(
      '  "cards": [{"kind": "qa|cloze|truefalse|reverse", "q": "question, or a sentence with {{hidden words}} for cloze, or a term for reverse", "a": "answer, or the meaning for reverse", "point": 0}]',
    )
  }
  return `{\n${lines.join('\n').replace(/,$/, '')}\n}`
}

/** The rules that go with the format. */
export function answerRules(parts: readonly SkillPart[]): string {
  const rules = [
    'Reply with ONE JSON object only: no code fence, no comments, no text around it. Use the same language as the text.',
    '"points": every important idea, most important first. "stars" is 1 to 10: 8-10 Must know, 4-7 Good to know, 1-3 Extra. Give "icon" (one emoji) to every point with 8 or more stars.',
    '"sources": list every source you can name (the text itself, works it cites, well-known references), numbered from 1. Each point lists in "sources" the numbers it rests on, or [] when no source backs it. Never invent a source.',
  ]
  if (parts.includes('pages')) {
    rules.push(
      '"pages": 2 to 8 detailed pages grouped by topic. Put [n] after a claim to name its source.',
    )
  }
  if (parts.includes('cards')) {
    rules.push(
      '"cards": at least one card for every Must know point ("point" = its index in "points", counting from 0). Mix the kinds: qa (question and answer), cloze (a sentence with {{hidden words}}), truefalse (a statement; "a" says True or False and why), reverse (term and meaning).',
    )
  }
  return rules.join('\n')
}

// ----------------------------------------------------------- reading it

/** Cleans a text: no control characters, spaces trimmed, cut to `max`. */
function clean(v: unknown, max: number, keepNewlines = false): string {
  if (typeof v !== 'string') return ''
  const noCtl = keepNewlines
    ? // eslint-disable-next-line no-control-regex
      v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : // eslint-disable-next-line no-control-regex
      v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ')
  return noCtl.trim().slice(0, max)
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const asList = (v: unknown, max: number): unknown[] =>
  Array.isArray(v) ? v.slice(0, max) : []

/** http(s) links only; anything else is dropped. */
export function safeUrl(v: unknown): string {
  const s = clean(v, 500)
  if (!s) return ''
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : ''
  } catch {
    return ''
  }
}

/** One emoji-like symbol, or ''. Letters, digits and markup characters are refused. */
export function safeIcon(v: unknown): string {
  const s = clean(v, 12)
  if (!s || !/\p{Extended_Pictographic}/u.test(s)) return ''
  return /[\p{L}\p{N}<>&"'`\\]/u.test(s) ? '' : s
}

function toStars(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return 5
  return Math.min(10, Math.max(1, Math.round(n)))
}

/** The JSON text of an answer, whatever the AI wrapped around it. */
function jsonText(raw: string): string {
  const text = raw.trim()
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(text)
  const body = fenced ? fenced[1].trim() : text
  if (body.startsWith('{')) return body
  // Some chats add a sentence before the object: take the outermost braces.
  const a = body.indexOf('{')
  const b = body.lastIndexOf('}')
  return a >= 0 && b > a ? body.slice(a, b + 1) : body
}

/**
 * Reads an answer (from the AI or pasted by hand). Throws `SkillFormatError`
 * when it is empty, too long, not JSON, or holds nothing usable.
 */
export function parseSkillAnswer(raw: string): SkillResult {
  if (typeof raw !== 'string' || !raw.trim())
    throw new SkillFormatError('empty')
  if (raw.length > MAX_ANSWER_CHARS) throw new SkillFormatError('tooLong')
  let data: unknown
  try {
    data = JSON.parse(jsonText(raw))
  } catch {
    throw new SkillFormatError('notJson')
  }
  if (!isObject(data)) throw new SkillFormatError('notJson')

  const sources: SkillSource[] = []
  const seen = new Set<number>()
  for (const s of asList(data.sources, MAX_SOURCES)) {
    if (!isObject(s)) continue
    const n = typeof s.n === 'number' ? Math.round(s.n) : sources.length + 1
    const title = clean(s.title, 300)
    if (!title || n < 1 || n > 9999 || seen.has(n)) continue
    seen.add(n)
    sources.push({ n, title, url: safeUrl(s.url) })
  }

  const points: SkillPoint[] = []
  for (const p of asList(data.points, MAX_POINTS)) {
    const text = isObject(p) ? clean(p.text, 1000) : clean(p, 1000)
    if (!text) continue
    const o = isObject(p) ? p : {}
    const stars = toStars(o.stars)
    const level = levelOf(stars)
    const cited = [
      ...new Set(
        asList(o.sources, 20).flatMap((n) =>
          typeof n === 'number' && seen.has(Math.round(n))
            ? [Math.round(n)]
            : [],
        ),
      ),
    ].sort((a, b) => a - b)
    points.push({
      text,
      stars,
      level,
      icon: safeIcon(o.icon) || (level === 'must' ? DEFAULT_ICON : ''),
      topic: clean(o.topic, 80),
      sources: cited,
      checked: cited.length > 0,
    })
  }

  const cards: SkillCard[] = []
  for (const c of asList(data.cards, MAX_CARDS)) {
    if (!isObject(c)) continue
    const kind = (CARD_KINDS as readonly unknown[]).includes(c.kind)
      ? (c.kind as SkillCardKind)
      : 'qa'
    const q = clean(c.q, 1000)
    const a = clean(c.a, 1000)
    if (!q) continue
    if (kind === 'cloze' ? !/\{\{[^}]+\}\}/.test(q) : !a) continue
    const idx = typeof c.point === 'number' ? Math.round(c.point) : -1
    cards.push({
      kind,
      q,
      a,
      point: idx >= 0 && idx < points.length ? idx : null,
    })
  }

  const pages: SkillPage[] = []
  for (const p of asList(data.pages, MAX_PAGES)) {
    if (!isObject(p)) continue
    const body = clean(p.body, MAX_PAGE_BODY, true)
    if (!body) continue
    pages.push({ title: clean(p.title, 200) || clean(data.title, 200), body })
  }

  const result: SkillResult = {
    title: clean(data.title, 200),
    summary: clean(data.summary, 3000, true),
    keywords: asList(data.keywords, MAX_KEYWORDS)
      .map((k) => clean(k, 80))
      .filter(Boolean),
    sources,
    points,
    pages,
    cards,
  }
  if (
    !result.points.length &&
    !result.pages.length &&
    !result.cards.length &&
    !result.summary &&
    !result.keywords.length
  ) {
    throw new SkillFormatError('noContent')
  }
  return result
}

/** The points a fact check marks; same strict reading. */
export function parseFactCheck(
  raw: string,
  count: number,
): { index: number; verdict: 'ok' | 'doubt' | 'wrong'; note: string }[] {
  let data: unknown
  try {
    data = JSON.parse(jsonText(raw))
  } catch {
    throw new SkillFormatError('notJson')
  }
  const list = isObject(data) ? asList(data.checks, MAX_POINTS) : []
  const out: {
    index: number
    verdict: 'ok' | 'doubt' | 'wrong'
    note: string
  }[] = []
  for (const c of list) {
    if (!isObject(c) || typeof c.i !== 'number') continue
    const index = Math.round(c.i)
    if (index < 0 || index >= count) continue
    const verdict =
      c.verdict === 'doubt' || c.verdict === 'wrong' ? c.verdict : 'ok'
    out.push({ index, verdict, note: clean(c.note, 300) })
  }
  return out
}
