import type { JsonValue } from '../../core/types'
import type { SettingDefinition } from '../registry'
import { valueText } from './changeNote'
import { tv } from './tv'

/**
 * SET-B09: the tiny live preview of a row (about 56 px tall). It follows the
 * stored value at once. Rows with no picture carry a plain text line, never
 * blank. Section previews (General and others) come in later steps.
 */
export function RowPreview({
  definition,
  value,
  glowKey,
}: {
  definition: SettingDefinition
  value: JsonValue
  /** > 0 while the row glows after a change. */
  glowKey: number
}) {
  const now = valueText(definition, value) || tv('sv3.valueNone')
  return (
    <div
      data-row-preview
      data-glow={glowKey > 0 ? 'on' : undefined}
      className="sv3-rowprev"
    >
      <span className="sv3-rowprev-text">
        {tv('sv3.rowNow', { value: now })}
      </span>
    </div>
  )
}
