import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../app/tools/icons'
import { LAYERS, overlay, trapFocus } from '../../app/overlay'
import { tp } from './textMisc'
import type { Preset } from './timeRange'
import { allPresets, defaultPresets } from './timeRangePresets'
import { moveItem } from './timeRangeBuilderLogic'
import './partsMisc.css'

type Props = {
  name: string
  presets: Preset[]
  onConfirm(next: { name: string; presets: Preset[] }): void
  onCancel(): void
}

/** The "Edit time range" dialog (SP-10): name the bar, tick ranges, reorder. */
export default function TimeRangeBuilder({
  name,
  presets,
  onConfirm,
  onCancel,
}: Props) {
  const all = allPresets()
  const [title, setTitle] = useState(name)
  const [ids, setIds] = useState<string[]>(presets.map((p) => p.id))
  const box = useRef<HTMLDivElement>(null)
  const cancel = useRef(onCancel)
  cancel.current = onCancel

  useEffect(() => {
    const el = box.current
    if (!el) return
    const opener = document.activeElement as HTMLElement | null
    const release = trapFocus(el, opener)
    const handle = overlay.open({
      id: 'time-range-builder',
      layer: 'dialog',
      close: () => cancel.current(),
      inside: (n) => el.contains(n),
      opener,
    })
    el.querySelector<HTMLElement>('input')?.focus()
    return () => {
      release()
      handle.close()
    }
  }, [])

  const byId = (id: string) => all.find((p) => p.id === id)
  const selected = ids.map(byId).filter((p): p is Preset => !!p)
  const rest = all.filter((p) => !ids.includes(p.id))
  const rows = [...selected, ...rest]
  const toggle = (id: string) =>
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const done = () => {
    if (!ids.length) return
    onConfirm({ name: title.trim() || name, presets: selected })
  }

  return (
    <div className="pm-dlg-scrim" style={{ zIndex: LAYERS.dialog }}>
      <div
        ref={box}
        className="pm-dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-range-dlg-title"
        data-testid="range-builder"
      >
        <div className="pm-dlg__head">
          <h2 id="pm-range-dlg-title">{tp('parts.range.builderTitle')}</h2>
          <button
            type="button"
            className="pm-x"
            aria-label={tp('parts.range.close')}
            data-testid="range-builder-close"
            onClick={onCancel}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <label className="pm-dlg__hint" htmlFor="pm-range-bar-name">
          {tp('parts.range.builderName')}
        </label>
        <input
          id="pm-range-bar-name"
          className="pm-input"
          data-testid="range-builder-name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="pm-dlg__hint">{tp('parts.range.builderPick')}</p>
        <div role="group" aria-label={tp('parts.range.builderPick')}>
          {rows.map((p) => {
            const i = ids.indexOf(p.id)
            const on = i >= 0
            return (
              <div className="pm-dlg__row" key={p.id} data-testid={`rb-row-${p.id}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={on}
                    data-testid={`rb-tick-${p.id}`}
                    onChange={() => toggle(p.id)}
                  />
                  {p.label}
                </label>
                {on && (
                  <>
                    <button
                      type="button"
                      className="pm-x"
                      aria-label={`${tp('parts.range.moveUp')}: ${p.label}`}
                      disabled={i === 0}
                      data-testid={`rb-up-${p.id}`}
                      onClick={() => setIds(moveItem(ids, i, i - 1))}
                    >
                      <Icon name="chevronUp" size={18} />
                    </button>
                    <button
                      type="button"
                      className="pm-x"
                      aria-label={`${tp('parts.range.moveDown')}: ${p.label}`}
                      disabled={i === ids.length - 1}
                      data-testid={`rb-down-${p.id}`}
                      onClick={() => setIds(moveItem(ids, i, i + 1))}
                    >
                      <Icon name="chevronDown" size={18} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {!ids.length && (
          <p className="pm-error" role="alert">
            {tp('parts.range.needOne')}
          </p>
        )}
        <p className="pm-dlg__hint">{tp('parts.range.tryIt')}</p>
        <div className="pm-dlg__foot">
          <button
            type="button"
            className="pm-btn pm-btn--quiet"
            data-testid="range-builder-reset"
            onClick={() => {
              setIds(defaultPresets().map((p) => p.id))
              setTitle(tp('parts.range.name'))
            }}
          >
            {tp('parts.range.reset')}
          </button>
          <button
            type="button"
            className="pm-btn"
            data-testid="range-builder-done"
            disabled={!ids.length}
            onClick={done}
          >
            {tp('parts.range.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
