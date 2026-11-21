import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useLongPress } from '../../useLongPress'
import { t, type MessageKey } from '../../../i18n/t'
import { Icon, type IconName } from '../icons'
import { eraseTargets, eraserSettings } from '../main/inkSettings'
import { currentRunner } from '../toolRuntime'
import { toggleErases, type EraseTarget } from './cards/eraser/eraserModel'
import './eraserRow.css'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()
const TARGETS: readonly (readonly [EraseTarget, IconName])[] = [
  ['hl', 'highlighter'],
  ['text', 'type'],
  ['pen', 'penLine'],
]

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
      {TARGETS.map(([id, icon]) => (
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
          <Icon name={icon} size={17} />
          <span>{t(`v8.eraser.erases.${id}` as MessageKey)}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * True while the row's items do not all fit: the name then gives way (icon
 * only) so no text is ever cut. It comes back once the label fits again
 * (the label's width is remembered, so the row does not flicker).
 */
function useTight(ref: RefObject<HTMLElement | null>) {
  const [tight, setTight] = useState(false)
  const labelW = useRef(0)
  useLayoutEffect(() => {
    const chip = ref.current
    const row = chip?.parentElement
    if (!chip || !row) return
    const check = () => {
      const kids = [...row.children].filter(
        (c) => !c.classList.contains('v8measure'),
      ) as HTMLElement[]
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0
      const used =
        kids.reduce((n, c) => n + c.offsetWidth, 0) +
        gap * Math.max(0, kids.length - 1)
      const label = chip.querySelector<HTMLElement>('.v8chip-label')
      if (label) labelW.current = label.offsetWidth + 6
      setTight((was) =>
        was
          ? used + labelW.current > row.clientWidth
          : used > row.clientWidth + 0.5,
      )
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(row)
    return () => ro.disconnect()
  })
  return tight
}

/** "Back after one": go back to the previous tool after one erase. */
export function BackAfterOne() {
  const on = eraserSettings.useValue().returnAfter
  const ref = useRef<HTMLButtonElement>(null)
  const tight = useTight(ref)
  const name = t('v8.item.back')
  const press = useLongPress(() => currentRunner().app?.toast(name))
  return (
    <button
      ref={ref}
      type="button"
      data-chrome
      className="v8chip"
      aria-pressed={on}
      aria-label={t('ink.eraser.returnAfter')}
      data-testid="v8-eraser-back"
      onMouseDown={keepFocus}
      onClick={() => eraserSettings.update({ returnAfter: !on })}
      {...press}
    >
      <Icon name="history" size={18} />
      {tight ? null : <span className="v8chip-label">{name}</span>}
    </button>
  )
}
