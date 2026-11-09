import type { SendEntry } from './sendLog'

/**
 * "Usage and cost" numbers, worked out from the no-content send log: this
 * month's total, and the same total split by key, model, feature and
 * notebook. Pure: no storage, no screen. Money is in US dollars here; the
 * screen converts it to the chosen currency.
 */

export type FeatureGroup =
  | 'prompts'
  | 'skills'
  | 'cleanup'
  | 'convert'
  | 'askBook'
  | 'factCheck'
  | 'pageActions'
  | 'other'

export const FEATURE_GROUPS: readonly FeatureGroup[] = [
  'prompts',
  'skills',
  'cleanup',
  'convert',
  'askBook',
  'factCheck',
  'pageActions',
  'other',
]

const GROUP_OF: Record<string, FeatureGroup> = {
  prompt: 'prompts',
  skill: 'skills',
  cleanup: 'cleanup',
  handwriting: 'convert',
  latex: 'convert',
  mindMapPicture: 'convert',
  askBook: 'askBook',
  storySoFar: 'askBook',
  factCheck: 'factCheck',
  summary: 'pageActions',
  keyPoints: 'pageActions',
  cardsPage: 'pageActions',
  cardsHighlights: 'pageActions',
}

export const featureGroup = (feature: string): FeatureGroup =>
  GROUP_OF[feature] ?? 'other'

export interface Slice {
  /** Key id, model id, feature group or notebook id ('' = none). */
  id: string
  calls: number
  costUsd: number
  tokens: number
}

export interface Report {
  totalUsd: number
  calls: number
  tokens: number
  byKey: Slice[]
  byModel: Slice[]
  byFeature: Slice[]
  byNotebook: Slice[]
}

const tokensOf = (e: SendEntry): number =>
  (e.inputTokens ?? 0) + (e.outputTokens ?? 0)

function slices(
  log: readonly SendEntry[],
  pick: (e: SendEntry) => string,
): Slice[] {
  const map = new Map<string, Slice>()
  for (const e of log) {
    const id = pick(e)
    const s = map.get(id) ?? { id, calls: 0, costUsd: 0, tokens: 0 }
    s.calls += 1
    s.costUsd += e.costUsd
    s.tokens += tokensOf(e)
    map.set(id, s)
  }
  return [...map.values()].sort((a, b) => b.costUsd - a.costUsd)
}

export function buildReport(log: readonly SendEntry[]): Report {
  return {
    totalUsd: log.reduce((n, e) => n + e.costUsd, 0),
    calls: log.length,
    tokens: log.reduce((n, e) => n + tokensOf(e), 0),
    byKey: slices(log, (e) => e.keyId ?? ''),
    byModel: slices(log, (e) => e.model ?? ''),
    byFeature: slices(log, (e) => featureGroup(e.feature)),
    byNotebook: slices(log, (e) => e.notebookId ?? ''),
  }
}

/** Share of the limit used, 0 to 1 (1 when the limit is 0 and money is spent). */
export function fractionOf(spentUsd: number, limitUsd: number): number {
  if (limitUsd <= 0) return spentUsd > 0 ? 1 : 0
  return Math.min(1, spentUsd / limitUsd)
}

const csvCell = (v: string | number): string => {
  const s = String(v)
  // A cell that starts like a formula is quoted as text (spreadsheet safety).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/**
 * The recent-calls list as CSV: time (UTC), feature, model, key, notebook,
 * tokens in and out, cost in the chosen currency. Never any content.
 */
export function toCsv(
  log: readonly SendEntry[],
  names: {
    key: (id: string) => string
    notebook: (id: string) => string
    cost: (usd: number) => number
  },
  currency: string,
): string {
  const head = [
    'time_utc',
    'feature',
    'model',
    'key',
    'notebook',
    'tokens_in',
    'tokens_out',
    `cost_${currency}`,
  ]
  const rows = log.map((e) => [
    new Date(e.at).toISOString(),
    e.feature,
    e.model ?? '',
    e.keyId ? names.key(e.keyId) : '',
    e.notebookId ? names.notebook(e.notebookId) : '',
    e.inputTokens ?? '',
    e.outputTokens ?? '',
    names.cost(e.costUsd).toFixed(4),
  ])
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}
