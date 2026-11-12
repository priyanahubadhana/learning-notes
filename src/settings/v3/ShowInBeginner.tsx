import { OnOff } from '../../design/parts/OnOff'
import {
  isProFeatureId,
  isStoredOn,
  setUnlocked,
  useLevel,
  useLevelVersion,
} from '../level'
import { markJustShown } from './experience'
import { useSettingsHistory } from './historyCtx'
import { PRO_FEATURE_TEXT } from './proFeatureText.gen'
import { unlockId } from './virtualWrites'
import { tv } from './tv'

/**
 * SET-B42: a Professional row's own "Show in Beginner" switch. It is the
 * same stored switch as in the central list, so both stay in step. Off hides
 * the row in Beginner; Professional shows every row anyway.
 */
export function ShowInBeginner({ id }: { id: string }) {
  useLevelVersion()
  const level = useLevel()
  const history = useSettingsHistory()
  if (!isProFeatureId(id)) return null
  const on = isStoredOn(id)
  const name = PRO_FEATURE_TEXT[id]?.[0] ?? id
  return (
    <div data-show-in-beginner className="sv3-showbeg">
      <OnOff
        checked={on}
        label={tv('sv3.showInBeginner', { name })}
        onChange={(next) => {
          history.record(
            {
              label: name,
              items: [{ id: unlockId(id), before: on, after: next }],
            },
            tv(next ? 'sv3.pro.toastOn' : 'sv3.pro.toastOff', { name }),
          )
          if (next) markJustShown(id)
          setUnlocked(id, next)
        }}
      >
        {tv('sv3.showInBeginner.short')}
      </OnOff>
      {level === 'professional' && (
        <span className="sv3-line-help">{tv('sv3.showInBeginner.pro')}</span>
      )}
    </div>
  )
}
