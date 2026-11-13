import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Plus, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { ClearField } from '../design/parts/ClearField'
import { TagPickerLazy } from '../design/parts/TagPicker/TagPickerLazy'
import type { TagItem } from '../design/parts/TagPicker/tagSearch'
import { t, type MessageKey } from '../i18n/t'
import { newJobId } from './buildState'
import { findOrCreateTagPath, listTags } from '../tags/tagService'
import { joinTagPath } from '../tags/tagNames'
import {
  EMPTY_FILTER,
  FOR_TYPES,
  SORTS,
  addView,
  chipsOf,
  clearAll,
  clearChip,
  filterWorkflows,
  loadViews,
  removeView,
  sameFilter,
  saveViews,
  type Chip,
  type ForType,
  type SavedView,
  type Sort,
  type WfFilter,
  type Workflow,
} from './workflowList'

const field =
  'min-h-11 rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'
const iconBtn =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover'
const primary =
  'aifw-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent'

/**
 * Workflows (owner comment A4): a list of saved plans you can run again,
 * filtered like every list in the app: the shared Tag picker (Any or All),
 * More filters, a search box, a sort, one chip per filter with Clear all, and
 * a live "N of M" count.
 */
export function Workflows({
  db,
  items,
  onChange,
  onRun,
  onRemove,
  onSay,
}: {
  db: LearningNotesDB
  items: readonly Workflow[]
  onChange: (next: Workflow[]) => void
  onRun: (w: Workflow) => void
  onRemove: (w: Workflow) => void
  /** A short message, with an optional Undo, shown as a toast. */
  onSay?: (message: string, action?: { label: string; run: () => void }) => void
}) {
  const [f, setF] = useState<WfFilter>(EMPTY_FILTER)
  const [more, setMore] = useState(false)
  const [views, setViewsState] = useState<SavedView[]>(loadViews)
  const [naming, setNaming] = useState<string | null>(null)
  const [dup, setDup] = useState(false)
  const setViews = (next: SavedView[]) => {
    setViewsState(next)
    saveViews(next)
  }
  const [picker, setPicker] = useState<'filter' | string | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const liveTags = useLiveQuery(() => listTags(db), [db])
  const tags = useMemo(() => liveTags ?? [], [liveTags])
  const names = useMemo(() => new Map(tags.map((x) => [x.id, x.name])), [tags])
  const tagItems: TagItem[] = useMemo(
    () =>
      tags.map((x) => ({
        id: x.id,
        name: x.name,
        parentId: x.parentId,
        count: items.filter((w) => w.tagIds.includes(x.id)).length,
        color: x.color,
      })),
    [tags, items],
  )
  const shown = filterWorkflows(items, f)
  const chips = chipsOf(f)
  const current = views.find((v) => sameFilter(v.filter, f))
  const saveView = () => {
    const name = (naming ?? '').trim()
    if (!name) return
    const next = addView(views, name, f, newJobId())
    if (next.length === views.length) return setDup(true)
    setViews(next)
    setNaming(null)
    setDup(false)
    onSay?.(t('aifw.wf.view.saved', { name }))
  }
  const dropView = (v: SavedView) => {
    setViews(removeView(views, v.id))
    onSay?.(t('aifw.wf.view.removed', { name: v.name }), {
      label: t('aifw.undo'),
      run: () => setViews([...removeView(loadViews(), v.id), v]),
    })
  }
  const moreN = f.forTypes.length + (f.minRating ? 1 : 0) + (f.minUses ? 1 : 0)
  const patch = (p: Partial<WfFilter>) => setF({ ...f, ...p })
  const edit = (id: string, p: Partial<Workflow>) =>
    onChange(items.map((w) => (w.id === id ? { ...w, ...p } : w)))
  const forName = (v: string) => t(`aifw.wf.for.${v}` as MessageKey)

  const chipLabel = (c: Chip): string => {
    switch (c.kind) {
      case 'q':
        return t('aifw.wf.chip.q', { q: f.q.trim() })
      case 'tag':
        return `#${names.get(c.value ?? '') ?? ''}`
      case 'all':
        return t('aifw.wf.chip.all')
      case 'for':
        return t('aifw.wf.chip.for', { name: forName(c.value ?? '') })
      case 'rating':
        return t('aifw.wf.chip.rating', { n: f.minRating })
      case 'uses':
        return t('aifw.wf.chip.uses', { n: f.minUses })
    }
  }

  const create = (name: string, parentId: string | null) => {
    const parent = parentId ? names.get(parentId) : undefined
    return findOrCreateTagPath(
      db,
      joinTagPath(parent ? [parent, name] : [name]),
    )
  }
  const assigning = picker && picker !== 'filter' ? picker : null
  const assigningW = items.find((w) => w.id === assigning)

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-line p-3"
      data-aifw-card
      aria-labelledby="aifw-wf-h"
      data-testid="aifw-workflows"
      onKeyDown={(e) => {
        // Esc closes an open Tag picker only, not the whole screen.
        if (e.key === 'Escape' && picker) {
          e.stopPropagation()
          setPicker(null)
        }
      }}
    >
      <h3 id="aifw-wf-h" className="text-sm font-semibold">
        {t('aifw.wf.title')}
      </h3>
      <p className="text-xs text-muted">{t('aifw.wf.hint')}</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btn}
          aria-haspopup="dialog"
          data-testid="aifw-wf-tags"
          onClick={(e) => {
            setAnchorEl(e.currentTarget)
            setPicker('filter')
          }}
        >
          <Tags size={18} strokeWidth={1.6} aria-hidden />
          {t('aifw.wf.tags')}
          <ChevronDown size={16} strokeWidth={1.6} aria-hidden />
        </button>
        <button
          type="button"
          className={btn}
          aria-expanded={more}
          data-testid="aifw-wf-more"
          onClick={() => setMore(!more)}
        >
          {moreN ? t('aifw.wf.moreN', { n: moreN }) : t('aifw.wf.more')}
          <ChevronDown size={16} strokeWidth={1.6} aria-hidden />
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">{t('aifw.wf.sort')}</span>
          <select
            value={f.sort}
            data-testid="aifw-wf-sort"
            className={field}
            onChange={(e) => patch({ sort: e.target.value as Sort })}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`aifw.wf.sort.${s}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ClearField
        type="search"
        value={f.q}
        aria-label={t('aifw.wf.search')}
        placeholder={t('aifw.wf.search')}
        data-testid="aifw-wf-search"
        className={`${field} w-full`}
        onChange={(e) => patch({ q: e.target.value })}
        onClear={() => patch({ q: '' })}
      />

      {more && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-line p-3"
          data-testid="aifw-wf-morepanel"
        >
          <div
            role="group"
            aria-label={t('aifw.wf.for')}
            className="flex flex-wrap gap-2"
          >
            {FOR_TYPES.map((v) => {
              const on = f.forTypes.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  data-testid={`aifw-wf-for-${v}`}
                  className={`${btn} ${on ? 'border-accent bg-soft font-semibold' : ''}`}
                  onClick={() =>
                    patch({
                      forTypes: on
                        ? f.forTypes.filter((x) => x !== v)
                        : [...f.forTypes, v],
                    })
                  }
                >
                  {forName(v)}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              {t('aifw.wf.minRating')}
              <select
                value={f.minRating}
                data-testid="aifw-wf-minrating"
                className={field}
                onChange={(e) => patch({ minRating: Number(e.target.value) })}
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n ? t('aifw.wf.stars', { n }) : t('aifw.wf.for.any')}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('aifw.wf.minUses')}
              <select
                value={f.minUses}
                data-testid="aifw-wf-minuses"
                className={field}
                onChange={(e) => patch({ minUses: Number(e.target.value) })}
              >
                {[0, 1, 2, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n ? t('aifw.wf.times', { n }) : t('aifw.wf.for.any')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <div
        role="group"
        aria-label={t('aifw.wf.views')}
        className="flex flex-wrap items-center gap-2"
        data-testid="aifw-wf-views"
      >
        <button
          type="button"
          aria-pressed={chips.length === 0}
          data-testid="aifw-wf-view-all"
          className={`${btn} ${chips.length === 0 ? 'border-accent bg-soft font-semibold' : ''}`}
          onClick={() => setF(clearAll(f))}
        >
          {t('aifw.wf.view.all')}
        </button>
        {views.map((v) => (
          <span
            key={v.id}
            data-testid="aifw-wf-view"
            className={`inline-flex min-h-11 items-center rounded-lg border ${
              current === v ? 'border-accent bg-soft' : 'border-line'
            }`}
          >
            <button
              type="button"
              aria-pressed={current === v}
              data-testid="aifw-wf-view-pick"
              className="min-h-11 rounded-l-lg px-3 text-sm hover:bg-hover"
              onClick={() => setF({ ...v.filter })}
            >
              {v.name}
            </button>
            <button
              type="button"
              className={iconBtn}
              aria-label={t('aifw.wf.view.delete', { name: v.name })}
              data-testid="aifw-wf-view-delete"
              onClick={() => dropView(v)}
            >
              <X size={16} strokeWidth={1.6} aria-hidden />
            </button>
          </span>
        ))}
        {chips.length > 0 && !current && naming === null && (
          <button
            type="button"
            className={btn}
            data-testid="aifw-wf-view-save"
            onClick={() => {
              setNaming('')
              setDup(false)
            }}
          >
            <Plus size={18} strokeWidth={1.6} aria-hidden />
            {t('aifw.wf.view.save')}
          </button>
        )}
      </div>
      {naming !== null && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={naming}
              maxLength={60}
              aria-label={t('aifw.wf.view.name')}
              placeholder={t('aifw.wf.view.name')}
              data-testid="aifw-wf-view-name"
              className={`${field} min-w-0 flex-1`}
              onChange={(e) => {
                setNaming(e.target.value)
                setDup(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveView()
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setNaming(null)
                }
              }}
            />
            <button
              type="button"
              className={btn}
              disabled={!naming.trim()}
              data-testid="aifw-wf-view-ok"
              onClick={saveView}
            >
              {t('aifw.wf.view.saveBtn')}
            </button>
            <button
              type="button"
              className={iconBtn}
              aria-label={t('aifw.wf.view.cancel')}
              data-testid="aifw-wf-view-cancel"
              onClick={() => setNaming(null)}
            >
              <X size={18} strokeWidth={1.6} aria-hidden />
            </button>
          </div>
          {dup && (
            <p className="text-xs" role="alert" data-testid="aifw-wf-view-dup">
              {t('aifw.wf.view.dup')}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        {chips.map((c) => (
          <span
            key={`${c.kind}:${c.value ?? ''}`}
            data-testid="aifw-wf-chip"
            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line pl-3 text-sm"
          >
            {chipLabel(c)}
            <button
              type="button"
              className={iconBtn}
              aria-label={t('aifw.wf.chip.remove', { name: chipLabel(c) })}
              onClick={() => setF(clearChip(f, c))}
            >
              <X size={16} strokeWidth={1.6} aria-hidden />
            </button>
          </span>
        ))}
        {chips.length > 0 && (
          <button
            type="button"
            className={btn}
            data-testid="aifw-wf-clear"
            onClick={() => setF(clearAll(f))}
          >
            {t('aifw.wf.clear')}
          </button>
        )}
        <span
          className="ml-auto text-xs text-muted"
          data-testid="aifw-wf-count"
        >
          {t('aifw.wf.count', { n: shown.length, m: items.length })}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted" data-testid="aifw-wf-empty">
          {t('aifw.wf.empty')}
        </p>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted" data-testid="aifw-wf-nomatch">
            {t('aifw.wf.noMatch')}
          </p>
          <button
            type="button"
            className={btn}
            onClick={() => setF(clearAll(f))}
          >
            {t('aifw.wf.clear')}
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="aifw-wf-list">
          {shown.map((w) => (
            <li
              key={w.id}
              data-testid="aifw-wf-row"
              className="flex flex-col gap-2 rounded-lg border border-line p-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium break-words">
                    {w.name}
                  </span>
                  <span className="text-xs text-muted">
                    {t('aifw.wf.steps', {
                      n: (w.plan.steps as unknown[] | undefined)?.length ?? 0,
                    })}
                    {' · '}
                    {t('aifw.wf.used', { n: w.uses })}
                    {w.tagIds.length > 0 &&
                      ` · ${w.tagIds
                        .map((id) => `#${names.get(id) ?? ''}`)
                        .join(' ')}`}
                  </span>
                </div>
                <button
                  type="button"
                  className={iconBtn}
                  aria-label={t('aifw.wf.remove', { name: w.name })}
                  data-testid="aifw-wf-remove"
                  onClick={() => onRemove(w)}
                >
                  <X size={18} strokeWidth={1.6} aria-hidden />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={w.forType}
                  aria-label={t('aifw.wf.setFor', { name: w.name })}
                  className={field}
                  onChange={(e) =>
                    edit(w.id, { forType: e.target.value as ForType | '' })
                  }
                >
                  <option value="">{t('aifw.wf.for.any')}</option>
                  {FOR_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {forName(v)}
                    </option>
                  ))}
                </select>
                <select
                  value={w.rating}
                  aria-label={t('aifw.wf.setRating', { name: w.name })}
                  data-testid="aifw-wf-rate"
                  className={field}
                  onChange={(e) =>
                    edit(w.id, { rating: Number(e.target.value) })
                  }
                >
                  <option value={0}>{t('aifw.wf.noRating')}</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {t('aifw.wf.stars', { n })}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={btn}
                  aria-label={t('aifw.wf.setTags', { name: w.name })}
                  data-testid="aifw-wf-settags"
                  onClick={(e) => {
                    setAnchorEl(e.currentTarget)
                    setPicker(w.id)
                  }}
                >
                  <Tags size={18} strokeWidth={1.6} aria-hidden />
                </button>
                <button
                  type="button"
                  className={`${primary} ml-auto`}
                  aria-label={t('aifw.wf.runName', { name: w.name })}
                  data-testid="aifw-wf-run"
                  onClick={() => onRun(w)}
                >
                  {t('aifw.wf.run')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {picker === 'filter' && (
        <TagPickerLazy
          mode="filter"
          tags={tagItems}
          anchor={anchorEl}
          value={f.tagIds}
          onChange={(ids) => patch({ tagIds: ids })}
          match={f.tagMatch}
          onMatch={(m) => patch({ tagMatch: m })}
          onCreate={(name, parentId) =>
            runTask(
              create(name, parentId).then((made) =>
                patch({ tagIds: [...f.tagIds, made.id] }),
              ),
            )
          }
          onClose={() => setPicker(null)}
        />
      )}
      {assigningW && (
        <TagPickerLazy
          mode="assign"
          tags={tagItems}
          itemTags={[assigningW.tagIds]}
          anchor={anchorEl}
          onToggle={(tagId, on) =>
            edit(assigningW.id, {
              tagIds: on
                ? [...new Set([...assigningW.tagIds, tagId])]
                : assigningW.tagIds.filter((x) => x !== tagId),
            })
          }
          onCreate={(name, parentId) =>
            runTask(
              create(name, parentId).then((made) =>
                edit(assigningW.id, {
                  tagIds: [...new Set([...assigningW.tagIds, made.id])],
                }),
              ),
            )
          }
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  )
}
