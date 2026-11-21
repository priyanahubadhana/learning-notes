import { useLevel } from '../level'
import {
  EXPERIENCES,
  getExperience,
  setExperience,
  countFor,
  useExperience,
  type Experience,
} from './experience'
import { useSettingsHistory } from './historyCtx'
import { EXPERIENCE_ID, LEVEL_ID } from './virtualWrites'
import { tv, type V3Key } from './tv'

/**
 * SET-B17: New, Used a little, Experienced. Choosing one sets what Settings
 * shows and the app view (Beginner for the first two, Professional for the
 * last), as one Undo step.
 */
export function ExperienceChoices({ onChosen }: { onChosen?(): void }) {
  const current = useExperience()
  const level = useLevel()
  const history = useSettingsHistory()
  const choose = (next: Experience) => {
    const before = getExperience()
    const after = next === 'expert' ? 'professional' : 'beginner'
    if (before !== next)
      history.record({
        label: tv('sv3.experience.title'),
        items: [
          { id: LEVEL_ID, before: level, after },
          { id: EXPERIENCE_ID, before, after: next },
        ],
      })
    setExperience(next)
    onChosen?.()
  }
  return (
    <div
      role="radiogroup"
      aria-label={tv('sv3.experience.title')}
      className="sv3-exp"
      data-experience-choices
    >
      {EXPERIENCES.map((exp) => {
        const on = current === exp
        return (
          <button
            key={exp}
            type="button"
            role="radio"
            aria-checked={on}
            data-experience={exp}
            className="sv3-exp-card"
            onClick={() => choose(exp)}
          >
            <span className="sv3-exp-head">
              <span className="sv3-row-name">
                {tv(`sv3.exp.${exp}` as V3Key)}
              </span>
              {on && <span className="sv3-tag">{tv('sv3.exp.current')}</span>}
            </span>
            <span className="sv3-line-help">
              {tv(`sv3.exp.${exp}.desc` as V3Key)}
            </span>
            <span className="sv3-line-help">
              {tv('sv3.exp.shows', { count: countFor(exp) })}
            </span>
          </button>
        )
      })}
    </div>
  )
}
