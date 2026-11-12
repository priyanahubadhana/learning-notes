import { OnOff } from '../../design/parts/OnOff'
import { settingsRegistry } from '../builtinSettings'
import { useLevel } from '../level'
import { ExperienceChoices } from './ExperienceChoices'
import {
  rowShown,
  setExperienceOnTop,
  useExperience,
  useExperienceOnTop,
} from './experience'
import { useSettingsHistory } from './historyCtx'
import { LevelControl } from './LevelControl'
import { EXPERIENCE_TOP_ID } from './virtualWrites'
import { tv } from './tv'

/**
 * Your experience (SET-B17 to B21): the three choices, how many settings are
 * hidden and where to find them, the Beginner / Professional control and the
 * switch that moves this section to the bottom of the list.
 */
export function ExperienceSection({
  onMoved,
}: {
  onMoved(top: boolean): void
}) {
  const history = useSettingsHistory()
  const top = useExperienceOnTop()
  useExperience()
  const level = useLevel()
  const hidden = settingsRegistry
    .list()
    .filter((s) => !s.searchOnly && !rowShown(s.id)).length
  return (
    <>
      <p className="sv3-lead">{tv('sv3.experience.lead')}</p>
      <section className="sv3-row" data-setting-id="help.experience">
        <ExperienceChoices />
        <p className="sv3-line-help" data-hidden-note>
          {level === 'professional' || hidden === 0
            ? tv('sv3.exp.none')
            : tv('sv3.exp.hidden', { count: hidden })}
        </p>
      </section>
      <section className="sv3-row" data-setting-id="help.level">
        <LevelControl />
      </section>
      <section className="sv3-row" data-setting-id="experience.pin">
        <h3 className="sv3-row-name">{tv('sv3.expTop.label')}</h3>
        <p className="sv3-line-help">{tv('sv3.expTop.help')}</p>
        <div className="sv3-row-control">
          <OnOff
            checked={top}
            label={tv('sv3.expTop.label')}
            onChange={(next) => {
              history.record(
                {
                  label: tv('sv3.expTop.label'),
                  items: [{ id: EXPERIENCE_TOP_ID, before: top, after: next }],
                },
                next ? tv('sv3.expTop.movedTop') : tv('sv3.expTop.movedBottom'),
              )
              setExperienceOnTop(next)
              onMoved(next)
            }}
          />
        </div>
      </section>
    </>
  )
}
