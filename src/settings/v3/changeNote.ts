import type { JsonValue } from '../../core/types'
import type { SettingDefinition } from '../registry'
import { tv } from './tv'

/** What changed, for the glow note and the preview. */
export interface Change {
  id: string
  name: string
  from: string
  to: string
  /** Counts up so the same row can glow again. */
  seq: number
}

/** A value as plain words (the chosen option's label, a number, a list). */
export function valueText(
  definition: SettingDefinition,
  value: JsonValue,
): string {
  const c = definition.control
  if (c.kind === 'segmented' || c.kind === 'select')
    return (
      c.options.find((o) => o.value === value)?.label() ?? tv('sv3.valueNone')
    )
  if (c.kind === 'steps' && Array.isArray(value)) return value.join(' → ')
  if (c.kind === 'labels' && Array.isArray(value))
    return tv('sv3.labelsCount', { count: value.length })
  if (typeof value === 'number' || typeof value === 'string')
    return String(value)
  if (value === null) return tv('sv3.valueNone')
  return ''
}

export const changeNote = (c: Change): string =>
  tv('sv3.noteChanged', { name: c.name, from: c.from, to: c.to })
