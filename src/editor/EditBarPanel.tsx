import { useRef, useState, type PointerEvent } from 'react'
import {
  BAR_PLACEMENTS,
  BAR_SIZES,
  DEFAULT_PINNED,
  keepKnown,
  moveAction,
  pinAction,
  unpinAction,
  type DeviceMode,
} from '../app/deviceMode'
import {
  BAR_SETS,
  DEFAULT_SET_TOOLS,
  activeSet,
  writeSetTools,
  useSetTools,
  type BarSet,
} from '../app/tools/toolbarState'
import {
  allTools,
  findTool,
  tabLabel,
  toolLabel,
  type Section,
} from '../app/tools/toolRegistry'
import { t, type MessageKey } from '../i18n/t'
import {
  barAutoHideSetting,
  barPlacementSetting,
  barSizeSetting,
} from '../settings/builtinSettings'
import { resetBarSettings } from '../settings/deviceModeSettings'
import { useDeviceSetting } from '../settings/useSetting'
import { allActionIds, type BarAction } from './barActions'

/**
 * "Edit bar": for each tool set (Write, Draw, Read) choose which tools sit
 * on the bar and in what order (drag the handle, or use the arrow buttons),
 * plus the bar's size, position and auto-hide. Saved on this device. Reset
 * goes back to the set's own tools (and, for Write, the mode's bar look).
 */

const BUTTON =
  'min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm hover:bg-hover disabled:opacity-35'

/** The ribbon tabs that suit each set, first one opened. */
const HOME_SECTIONS: Record<BarSet, Section[]> = {
  write: ['home', 'insert'],
  draw: ['draw', 'home'],
  read: ['view', 'home'],
}

export function EditBarPanel({
  actions,
  mode,
  onClose,
}: {
  actions: BarAction[]
  mode: DeviceMode
  onClose: () => void
}) {
  const [set, setSet] = useState<BarSet>(() => activeSet.get())
  const listed = useSetTools(set)
  const [size, setSize] = useDeviceSetting(barSizeSetting)
  const [placement, setPlacement] = useDeviceSetting(barPlacementSetting)
  const [autoHide, setAutoHide] = useDeviceSetting(barAutoHideSetting)
  const dragging = useRef<string | null>(null)

  const known = [...allActionIds(), ...allTools().map((tool) => tool.id)]
  const pinned = keepKnown(listed, known)
  const byId = new Map(actions.map((a) => [a.id, a]))
  const nameOf = (id: string): string => {
    const action = byId.get(id)
    if (action) return action.label
    const tool = findTool(id)
    return tool ? toolLabel(tool) : id
  }
  const save = (list: readonly string[]) => writeSetTools(set, list)

  // Everything that could go on the bar, grouped by where it lives.
  const sectionOf = (id: string): Section => findTool(id)?.section ?? 'home'
  const candidates = [
    ...new Set([...allActionIds(), ...allTools().map((tool) => tool.id)]),
  ].filter((id) => !pinned.includes(id))
  const sections = [...new Set(candidates.map(sectionOf))].sort((a, b) => {
    const order = HOME_SECTIONS[set]
    const rank = (s: Section) => {
      const at = order.indexOf(s)
      return at < 0 ? order.length : at
    }
    return rank(a) - rank(b)
  })

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
    if (from >= 0 && to >= 0) save(moveAction(pinned, id, to - from))
  }

  return (
    <div role="group" aria-label={t('bar.editTitle')} className="grid gap-1">
      <strong className="px-2 pt-1 text-sm">{t('bar.editTitle')}</strong>
      <p className="px-2 text-xs text-ink-soft">{t('bar.editHint')}</p>
      <div
        role="radiogroup"
        aria-label={t('bar.editSet')}
        className="mx-2 flex rounded-xl bg-hover"
      >
        {BAR_SETS.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={set === name}
            onClick={() => setSet(name)}
            className={`min-h-11 flex-1 rounded-xl text-sm ${
              set === name ? 'bg-bg font-semibold text-accent shadow-sm' : ''
            }`}
          >
            {t(`set.${name}` as MessageKey)}
          </button>
        ))}
      </div>
      <ul className="grid gap-0.5">
        {pinned.map((id, i) => (
          <li key={id} data-edit-row={id} className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('bar.drag', { name: nameOf(id) })}
              onPointerDown={(e) => {
                dragging.current = id
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
                onChange={() => save(unpinAction(pinned, id))}
                className="size-5"
              />
              <span className="truncate">{nameOf(id)}</span>
            </label>
            <button
              type="button"
              disabled={i === 0}
              aria-label={t('bar.moveEarlier', { name: nameOf(id) })}
              onClick={() => save(moveAction(pinned, id, -1))}
              className={BUTTON}
            >
              <span aria-hidden>↑</span>
            </button>
            <button
              type="button"
              disabled={i === pinned.length - 1}
              aria-label={t('bar.moveLater', { name: nameOf(id) })}
              onClick={() => save(moveAction(pinned, id, 1))}
              className={BUTTON}
            >
              <span aria-hidden>↓</span>
            </button>
          </li>
        ))}
      </ul>
      {sections.length > 0 && (
        <>
          <p className="px-2 pt-1 text-xs text-ink-soft">{t('bar.notOnBar')}</p>
          {sections.map((section, index) => (
            <details
              key={`${set}:${section}`}
              open={index === 0}
              className="px-1"
            >
              <summary className="flex min-h-11 cursor-pointer items-center px-1 text-sm font-medium">
                {section === 'go' ? t('panel.where.go') : tabLabel(section)}
              </summary>
              <ul className="grid">
                {candidates
                  .filter((id) => sectionOf(id) === section)
                  .map((id) => (
                    <li key={id}>
                      <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => save(pinAction(pinned, id))}
                          className="size-5"
                        />
                        <span>{nameOf(id)}</span>
                      </label>
                    </li>
                  ))}
              </ul>
            </details>
          ))}
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
            if (set === 'write') {
              save(DEFAULT_PINNED)
              resetBarSettings(mode)
            } else save(DEFAULT_SET_TOOLS[set])
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
