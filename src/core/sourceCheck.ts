import type { PageSource } from './types'

/**
 * Checks for `Page.source` and `Annotation` values from files and pasted
 * input. Pure, shared by the backup checks (share/checkRows.ts) and the
 * Library and Capture services.
 */

/** Longest address kept. */
const MAX_URL_LENGTH = 2000

/** True for an https address (the only kind a source may keep). */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch {
    return false
  }
}

const KINDS = ['book', 'article', 'video', 'audio', 'file', 'paste']
const FORMATS = ['pdf', 'epub', 'docx']

const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0
const isText = (v: unknown, max = 500): v is string =>
  typeof v === 'string' && v.length <= max

/** `pdf:<page>:<y 0..1>` or `epub:<cfi>`. */
export function parseLocator(
  at: string,
):
  | { type: 'pdf'; page: number; y: number }
  | { type: 'epub'; cfi: string }
  | null {
  const pdf = /^pdf:(\d{1,6}):(\d(?:\.\d{1,6})?)$/.exec(at)
  if (pdf) {
    const page = Number(pdf[1])
    const y = Number(pdf[2])
    return page >= 1 && y >= 0 && y <= 1 ? { type: 'pdf', page, y } : null
  }
  if (at.startsWith('epub:') && at.length > 5 && at.length <= 1000) {
    return { type: 'epub', cfi: at.slice(5) }
  }
  return null
}

/** Is `v` a well-formed `PageSource`? Unknown fields are refused. */
export function isPageSource(v: unknown): v is PageSource {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const s = v as Record<string, unknown>
  const known = new Set([
    'kind',
    'url',
    'durationSec',
    'capturedAt',
    'videoId',
    'startSec',
    'fileId',
    'format',
    'author',
    'coverImageId',
    'pageCount',
    'progress',
    'at',
    'openedAt',
  ])
  if (Object.keys(s).some((k) => !known.has(k))) return false
  if (!KINDS.includes(s.kind as string)) return false
  if (s.url !== undefined && !isHttpsUrl(s.url)) return false
  for (const k of [
    'durationSec',
    'capturedAt',
    'startSec',
    'pageCount',
    'openedAt',
  ]) {
    if (s[k] !== undefined && !isNum(s[k])) return false
  }
  if (
    s.progress !== undefined &&
    !(isNum(s.progress) && (s.progress as number) <= 1)
  ) {
    return false
  }
  if (s.videoId !== undefined && !/^[\w-]{6,20}$/.test(String(s.videoId))) {
    return false
  }
  if (s.format !== undefined && !FORMATS.includes(s.format as string)) {
    return false
  }
  for (const k of ['fileId', 'author', 'coverImageId']) {
    if (s[k] !== undefined && !isText(s[k])) return false
  }
  if (s.at !== undefined && !(isText(s.at, 1000) && parseLocator(s.at))) {
    return false
  }
  return true
}

const COLOURS = ['yellow', 'green', 'blue', 'pink', 'purple']

/** Is `v` a well-formed annotation anchor? */
export function isAnchor(v: unknown): boolean {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const a = v as Record<string, unknown>
  switch (a.type) {
    case 'block':
      return (
        isText(a.blockId, 100) &&
        (a.from === undefined || isNum(a.from)) &&
        (a.to === undefined || isNum(a.to))
      )
    case 'pdf':
      return (
        isNum(a.page) &&
        Array.isArray(a.rects) &&
        a.rects.length % 4 === 0 &&
        a.rects.length <= 400 &&
        a.rects.every(isNum)
      )
    case 'epub':
      return isText(a.cfi, 1000) && a.cfi.length > 0
    case 'time':
      return (
        isNum(a.seconds) && (a.endSeconds === undefined || isNum(a.endSeconds))
      )
    default:
      return false
  }
}

export const isColour = (v: unknown): boolean => COLOURS.includes(v as string)

/** The quote shape of an annotation. */
export function isQuote(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false
  const q = v as Record<string, unknown>
  return isText(q.exact, 5000) && isText(q.prefix, 500) && isText(q.suffix, 500)
}

export const MAX_NOTE_LENGTH = 20_000
