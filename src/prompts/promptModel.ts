import type { Page } from '../core/types'
import { isProviderId, type ProviderId } from '../ai/provider'

/**
 * The prompt library as plain objects. Each prompt or skill is one row of
 * the built-in "Prompt library" database (`Database.kind = 'promptLibrary'`);
 * this file turns a row into a `PromptItem` and back. Pure, no DOM.
 */

export const PURPOSES = [
  'understand',
  'summarise',
  'keyPoints',
  'recall',
  'check',
  'practise',
  'write',
  'plan',
] as const
export type Purpose = (typeof PURPOSES)[number]

export const INPUT_KINDS = ['text', 'page', 'pdf'] as const
export type InputKind = (typeof INPUT_KINDS)[number]

export const OUTPUT_KINDS = ['answer', 'notes', 'cards', 'studySet'] as const
export type OutputKind = (typeof OUTPUT_KINDS)[number]

/** What a skill makes from one input. */
export const SKILL_PARTS = [
  'pages',
  'keywords',
  'summary',
  'mindMap',
  'rows',
  'cards',
  'sources',
] as const
export type SkillPart = (typeof SKILL_PARTS)[number]

/** Column keys of the library database (`DbColumn.config.key`). */
export const LIB_KEYS = [
  'kind',
  'purpose',
  'input',
  'output',
  'subjects',
  'text',
  'provider',
  'model',
  'usePreferred',
  'stars',
  'versions',
  'ratings',
  'parts',
  'starterId',
  'licence',
] as const
export type LibKey = (typeof LIB_KEYS)[number]

export interface PromptVersion {
  at: number
  text: string
}
export interface PromptRating {
  at: number
  stars: number
  /** Number of older versions when it was rated (0 = the first text). */
  version: number
}

export interface PromptItem {
  /** The row page's id ('' for a prompt not saved yet). */
  id: string
  name: string
  kind: 'prompt' | 'skill'
  purpose: Purpose
  input: InputKind
  output: OutputKind
  subjects: string[]
  text: string
  provider: ProviderId | ''
  model: string
  usePreferred: boolean
  /** Average of the result ratings, 0-5 (0 = none yet). */
  stars: number
  versions: PromptVersion[]
  ratings: PromptRating[]
  parts: SkillPart[]
  starterId: string
  licence: string
}

export const MAX_VERSIONS = 30
export const MAX_RATINGS = 100
export const MAX_NAME = 200
export const MAX_PROMPT_TEXT = 20_000

const oneOf = <T extends string>(list: readonly T[], v: unknown, d: T): T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)
    ? (v as T)
    : d

export function newPrompt(kind: 'prompt' | 'skill' = 'prompt'): PromptItem {
  return {
    id: '',
    name: '',
    kind,
    purpose: kind === 'skill' ? 'summarise' : 'understand',
    input: 'text',
    output: kind === 'skill' ? 'studySet' : 'answer',
    subjects: [],
    text: '',
    provider: '',
    model: '',
    usePreferred: false,
    stars: 0,
    versions: [],
    ratings: [],
    parts: kind === 'skill' ? [...SKILL_PARTS] : [],
    starterId: '',
    licence: '',
  }
}

