import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LearningNotesDB } from '../core/db'
import {
  BORDER_WIDTHS,
  cleanStyle,
  COLOUR_TOKENS,
  frameCss,
  NAMED_PRESETS,
  PADS,
  RADII,
  sameStyle,
  SWATCHES,
  MAX_OWN_PRESETS,
  type BoxStyle,
  type ColourToken,
  type OwnPreset,
} from '../core/boxStyle'
import { t, type MessageKey } from '../i18n/t'
import { boxesOf, MAIN_BOX } from './boxes'
import {
  deletePreset,
  loadNewBoxStyle,
  loadPresets,
  renamePreset,
  savePreset,
  setNewBoxStyle,
} from './boxPresets'
import { updateBox } from './boxService'

/**
 * The Box style panel (bug batch 2, item 8; docs/plans/text-tool-plan.md, 3):
 * Presets (ten one-tap swatches, named styles, the person's own up to 8,
 * synced per account) and Advanced (background, border, corners, shadow,
 * padding). Changes show on the real box at once. Loaded only when opened.
 */

const name = (key: string) => t(key as MessageKey)

function Swatch({
  style,
  label,
  on,
  onClick,
}: {
  style: BoxStyle
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      data-box-swatch={label}
      className={
        'relative size-11 rounded-lg ' +
        (on ? 'ring-2 ring-accent' : 'ring-1 ring-line')
      }
      style={{
        ...frameCss({ ...style, radius: undefined, shadow: undefined }),
      }}
    >
      {!style.bg && !style.border && (
        <span
          aria-hidden
          className="absolute inset-1 rounded-md border border-dashed border-line"
        />
      )}
    </button>
  )
}

