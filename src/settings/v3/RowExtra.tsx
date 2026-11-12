import type { JsonValue } from '../../core/types'
import type { SettingDefinition } from '../registry'
import { ChooseTemplate } from './ChooseTemplate'
import { tv } from './tv'
import { WhyLink } from './WhyLink'

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
  if (definition.id === 'general.reduceGlass')
    return (
      <WhyLink id="glass-auto" title={tv('sv3.glassWhyTitle')}>
        <p>{tv('sv3.glassWhy')}</p>
      </WhyLink>
    )
  if (definition.id.startsWith('tryNew.'))
    return <p className="sv3-line-help">{tv('sv3.tryNew.rowRisk')}</p>
  return null
}
