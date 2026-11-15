import { t, type MessageKey } from '../../../i18n/t'
import { Icon } from '../icons'
import { eraseTargets, eraserSettings } from '../main/inkSettings'
import { currentRunner } from '../toolRuntime'
import { toggleErases, type EraseTarget } from './cards/eraser/eraserModel'
import './eraserRow.css'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()
const TARGETS: readonly EraseTarget[] = ['hl', 'text', 'pen']

/** "Erases  Highlighter · Text · Pen" right on the bar (mock v9, TB-30b). */
export function ErasesChips() {
  const on = eraseTargets(eraserSettings.useValue())
  return (
    <div
      className="v8erases"
      role="group"
      aria-label={t('v8.eraser.erases')}
      data-testid="v8-eraser-erases"
    >
      <span className="v8erases-label" aria-hidden>
        {t('v8.eraser.erases')}
      </span>
      {TARGETS.map((id) => (
        <button
          key={id}
          type="button"
          data-chrome
          role="checkbox"
          aria-checked={on[id]}
          className="v8erases-opt"
          data-testid={`v8-eraser-erases-${id}`}
          onMouseDown={keepFocus}
          onClick={() => {
            if (!toggleErases(id))
              currentRunner().app?.toast(t('v8.eraser.needOne'))
          }}
        >
          {t(`v8.eraser.erases.${id}` as MessageKey)}
        </button>
      ))}
    </div>
  )
}

/** "Back after one": go back to the previous tool after one erase. */
export function BackAfterOne() {
  const on = eraserSettings.useValue().returnAfter
  return (
    <button
      type="button"
      data-chrome
      className="v8chip"
      aria-pressed={on}
      aria-label={t('ink.eraser.returnAfter')}
      data-testid="v8-eraser-back"
      onMouseDown={keepFocus}
      onClick={() => eraserSettings.update({ returnAfter: !on })}
    >
      <Icon name="history" size={18} />
      <span>{t('v8.item.back')}</span>
    </button>
  )
}
