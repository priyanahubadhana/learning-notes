import { tp, type MiscKey } from './textMisc'
import { PRESET_KINDS, type Preset } from './timeRange'

const LABEL: Record<string, MiscKey> = {
  today: 'parts.range.today',
  week: 'parts.range.week',
  month: 'parts.range.month',
  lastmonth: 'parts.range.lastmonth',
  quarter: 'parts.range.quarter',
  year: 'parts.range.year',
  last7: 'parts.range.last7',
  last30: 'parts.range.last30',
  last4w: 'parts.range.last4w',
  custom: 'parts.range.custom',
}

/** Every built-in preset with its plain-word label. */
export function allPresets(): Preset[] {
  return PRESET_KINDS.map(({ id, kind }) => ({
    id,
    kind,
    label: tp(LABEL[id]),
  }))
}

/** What the bar falls back to when it has no presets: Today, This week. */
export function fallbackPresets(): Preset[] {
  return allPresets().filter((p) => p.id === 'today' || p.id === 'week')
}

/** The default set a template starts with: Today, This week, This month. */
export function defaultPresets(): Preset[] {
  return allPresets().filter((p) => ['today', 'week', 'month'].includes(p.id))
}
