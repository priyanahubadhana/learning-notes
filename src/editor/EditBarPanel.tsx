import { useRef, type PointerEvent } from 'react'
import {
  BAR_PLACEMENTS,
  BAR_SIZES,
  DEFAULT_PINNED,
  moveAction,
  pinAction,
  unpinAction,
  type DeviceMode,
} from '../app/deviceMode'
import { t } from '../i18n/t'
import {
  barAutoHideSetting,
  barPlacementSetting,
  barSizeSetting,
} from '../settings/builtinSettings'
import { resetBarSettings } from '../settings/deviceModeSettings'
import { useDeviceSetting } from '../settings/useSetting'
import type { BarAction } from './barActions'

/**
 * "Edit bar": choose which buttons sit on the docked bar and in what order
 * (drag the handle, or use the arrow buttons), plus its size, position and
 * auto-hide. Saved on this device. Reset goes back to the mode's own bar.
 */

const BUTTON =
  'min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm hover:bg-hover disabled:opacity-35'

export function EditBarPanel({
  actions,
  pinned,
  mode,
  onPinned,
  onClose,
}: {
  actions: BarAction[]
  pinned: readonly string[]
  mode: DeviceMode
  onPinned: (list: readonly string[]) => void
  onClose: () => void
}) {
  const [size, setSize] = useDeviceSetting(barSizeSetting)
  const [placement, setPlacement] = useDeviceSetting(barPlacementSetting)
  const [autoHide, setAutoHide] = useDeviceSetting(barAutoHideSetting)
  const byId = new Map(actions.map((a) => [a.id, a]))
  const onBar = pinned.flatMap((id) => byId.get(id) ?? [])
  const off = actions.filter((a) => !pinned.includes(a.id))
  const dragging = useRef<string | null>(null)

  const dragOver = (e: PointerEvent) => {
    const id = dragging.current
    if (!id) return
    const row = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-edit-row]')
    const target = row?.dataset.editRow
    if (!target || target === id) return
    const from = pinned.indexOf(id)
    const to = pinned.indexOf(target)
    if (from >= 0 && to >= 0) onPinned(moveAction(pinned, id, to - from))
  }

  return (
    <div role="group" aria-label={t('bar.editTitle')} className="grid gap-1">
      <strong className="px-2 pt-1 text-sm">{t('bar.editTitle')}</strong>
      <p className="px-2 text-xs text-muted">{t('bar.editHint')}</p>
      <ul className="grid gap-0.5">
        {onBar.map((action, i) => (
          <li
            key={action.id}
            data-edit-row={action.id}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              aria-label={t('bar.drag', { name: action.label })}
              onPointerDown={(e) => {
                dragging.current = action.id
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={dragOver}
              onPointerUp={() => (dragging.current = null)}
              onPointerCancel={() => (dragging.current = null)}
              style={{ touchAction: 'none' }}
              className={`${BUTTON} cursor-grab`}
            >
              <span aria-hidden>⠿</span>
            </button>
            <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked
                onChange={() => onPinned(unpinAction(pinned, action.id))}
                className="size-5"
              />
              <span className="truncate">{action.label}</span>
            </label>
            <button
              type="button"
              disabled={i === 0}
              aria-label={t('bar.moveEarlier', { name: action.label })}
              onClick={() => onPinned(moveAction(pinned, action.id, -1))}
              className={BUTTON}
            >
              <span aria-hidden>↑</span>
            </button>
            <button
              type="button"
              disabled={i === onBar.length - 1}
              aria-label={t('bar.moveLater', { name: action.label })}
              onClick={() => onPinned(moveAction(pinned, action.id, 1))}
              className={BUTTON}
            >
              <span aria-hidden>↓</span>
            </button>
          </li>
        ))}
      </ul>
      {off.length > 0 && (
        <>
          <p className="px-2 pt-1 text-xs text-muted">{t('bar.notOnBar')}</p>
          <ul className="grid gap-0.5">
            {off.map((action) => (
              <li key={action.id}>
                <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onPinned(pinAction(pinned, action.id))}
                    className="size-5"
                  />
                  <span>{action.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <hr className="my-1 border-line" />
      <label className="flex min-h-11 items-center justify-between gap-3 px-2 text-sm">
        {t('bar.size')}
        <select
          value={size}
          onChange={(e) =>
            setSize(e.target.value as (typeof BAR_SIZES)[number])
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-2"
        >
          {BAR_SIZES.map((s) => (
            <option key={s} value={s}>
              {t(`settings.barSize.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3 px-2 text-sm">
        {t('bar.position')}
        <select
          value={placement}
          onChange={(e) =>
            setPlacement(e.target.value as (typeof BAR_PLACEMENTS)[number])
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-2"
        >
          {BAR_PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {t(`settings.barPlacement.${p}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
        <input
          type="checkbox"
          checked={autoHide === 'on'}
          onChange={(e) => setAutoHide(e.target.checked ? 'on' : 'off')}
          className="size-5"
        />
        {t('bar.autoHide')}
      </label>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            onPinned(DEFAULT_PINNED)
            resetBarSettings(mode)
          }}
          className={`${BUTTON} border border-line`}
        >
          {t('bar.reset')}
        </button>
        <span className="grow" />
        <button
          type="button"
          onClick={onClose}
          className={`${BUTTON} font-semibold text-accent`}
        >
          {t('bar.done')}
        </button>
      </div>
    </div>
  )
}
