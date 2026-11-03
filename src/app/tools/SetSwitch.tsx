import type { KeyboardEvent } from 'react'
import { Tip } from '../../help/Help'
import { t, type MessageKey } from '../../i18n/t'
import { Icon, type IconName } from './icons'
import {
  BAR_SETS,
  activeSet,
  changeSet,
  keepSet,
  type BarSet,
} from './toolbarState'

const SET_ICON: Record<BarSet, IconName> = {
  write: 'type',
  draw: 'pencil',
  read: 'bookOpen',
}

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/**
 * The Write · Draw · Read switch: three icon-only parts (each has a name for
 * screen readers and a tooltip) and a pin that stops the bar switching by
 * itself. It is not the device mode (Computer, Touch, Pencil).
 */
export function SetSwitch({ px }: { px: number }) {
  const set = activeSet.useValue()
  const keep = keepSet.useValue()
  const size = Math.max(px, 44)

  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const at = BAR_SETS.indexOf(set)
    const next = BAR_SETS[(at + (e.key === 'ArrowRight' ? 1 : -1) + 3) % 3]
    const group = e.currentTarget
    changeSet(next, 'user')
    // Focus follows the choice (the chosen part is the one in the tab order).
    requestAnimationFrame(() =>
      group.querySelector<HTMLElement>(`[data-set="${next}"]`)?.focus(),
    )
  }

  return (
    <div className="flex items-center gap-0.5" data-slot="switch">
      <Tip id="bar.set" touchInfo={false} className="inline-flex">
        <div
          role="radiogroup"
          aria-label={t('set.label')}
          onKeyDown={arrows}
          className="flex rounded-xl bg-hover"
        >
          {BAR_SETS.map((name) => {
            const on = name === set
            const label = t(`set.${name}` as MessageKey)
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={label}
                title={label}
                data-set={name}
                tabIndex={on ? 0 : -1}
                onMouseDown={keepFocus}
                onClick={() => changeSet(name, 'user')}
                style={{ minHeight: size, minWidth: size }}
                className={`grid place-items-center rounded-[10px] motion-safe:transition-colors ${
                  on
                    ? 'bg-bg text-accent shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon name={SET_ICON[name]} />
              </button>
            )
          })}
        </div>
      </Tip>
      <Tip id="bar.keep" touchInfo={false} className="inline-flex">
        <button
          type="button"
          aria-pressed={keep}
          aria-label={t('set.keep')}
          title={t('set.keep')}
          data-set-keep
          onMouseDown={keepFocus}
          onClick={() => keepSet.set(!keep)}
          style={{ minHeight: size, minWidth: size }}
          className={`grid place-items-center rounded-xl hover:bg-hover motion-safe:transition-colors ${
            keep ? 'text-accent' : 'text-ink-soft'
          }`}
        >
          <Icon name={keep ? 'pin' : 'pinOff'} size={18} />
        </button>
      </Tip>
    </div>
  )
}
