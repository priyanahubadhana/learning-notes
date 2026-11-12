import type { JsonValue } from '../../core/types'
import type { SettingDefinition } from '../registry'
import { ChooseTemplate } from './ChooseTemplate'

/** Extra controls that sit under a row's own control (the stored value is the row's). */
export function RowExtra({
  definition,
  value,
  onSave,
}: {
  definition: SettingDefinition
  value: JsonValue
  onSave(next: JsonValue): void
}) {
  if (definition.id === 'general.newPageStudy')
    return <ChooseTemplate value={value} onSave={onSave} />
  return null
}