function Chips({
  label,
  value,
  options,
  show,
  onPick,
}: {
  label: string
  value: string | number | undefined
  options: readonly (string | number)[]
  show: (v: string | number) => string
  onPick: (v: never) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onPick(o as never)}
            className={
              'min-h-9 min-w-9 rounded-md px-2 text-sm ' +
              (value === o ? 'bg-accent text-white' : 'bg-soft hover:bg-hover')
            }
          >
            {show(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BoxStylePopover({
  db,
  pageId,
  boxId,
  onClose,
}: {
  db: LearningNotesDB
  pageId: string
  boxId: string
  onClose: () => void
}) {
  const page = useLiveQuery(() => db.pages.get(pageId), [db, pageId])
  const box = page ? boxesOf(page).find((b) => b.id === boxId) : undefined
  const style = cleanStyle(box?.style) ?? {}
  const [tab, setTab] = useState<'presets' | 'advanced'>('presets')
  const [own, setOwn] = useState<OwnPreset[]>([])
  const [dflt, setDflt] = useState<BoxStyle | undefined>(undefined)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    void loadPresets(db).then(setOwn)
    void loadNewBoxStyle(db).then(setDflt)
  }, [db])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  // A new box remembers the last style you gave a box (owner, 11 Nov); the
  // page's own box is not the example, it keeps its style to itself.
  const apply = (next: BoxStyle | undefined) => {
    void updateBox(db, pageId, boxId, { style: cleanStyle(next) })
    if (boxId !== MAIN_BOX) {
      setDflt(cleanStyle(next))
      void setNewBoxStyle(db, cleanStyle(next))
    }
  }
  const set = (patch: Partial<BoxStyle>) => {
    const next = { ...style, ...patch, preset: undefined } as BoxStyle
    apply(next)
  }
  const useNew = sameStyle(dflt, style) && !!dflt
  const full = own.length >= MAX_OWN_PRESETS

  const panel = (
    <div
      role="dialog"
      aria-label={t('boxStyle.title')}
      data-ui
      data-box-style-panel
      className="glass fixed right-3 bottom-3 z-[65] flex max-h-[80vh] w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-2xl p-3 text-ink shadow-[var(--elev-3)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" className="flex gap-1">
          {(['presets', 'advanced'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={
                'min-h-9 rounded-md px-3 text-sm ' +
                (tab === id ? 'bg-hover font-medium' : 'text-muted')
              }
            >
              {t(id === 'presets' ? 'boxStyle.presets' : 'boxStyle.advanced')}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('boxStyle.close')}
          className="min-h-9 rounded-md px-2 text-sm text-muted hover:bg-hover"
        >
          ✕
        </button>
      </div>

      {tab === 'presets' ? (
        <>
          <div className="grid grid-cols-5 gap-2">
            {SWATCHES.map((s) => (
              <Swatch
                key={s.id}
                style={s.style}
                label={name('boxStyle.sw.' + s.id)}
                on={
                  sameStyle(style, s.style) || (!box?.style && s.id === 'none')
                }
                onClick={() => apply({ ...s.style, preset: s.id })}
              />
            ))}
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted">
              {t('boxStyle.styles')}
            </h3>
            <div className="flex flex-wrap gap-1">
              {NAMED_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => apply({ ...p.style, preset: p.id })}
                  aria-pressed={style.preset === p.id}
                  className={
                    'min-h-9 rounded-md border px-2 text-sm ' +
                    (style.preset === p.id ? 'border-accent' : 'border-line')
                  }
                >
                  {name('boxStyle.preset.' + p.id)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted">
              {t('boxStyle.mine')}
            </h3>
            <ul className="flex flex-col gap-1">
              {own.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  {editing === p.id ? (
                    <input
                      autoFocus
                      defaultValue={p.name}
                      aria-label={t('boxStyle.rename')}
                      onBlur={(e) => {
                        void renamePreset(db, p.id, e.target.value).then(setOwn)
                        setEditing(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                      className="min-h-9 flex-1 rounded-md border border-line bg-bg px-2 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => apply({ ...p.style, preset: p.id })}
                      className="min-h-9 flex-1 rounded-md border border-line px-2 text-left text-sm"
                    >
                      {p.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(p.id)}
                    className="min-h-9 rounded-md px-2 text-sm text-muted hover:bg-hover"
                  >
                    {t('boxStyle.rename')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('boxStyle.delete')}
                    onClick={() => void deletePreset(db, p.id).then(setOwn)}
                    className="min-h-9 rounded-md px-2 text-sm text-danger hover:bg-hover"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              data-box-style-save
              disabled={full}
              onClick={() =>
                void savePreset(
                  db,
                  t('boxStyle.saveName', { n: own.length + 1 }),
                  style,
                ).then((n) => n && setOwn(n))
              }
              className="mt-1 min-h-9 rounded-md px-2 text-sm text-accent hover:bg-hover disabled:text-muted"
            >
              {full ? t('boxStyle.full') : t('boxStyle.save')}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <Chips
            label={t('boxStyle.bg')}
            value={style.bg ?? 'none'}
            options={COLOUR_TOKENS}
            show={(v) => name('boxStyle.sw.' + v)}
            onPick={(v: ColourToken) => set({ bg: v })}
          />
          <Chips
            label={t('boxStyle.border')}
            value={style.border ?? 'none'}
            options={COLOUR_TOKENS}
            show={(v) => name('boxStyle.sw.' + v)}
            onPick={(v: ColourToken) => set({ border: v })}
          />
          <Chips
            label={t('boxStyle.borderW')}
            value={style.borderW ?? 0}
            options={BORDER_WIDTHS}
            show={(v) => v + ' px'}
            onPick={(v: 0 | 1 | 2 | 3) => set({ borderW: v })}
          />
          <Chips
            label={t('boxStyle.radius')}
            value={style.radius ?? 0}
            options={RADII}
            show={(v) => v + ' px'}
            onPick={(v: 0 | 4 | 8 | 12 | 16) => set({ radius: v })}
          />
          <Chips
            label={t('boxStyle.pad')}
            value={style.pad ?? 0}
            options={PADS}
            show={(v) => v + ' px'}
            onPick={(v: 0 | 4 | 8 | 12 | 16) => set({ pad: v })}
          />
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!style.shadow}
              onChange={(e) => set({ shadow: e.target.checked })}
            />
            {t('boxStyle.shadow')}
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            data-box-style-new
            checked={useNew}
            onChange={(e) => {
              const next = e.target.checked ? style : undefined
              setDflt(cleanStyle(next))
              void setNewBoxStyle(db, next)
            }}
          />
          {t('boxStyle.useNew')}
        </label>
        <button
          type="button"
          onClick={() => apply(undefined)}
          className="min-h-9 rounded-md px-2 text-sm text-muted hover:bg-hover"
        >
          {t('boxStyle.reset')}
        </button>
      </div>
    </div>
  )
  return createPortal(panel, document.body)
}
