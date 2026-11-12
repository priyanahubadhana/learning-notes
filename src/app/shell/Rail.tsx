import { t, type MessageKey } from '../../i18n/t'
import type { Space } from '../spaces/spaces'
import { GearMenu, type GearActions } from './GearMenu'
import { ShellIcon } from './shellIcons'
import { SPACE_SHELL_ICON } from './shellPaths'
import { flipTheme, themeIcon } from './theme'
import { badgeText, dueLabel } from './useDue'

export interface SpaceNavProps {
  spaces: Space[]
  current: Space
  onSelect: (space: Space) => void
  /** Cards due (the Review badge). */
  due: number
  gear: GearActions
}

/** SH-02: the rail (56 px, glass, radius 16) down the left edge. */
export function Rail({ spaces, current, onSelect, due, gear }: SpaceNavProps) {
  const next = flipTheme(gear.theme)
  const dayNight = t(next === 'night' ? 'shell.toNight' : 'shell.toDay')
  return (
    <nav
      data-chrome
      data-shell-rail
      aria-label={t('spaces.label')}
      className="sh-rail glass-flat"
    >
      <span className="sh-brand" aria-hidden>
        L
      </span>
      {spaces.map((space) => {
        const name = t(`space.${space}` as MessageKey)
        const active = space === current
        return (
          <button
            key={space}
            type="button"
            className="sh-ib"
            data-space={space}
            aria-label={t('space.button', { name })}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(space)}
          >
            <ShellIcon name={SPACE_SHELL_ICON[space]} />
            {space === 'review' && due > 0 && (
              <span className="sh-badge" role="img" aria-label={dueLabel(due)}>
                {badgeText(due)}
              </span>
            )}
          </button>
        )
      })}
      <span className="sh-grow" />
      <button
        type="button"
        className="sh-ib"
        data-testid="shell-daynight"
        aria-label={dayNight}
        onClick={() => gear.onTheme(next)}
      >
        <ShellIcon name={themeIcon(gear.theme)} />
      </button>
      <GearMenu
        actions={gear}
        trigger={({ open, onClick }) => (
          <button
            type="button"
            className="sh-ib"
            data-testid="corner-button"
            data-popup-trigger=""
            aria-label={t('corner.label')}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(e) => onClick(e.currentTarget)}
          >
            <ShellIcon name="gear" />
          </button>
        )}
      />
    </nav>
  )
}
