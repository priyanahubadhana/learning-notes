import type { JsonValue } from '../../core/types'
import type { SettingDefinition } from '../registry'
import { valueText } from './changeNote'
import { GlassPreview } from './previews/GlassPreview'
import { LangCard } from './previews/LangCard'
import { tv } from './tv'

/**
 * SET-B09: the tiny live preview of a row (about 56 px tall). It follows the
 * stored value at once. Rows with no picture carry a plain text line, never
 * blank to screen readers (the words are there, but not drawn as an empty box). Section previews (General and others) come in later steps.
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
  const picture =
    definition.id === 'general.reduceGlass' ? (
      <GlassPreview value={value} />
    ) : definition.id === 'general.language' ? (
      <LangCard value={value} />
    ) : null
  return (
    <div
      data-row-preview
      data-picture={
        definition.id === 'general.reduceGlass'
          ? 'glass'
          : picture
            ? 'card'
            : 'none'
      }
      data-glow={glowKey > 0 ? 'on' : undefined}
      className="sv3-rowprev"
    >
      {picture}
      {/* The value as words for screen readers; the picture (or the control above) already shows it. */}
      <span className="sr-only">{tv('sv3.rowNow', { value: now })}</span>
    </div>
  )
}
