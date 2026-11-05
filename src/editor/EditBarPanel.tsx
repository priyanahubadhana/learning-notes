import { useRef, useState, type PointerEvent } from 'react'
import {
  BAR_PLACEMENTS,
  BAR_SIZES,
  unpinAction,
  type DeviceMode,
} from '../app/deviceMode'
import { hiddenTabs, visibleTabs } from '../app/tools/toolbarState'
import { TABS } from '../app/tools/tabs'
import { findTool, tabLabel, toolLabel } from '../app/tools/toolRegistry'
import {
  MAIN_TOOLS,
  PILL_OPTIONS,
  PILL_TOOLS,
  extraTools,
  mainList,
  moveIn,
  pillLists,
  pillOptionsOf,
  resetMainBar,
  setPillOptions,
  toggleIn,
  type MainTool,
  type PillTool,
} from '../app/tools/main/mainTools'
import { pillPlaceStore } from '../app/tools/main/pillPlace'
import { t, type MessageKey } from '../i18n/t'
import {
  barAutoHideSetting,
  barPlacementSetting,
  barSizeSetting,
} from '../settings/builtinSettings'
import { resetBarSettings } from '../settings/deviceModeSettings'
import { useDeviceSetting } from '../settings/useSetting'

/**
 * "Edit bar": show, hide and reorder the tools of the main bar and the
 * options of each tool's pill (tick a row, drag its handle or use ↑ ↓),
 * plus the bar's size, position and auto-hide. Saved on this device. Reset
 * goes back to the standard bar.
 */

const BUTTON =
  'min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm hover:bg-hover disabled:opacity-35'

/** A list of ids you can tick, drag and move. */
function ReorderList({
  all,
  shown,
  nameOf,
  onChange,
  keep = 0,
  scope,
}: {
  /** Every id, in the default order. */
  all: readonly string[]
  /** The ids that show, in order. */
  shown: readonly string[]
  nameOf: (id: string) => string
  onChange: (next: string[]) => void
  /** At least this many always stay. */
  keep?: number
  scope: string
}) {
  const dragging = useRef<string | null>(null)
  const hidden = all.filter((id) => !shown.includes(id))
  const dragOver = (e: PointerEvent) => {
    const id = dragging.current
    if (!id) return
    const row = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>(`[data-edit-row][data-scope="${scope}"]`)
    const target = row?.dataset.editRow
    if (!target || target === id) return
    const from = shown.indexOf(id)
    const to = shown.indexOf(target)
    if (from >= 0 && to >= 0) onChange(moveIn(shown, id, to - from))
  }
  return (
    <ul className="grid gap-0.5" data-edit-list={scope}>
      {shown.map((id, i) => (
        <li
          key={id}
          data-edit-row={id}
          data-scope={scope}
          className="flex items-center gap-1"
        >
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
              disabled={shown.length <= keep}
              onChange={() => onChange(toggleIn(shown, id, all))}
              className="size-5"
            />
            <span className="truncate">{nameOf(id)}</span>
          </label>
          <button
            type="button"
            disabled={i === 0}
            aria-label={t('bar.moveEarlier', { name: nameOf(id) })}
            onClick={() => onChange(moveIn(shown, id, -1))}
            className={BUTTON}
          >
            <span aria-hidden>↑</span>
          </button>
          <button
            type="button"
            disabled={i === shown.length - 1}
            aria-label={t('bar.moveLater', { name: nameOf(id) })}
            onClick={() => onChange(moveIn(shown, id, 1))}
            className={BUTTON}
          >
            <span aria-hidden>↓</span>
          </button>
        </li>
      ))}
      {hidden.map((id) => (
        <li key={id} className="flex items-center gap-1" data-scope={scope}>
          <span className="min-w-11" />
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={false}
              onChange={() => onChange(toggleIn(shown, id, all))}
              className="size-5"
            />
            <span className="truncate">{nameOf(id)}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

export function EditBarPanel({
  mode,
  onClose,
}: {
  mode: DeviceMode
  onClose: () => void
}) {
  const [pillTool, setPillTool] = useState<PillTool>('text')
  const [size, setSize] = useDeviceSetting(barSizeSetting)
  const [placement, setPlacement] = useDeviceSetting(barPlacementSetting)
  const [autoHide, setAutoHide] = useDeviceSetting(barAutoHideSetting)
  const hidden = hiddenTabs.useValue()
  const shownTabs = visibleTabs(hidden)
  const main = mainList.useValue()
  const map = pillLists.useValue()
  const extras = extraTools.useValue()

  const mainName = (id: string) => t(`main.tool.${id}` as MessageKey)
  const optName = (id: string) => t(`main.opt.${pillTool}.${id}` as MessageKey)

  return (
    <div role="group" aria-label={t('bar.editTitle')} className="grid gap-1">
      <strong className="px-2 pt-1 text-sm">{t('bar.editTitle')}</strong>
      <p className="px-2 text-xs text-ink-soft">{t('bar.editHint')}</p>
      <p className="px-2 pt-1 text-xs font-semibold text-ink-soft">
        {t('bar.editMain')}
      </p>
      <ReorderList
        scope="main"
        all={MAIN_TOOLS}
        shown={main}
        keep={1}
        nameOf={mainName}
        onChange={(next) => mainList.set(next as MainTool[])}
      />
      <label className="flex min-h-11 items-center justify-between gap-3 px-2 pt-1 text-sm font-semibold">
        <span className="text-xs text-ink-soft">{t('bar.editPill')}</span>
        <select
          aria-label={t('bar.editPill')}
          value={pillTool}
          onChange={(e) => setPillTool(e.target.value as PillTool)}
          className="min-h-11 rounded-lg border border-line bg-bg px-2 font-normal"
        >
          {PILL_TOOLS.map((tool) => (
            <option key={tool} value={tool}>
              {t(`main.tool.${tool}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <ReorderList
        scope={`pill-${pillTool}`}
        all={PILL_OPTIONS[pillTool]}
        shown={pillOptionsOf(pillTool, map)}
        nameOf={optName}
        onChange={(next) => setPillOptions(pillTool, next)}
      />
      {extras.length > 0 && (
        <>
          <p className="px-2 pt-1 text-xs font-semibold text-ink-soft">
            {t('bar.editExtras')}
          </p>
          <ul className="grid">
            {extras.map((id) => {
              const tool = findTool(id)
              return (
                <li key={id} className="flex items-center gap-1 px-2">
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => extraTools.set(unpinAction(extras, id))}
                      className="size-5"
                    />
                    <span className="truncate">
                      {tool ? toolLabel(tool) : id}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <hr className="my-1 border-line" />
      <fieldset className="px-2">
        <legend className="pb-0.5 text-xs text-ink-soft">
          {t('bar.editTabs')}
        </legend>
        <div className="flex flex-wrap gap-x-3">
          {TABS.map((tab) => (
            <label
              key={tab}
              className="flex min-h-11 items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="size-5"
                checked={shownTabs.includes(tab)}
                disabled={shownTabs.length === 1 && shownTabs.includes(tab)}
                onChange={(e) =>
                  hiddenTabs.set(
                    e.target.checked
                      ? hidden.filter((x) => x !== tab)
                      : [...hidden, tab],
                  )
                }
              />
              {tabLabel(tab)}
            </label>
          ))}
        </div>
      </fieldset>
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
          {BAR_PLACEMENTS.filter(
            (p) => p !== 'floating' || placement === p,
          ).map((p) => (
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
            resetMainBar()
            pillPlaceStore.set(null)
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