const listOf = (raw: unknown): unknown[] => {
  if (typeof raw !== 'string' || raw === '') return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Reads the stored JSON list of versions (damaged entries are dropped). */
export function parseVersions(raw: unknown): PromptVersion[] {
  return listOf(raw)
    .flatMap((v) => {
      const o = v as Partial<PromptVersion> | null
      return o && typeof o.at === 'number' && typeof o.text === 'string'
        ? [{ at: o.at, text: o.text.slice(0, MAX_PROMPT_TEXT) }]
        : []
    })
    .slice(-MAX_VERSIONS)
}

export function parseRatings(raw: unknown): PromptRating[] {
  return listOf(raw)
    .flatMap((v) => {
      const o = v as Partial<PromptRating> | null
      return o &&
        typeof o.at === 'number' &&
        typeof o.stars === 'number' &&
        o.stars >= 1 &&
        o.stars <= 5 &&
        typeof o.version === 'number'
        ? [{ at: o.at, stars: Math.round(o.stars), version: o.version }]
        : []
    })
    .slice(-MAX_RATINGS)
}

export const subjectList = (raw: string): string[] =>
  [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLocaleLowerCase().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 12)

/** Average of ratings, one decimal (0 when none). */
export function averageStars(ratings: readonly PromptRating[]): number {
  if (ratings.length === 0) return 0
  const sum = ratings.reduce((n, r) => n + r.stars, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

/** One row page → an item. `cell` gives the stored value of a column key. */
export function itemFromRow(
  row: Pick<Page, 'id' | 'title'>,
  cell: (key: LibKey) => unknown,
): PromptItem {
  const str = (k: LibKey) => {
    const v = cell(k)
    return typeof v === 'string' ? v : ''
  }
  const provider = str('provider')
  const parts = str('parts')
    .split(',')
    .filter((p): p is SkillPart =>
      (SKILL_PARTS as readonly string[]).includes(p),
    )
  const ratings = parseRatings(str('ratings'))
  return {
    id: row.id,
    name: row.title,
    kind: str('kind') === 'skill' ? 'skill' : 'prompt',
    purpose: oneOf(PURPOSES, str('purpose'), 'understand'),
    input: oneOf(INPUT_KINDS, str('input'), 'text'),
    output: oneOf(OUTPUT_KINDS, str('output'), 'answer'),
    subjects: subjectList(str('subjects')),
    text: str('text'),
    provider: isProviderId(provider) ? provider : '',
    model: str('model').slice(0, 100),
    usePreferred: cell('usePreferred') === true,
    // The cell shows whole stars; the exact average comes from the ratings.
    stars: averageStars(ratings),
    versions: parseVersions(str('versions')),
    ratings,
    parts,
    starterId: str('starterId'),
    licence: str('licence'),
  }
}

/** Cell values of an item, by column key. */
export function itemToCells(item: PromptItem): Record<LibKey, unknown> {
  return {
    kind: item.kind,
    purpose: item.purpose,
    input: item.input,
    output: item.output,
    subjects: item.subjects.join(', '),
    text: item.text.slice(0, MAX_PROMPT_TEXT),
    provider: item.provider,
    model: item.model,
    usePreferred: item.usePreferred,
    stars: item.stars,
    versions: JSON.stringify(item.versions.slice(-MAX_VERSIONS)),
    ratings: JSON.stringify(item.ratings.slice(-MAX_RATINGS)),
    parts: item.parts.join(','),
    starterId: item.starterId,
    licence: item.licence,
  }
}

export interface LibraryFilter {
  q: string
  purpose: Purpose | ''
  subject: string
  kind: 'prompt' | 'skill' | ''
}

/**
 * Full-text search and filters over the loaded items. Ranking: name, then
 * subjects, then prompt text; ties keep the library order. Every word typed
 * must appear somewhere.
 */
export function filterItems(
  items: readonly PromptItem[],
  f: LibraryFilter,
): PromptItem[] {
  const words = f.q.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const scored: { item: PromptItem; score: number; at: number }[] = []
  items.forEach((item, at) => {
    if (f.purpose && item.purpose !== f.purpose) return
    if (f.subject && !item.subjects.includes(f.subject)) return
    if (f.kind && item.kind !== f.kind) return
    let score = 0
    const name = item.name.toLocaleLowerCase()
    const subj = item.subjects.join(' ')
    const text = item.text.toLocaleLowerCase()
    for (const w of words) {
      const s = name.includes(w)
        ? 3
        : subj.includes(w)
          ? 2
          : text.includes(w)
            ? 1
            : 0
      if (s === 0) return
      score += s
    }
    scored.push({ item, score, at })
  })
  return scored
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .map((s) => s.item)
}

/** Every subject tag used, sorted. */
export const allSubjects = (items: readonly PromptItem[]): string[] =>
  [...new Set(items.flatMap((i) => i.subjects))].sort()

/** New text: the old text is kept as a version (nothing when unchanged). */
export function withVersion(
  old: PromptItem,
  next: PromptItem,
  now: number,
): PromptItem {
  if (!old.id || old.text === next.text || old.text.trim() === '') return next
  const versions = [...old.versions, { at: now, text: old.text }].slice(
    -MAX_VERSIONS,
  )
  return { ...next, versions }
}

/** Adds a rating of the current version and refreshes the average. */
export function withRating(
  item: PromptItem,
  stars: number,
  now: number,
): PromptItem {
  const s = Math.min(5, Math.max(1, Math.round(stars)))
  const ratings = [
    ...item.ratings,
    { at: now, stars: s, version: item.versions.length },
  ].slice(-MAX_RATINGS)
  return { ...item, ratings, stars: averageStars(ratings) }
}

/** Stars as text (★★★☆☆); nothing before the first rating. */
export const starText = (n: number): string =>
  n > 0 ? '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)) : ''

export interface VersionStat {
  /** 0 = the oldest text; the last one is the current text. */
  index: number
  at: number | null
  text: string
  current: boolean
  count: number
  average: number
}

/**
 * Every version of a prompt (the saved old texts, then the current one) with
 * the ratings its results got. A rating belongs to the version that was
 * current when it was given.
 */
export function versionStats(item: PromptItem): VersionStat[] {
  const texts = [
    ...item.versions.map((v) => ({ at: v.at as number | null, text: v.text })),
    { at: null, text: item.text },
  ]
  return texts.map((v, index) => {
    const mine = item.ratings.filter((r) => r.version === index)
    return {
      index,
      at: v.at,
      text: v.text,
      current: index === texts.length - 1,
      count: mine.length,
      average: averageStars(mine),
    }
  })
}
