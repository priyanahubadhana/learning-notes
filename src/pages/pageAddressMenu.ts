import { t, type MessageKey } from '../i18n/t'
import type { MenuItem } from '../app/ui'
import { PATH_STYLES, type PathStyle } from './pathStyle'

/**
 * The "Page address" item of the page ⋯ menu and the notebook menu: a small
 * list of the styles plus "App default", the current choice ticked.
 * `current` is undefined when the page (or notebook) uses the default.
 */
export function pageAddressItem(
  current: PathStyle | undefined,
  set: (style: PathStyle | undefined) => void,
): MenuItem {
  return {
    label: t('path.menu'),
    icon: '⌖',
    submenu: [
      ...PATH_STYLES.map((style) => ({
        label: t(`path.style.${style}` as MessageKey),
        icon: '',
        checked: current === style,
        onSelect: () => set(style),
      })),
      {
        label: t('path.menu.default'),
        icon: '',
        checked: current === undefined,
        onSelect: () => set(undefined),
      },
    ],
    onSelect: () => {},
  }
}
