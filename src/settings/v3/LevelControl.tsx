import { OnOffChoice } from '../../design/parts/OnOff'
import { setLevel, useLevel, type Level } from '../level'
import { useSettingsHistory } from './historyCtx'
import { LEVEL_ID } from './virtualWrites'
import { tv } from './tv'

/**
 * SET-B44: the Beginner / Professional control. It is the same two-level app
 * view as the switch at the top of the app (`level.ts`). Changing it keeps
 * every stored per-feature choice (SET-B43). One Undo step.
 */
export function LevelControl() {
  const level = useLevel()
  const history = useSettingsHistory()
  return (
    <div data-level-control className="sv3-levelctl">
      <OnOffChoice
        label={tv('sv3.level.label')}
        value={level}
        options={[
          { value: 'beginner', label: tv('sv3.level.beginner') },
          { value: 'professional', label: tv('sv3.level.professional') },
        ]}
        onChange={(next: Level) => {
          if (next === level) return
          history.record({
            label: tv('sv3.level.changed'),
            items: [{ id: LEVEL_ID, before: level, after: next }],
          })
          setLevel(next)
        }}
      />
      <p className="sv3-line-help">{tv('sv3.level.help')}</p>
    </div>
  )
}
