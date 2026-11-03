import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { t, type MessageKey } from '../../i18n/t'
import {
  applyDeviceMode,
  deviceModeSetting,
} from '../../settings/builtinSettings'
import { readDeviceSetting } from '../../settings/settingsService'
import {
  DEVICE_KINDS,
  browserFacts,
  chosenKind,
  devicePickerDone,
  modeForKind,
  suggestKind,
  type DeviceKind,
} from './deviceKind'
import { Icon, type IconName } from './icons'

const KIND_ICON: Record<DeviceKind, IconName> = {
  phone: 'phone',
  tablet: 'tablet',
  computer: 'laptop',
}

/**
 * "Which device is this?": the first-start choice (and Settings). It is
 * preselected from detection, including an iPad that calls itself a Mac,
 * and sets the matching device mode and bar. Closing it without choosing
 * changes nothing.
 */
export function DevicePicker({ onClose }: { onClose: () => void }) {
  const [start] = useState(() =>
    suggestKind(browserFacts(readDeviceSetting(deviceModeSetting))),
  )
  const [kind, setKind] = useState<DeviceKind>(start.kind)
  const [pencil, setPencil] = useState(start.pencil)
  const dialog = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(document.activeElement)

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const back = opener.current
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [])

  const finish = (apply: boolean) => {
    if (apply) {
      applyDeviceMode(modeForKind(kind, pencil))
      chosenKind.set(kind)
    }
    devicePickerDone.set(true)
    onClose()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
      return
    }
    if (e.key === 'Tab') {
      const focusable = [
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input',
        ) ?? []),
      ]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
      return
    }
    if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return
    if (!(e.target as HTMLElement).closest('[role="radiogroup"]')) return
    e.preventDefault()
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next =
      DEVICE_KINDS[
        (DEVICE_KINDS.indexOf(kind) + step + DEVICE_KINDS.length) %
          DEVICE_KINDS.length
      ]
    setKind(next)
    requestAnimationFrame(() =>
      dialog.current
        ?.querySelector<HTMLElement>(`[data-kind="${next}"]`)
        ?.focus(),
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-picker-title"
        onKeyDown={onKeyDown}
        className="grid max-h-[90vh] w-full max-w-lg gap-3 overflow-y-auto rounded-2xl border border-line bg-bg p-5 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.3)]"
      >
        <h2 id="device-picker-title" className="text-lg font-semibold">
          {t('picker.device.title')}
        </h2>
        <p className="text-sm text-ink-soft">{t('picker.device.help')}</p>
        <div
          role="radiogroup"
          aria-label={t('picker.device.title')}
          className="grid grid-cols-3 gap-2 phone:grid-cols-1"
        >
          {DEVICE_KINDS.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={kind === name}
              data-kind={name}
              tabIndex={kind === name ? 0 : -1}
              onClick={() => setKind(name)}
              className={`grid min-h-24 place-items-center gap-1 rounded-2xl border p-3 text-sm phone:min-h-14 phone:grid-flow-col phone:justify-start phone:gap-3 ${
                kind === name
                  ? 'border-accent bg-hover font-semibold text-accent'
                  : 'border-line text-ink hover:bg-hover'
              }`}
            >
              <Icon name={KIND_ICON[name]} size={28} />
              {t(`picker.device.${name}` as MessageKey)}
            </button>
          ))}
        </div>
        {kind === 'tablet' && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={pencil}
              onChange={(e) => setPencil(e.target.checked)}
              className="size-5"
            />
            {t('picker.device.pencil')}
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="min-h-11 rounded-xl border border-line px-4 text-sm hover:bg-hover"
          >
            {t('picker.device.later')}
          </button>
          <span className="grow" />
          <button
            type="button"
            onClick={() => finish(true)}
            className="min-h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:opacity-90"
          >
            {t('picker.device.done')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
