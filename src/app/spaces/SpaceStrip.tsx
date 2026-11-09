import type { ReactNode } from 'react'
import { Tip } from '../../help/Help'
import { t, type MessageKey } from '../../i18n/t'
import { SPACE_ICON, type Space } from './spaces'

/**
 * The strip of spaces: a slim column of icons down the left edge on a
 * computer or iPad, a bottom tab bar (icon and label) on a phone. The
 * quiet corner (⚙) sits at its end.
 */
export function SpaceStrip({
  spaces,
  current,
  onSelect,
  corner,
}: {
  spaces: Space[]
  current: Space
  onSelect: (space: Space) => void
  corner: ReactNode
}) {
  return (
    <nav
      data-chrome
      aria-label={t('spaces.label')}
      style={{ paddingTop: 'calc(10px + var(--top-clear))' }}
      className="flex w-14 shrink-0 flex-col items-center gap-1 glass-flat rounded-[var(--r-lg)] px-1 pb-2 phone:fixed phone:inset-x-0 phone:bottom-0 phone:z-20 phone:h-14 phone:w-auto phone:flex-row phone:justify-around phone:gap-0 phone:rounded-none phone:border-x-0 phone:border-b-0 phone:px-1 phone:pt-0! phone:pb-[env(safe-area-inset-bottom)]"
    >
      <Tip
        id="sidebar.spaces"
        className="flex flex-col gap-1 phone:w-full phone:flex-row phone:justify-around"
        touchInfo={false}
      >
        {spaces.map((space) => {
          const name = t(`space.${space}` as MessageKey)
          const active = space === current
          const Icon = SPACE_ICON[space]
          return (
            <button
              key={space}
              type="button"
              aria-label={t('space.button', { name })}
              aria-current={active ? 'page' : undefined}
              data-space={space}
              title={name}
              onClick={() => onSelect(space)}
              className={`flex size-11 flex-col items-center justify-center rounded-xl leading-none hover:bg-hover phone:h-12 phone:min-w-0 phone:flex-1 phone:rounded-lg ${
                active ? 'bg-accent-soft text-accent' : 'text-ink-soft'
              }`}
            >
              <Icon aria-hidden size={21} strokeWidth={1.75} />
              <span
                aria-hidden
                className="hidden text-[10px] leading-tight phone:mt-0.5 phone:block"
              >
                {name}
              </span>
            </button>
          )
        })}
      </Tip>
      <div className="mt-auto phone:mt-0 phone:shrink-0">{corner}</div>
    </nav>
  )
}
