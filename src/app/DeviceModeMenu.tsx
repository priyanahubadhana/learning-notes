import { useState } from 'react'
import { Tip } from '../help/Help'
import { t, type MessageKey } from '../i18n/t'
import { deviceModeChoices, MODE_ICON } from './deviceModeItems'
import { deviceModeSetting } from '../settings/builtinSettings'
import { useDeviceSetting } from '../settings/useSetting'
import { Icon } from './tools/icons'
import { MenuPopover } from './ui'

/**
 * The Device mode list (Computer, Touch, Pencil), used by the top bar button
 * and by the page ⋯ menu's "Device mode" item: each mode has a one-line
 * description and a tick on the current one.
 */

/** Top bar button: shows the current mode; one tap opens the list. */
export function DeviceModeButton() {
  const [mode] = useDeviceSetting(deviceModeSetting)
  const [at, setAt] = useState<DOMRect | null>(null)
  const name = t('mode.menu')
  const title = `${name}: ${t(`mode.${mode}` as MessageKey)}`
  return (
    <>
      <Tip id="topBar.deviceMode" touchInfo={false}>
        <button
          type="button"
          data-testid="device-mode-button"
          data-popup-trigger
          aria-label={title}
          title={title}
          aria-haspopup="menu"
          aria-expanded={!!at}
          onClick={(e) =>
            setAt(at ? null : e.currentTarget.getBoundingClientRect())
          }
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-hover hover:text-ink"
        >
          <Icon name={MODE_ICON[mode]} />
        </button>
      </Tip>
      {at && (
        <MenuPopover
          anchor={at}
          items={deviceModeChoices(mode)}
          label={name}
          onClose={() => setAt(null)}
        />
      )}
    </>
  )
}
