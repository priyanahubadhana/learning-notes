import { t, type MessageKey } from '../../i18n/t'
import { GearMenu } from './GearMenu'
import type { SpaceNavProps } from './Rail'
import { ShellIcon } from './shellIcons'
import { SPACE_SHELL_ICON } from './shellPaths'
import { badgeText, dueLabel } from './useDue'

/**
 * SH-03: the phone tab bar (<= 640): attached full width at the bottom,
 * 56 px + safe area, the spaces and "More" (the same gear menu as the rail).
 */
export function TabBar({
  spaces,
  current,
  onSelect,
  due,
  gear,
}: SpaceNavProps) {
  return (
    <nav
      data-chrome
      data-shell-tabbar
      data-toast-avoid
      aria-label={t('spaces.label')}
      className="sh-tabbar glass-flat"
    >
      {spaces.map((space) => {
        const name = t(`space.${space}` as MessageKey)
        const active = space === current && !gear.settingsOpen
        return (
          <button
            key={space}
            type="button"
            className="sh-tab"
            data-space={space}
            aria-label={t('space.button', { name })}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(space)}
          >
            <span className="sh-tabicon">
              <ShellIcon name={SPACE_SHELL_ICON[space]} size={22} />
              {space === 'review' && due > 0 && (
                <span
                  className="sh-badge"
                  role="img"
                  aria-label={dueLabel(due)}
                >
                  {badgeText(due)}
                </span>
              )}
            </span>
            <span aria-hidden className="sh-tablbl">
              {name}
            </span>
          </button>
        )
      })}
      <GearMenu
        actions={gear}
        trigger={({ open, onClick }) => (
          <button
            type="button"
            className="sh-tab"
            data-testid="corner-button"
            data-popup-trigger=""
            aria-label={t('corner.label')}
            aria-current={gear.settingsOpen ? 'page' : undefined}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(e) => onClick(e.currentTarget)}
          >
            <span className="sh-tabicon">
              <ShellIcon name="dots" size={22} />
            </span>
            <span aria-hidden className="sh-tablbl">
              {t('shell.more')}
            </span>
          </button>
        )}
      />
    </nav>
  )
}
