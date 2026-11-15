import { t, type MessageKey } from '../../../i18n/t'
import { Icon, type IconName } from '../icons'
import { lassoSettings } from '../main/inkSettings'
import {
  LASSO_FILTERS,
  setLassoFilter,
  setLassoShape,
} from './cards/lasso/lassoModel'
import type { LassoShape } from '../main/inkSettings'
import './lassoRow.css'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()
const SHAPES: readonly (readonly [LassoShape, IconName])[] = [
  ['free', 'lasso'],
  ['rect', 'squareDashed'],
]

/** "Free-hand | Rectangle" right on the bar (mock v9, Professional). */
export function LassoShapeChips() {
  const shape = lassoSettings.useValue().shape
  return (
    <div
      className="v8seg"
      role="radiogroup"
      aria-label={t('v8.lasso.shapeGroup')}
      data-testid="v8-lasso-bar-shape"
    >
      {SHAPES.map(([id, icon]) => (
        <button
          key={id}
          type="button"
          data-chrome
          role="radio"
          aria-checked={shape === id}
          className="v8seg-opt"
          data-testid={`v8-lasso-bar-${id}`}
          onMouseDown={keepFocus}
          onClick={() => setLassoShape(id)}
        >
          <Icon name={icon} size={17} />
          <span>{t(`ink.lasso.${id}` as MessageKey)}</span>
        </button>
      ))}
    </div>
  )
}

/** "Picks  Ink · Pictures · Text": what the loop takes (as in the live app). */
export function LassoPickChips() {
  const l = lassoSettings.useValue()
  return (
    <div
      className="v8seg"
      role="group"
      aria-label={t('v8.lasso.picks')}
      data-testid="v8-lasso-bar-picks"
    >
      <span className="v8seg-label" aria-hidden>
        {t('v8.lasso.picksShort')}
      </span>
      {LASSO_FILTERS.map(([key, icon]) => (
        <button
          key={key}
          type="button"
          data-chrome
          role="checkbox"
          aria-checked={l[key]}
          className="v8seg-opt"
          data-testid={`v8-lasso-pick-${key}`}
          onMouseDown={keepFocus}
          onClick={() => setLassoFilter(key, !l[key])}
        >
          <Icon name={icon} size={17} />
          <span>{t(`ink.lasso.filter.${key}` as MessageKey)}</span>
        </button>
      ))}
    </div>
  )
}
