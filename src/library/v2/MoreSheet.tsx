import { useState, type ReactNode } from 'react'
import { SheetBase } from '../../design/parts/SheetBase'
import { ClearField } from '../../design/parts/ClearField'
import { t } from '../../i18n/t'
import type { SourceFilter } from '../libraryService'
import {
  newCollectionId,
  type LibraryPrefs,
  type ShelfId,
  type SortKey,
} from './libraryPrefs'

type Section = 'filter' | 'view' | 'shelves' | 'import' | 'daily'
const SECTIONS: Section[] = ['filter', 'view', 'shelves', 'import', 'daily']
const TYPES: SourceFilter[] = ['all', 'books', 'videos', 'articles', 'pasted']
const SORTS: SortKey[] = ['recent', 'added', 'title', 'author', 'progress']

function Switch({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--color-accent)]"
      />
    </label>
  )
}

/**
 * The More sheet (LB-B27..B32): Filter, View, Shelves, Import & capture,
 * Daily Highlights. Nothing changes until Done; ✕ keeps everything as it was.
 */
export function MoreSheet({
  prefs,
  tagNames,
  onDone,
  onClose,
  onTag,
  onImport,
  onCapture,
  onDaily,
  onExport,
  prompts,
}: {
  prefs: LibraryPrefs
  /** Names of the tags now filtered by. */
  tagNames: string[]
  onDone: (patch: Partial<LibraryPrefs>) => void
  onClose: () => void
  onTag: (patch: Partial<LibraryPrefs>) => void
  onImport: () => void
  onCapture: () => void
  onDaily: () => void
  onExport: () => void
  prompts: ReactNode
}) {
  const [section, setSection] = useState<Section>('filter')
  const [d, setD] = useState<Partial<LibraryPrefs>>({})
  const v = { ...prefs, ...d } as LibraryPrefs
  const set = (p: Partial<LibraryPrefs>) => setD((x) => ({ ...x, ...p }))
  const [name, setName] = useState('')
  const addCollection = () => {
    const n = name.trim().slice(0, 80)
    if (!n) return
    const id = newCollectionId(n, v.collections)
    set({ collections: [...v.collections, { id, name: n }] })
    setName('')
  }
  return (
    <SheetBase
      title={t('lib2.more.title')}
      onClose={onClose}
      data-testid="library-more"
      footer={
        <button
          type="button"
          data-testid="more-done"
          onClick={() => onDone(d)}
          className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white"
        >
          {t('lib2.done')}
        </button>
      }
    >
      <p className="mb-1 text-xs text-muted">{t('lib2.more.sub')}</p>
      <p className="mb-2 text-xs text-muted">{t('lib2.more.hint')}</p>
      <div
        role="tablist"
        aria-label={t('lib2.more.title')}
        className="mb-3 flex gap-1 overflow-x-auto"
      >
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            onClick={() => setSection(s)}
            className={`min-h-11 shrink-0 rounded-full px-3 text-sm ${section === s ? 'bg-accent/10 font-medium text-ink' : 'text-muted hover:bg-hover'}`}
          >
            {t(`lib2.more.${s}`)}
          </button>
        ))}
      </div>
      {section === 'filter' && (
        <div role="group" aria-label={t('library.filters')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
            {TYPES.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={v.type === f}
                data-testid={`more-type-${f}`}
                onClick={() => set({ type: f })}
                className={`min-h-[72px] rounded-[14px] border text-sm ${v.type === f ? 'border-accent bg-accent/10 font-medium' : 'border-line hover:bg-hover'}`}
              >
                {t(`library.filter.${f}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="more-tags"
            onClick={() => onTag(d)}
            className="mt-3 flex min-h-11 w-full items-center justify-between rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            <span>{t('lib2.tag')}</span>
            <span className="text-muted">
              {tagNames.length ? tagNames.join(', ') : t('lib2.allTags')} ▾
            </span>
          </button>
        </div>
      )}
      {section === 'view' && (
        <div>
          <div
            role="radiogroup"
            aria-label={t('lib2.view.default')}
            className="flex gap-2"
          >
            {(['grid', 'list'] as const).map((x) => (
              <button
                key={x}
                type="button"
                role="radio"
                aria-checked={v.view === x}
                onClick={() => set({ view: x })}
                className={`min-h-11 flex-1 rounded-lg border text-sm ${v.view === x ? 'border-accent bg-accent/10 font-medium' : 'border-line hover:bg-hover'}`}
              >
                {t(`lib2.view.${x}`)}
              </button>
            ))}
          </div>
          <label className="mt-3 flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{t('lib2.sortBy')}</span>
            <select
              value={v.sort}
              onChange={(e) => set({ sort: e.target.value as SortKey })}
              className="min-h-11 rounded-lg border border-line bg-bg px-2"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`lib2.sort.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <Switch
            label={t('lib2.showProgress')}
            on={v.showProgress}
            onChange={(x) => set({ showProgress: x })}
          />
          <Switch
            label={t('lib2.showAuthor')}
            on={v.showAuthor}
            onChange={(x) => set({ showAuthor: x })}
          />
          <Switch
            label={t('lib2.knowStats')}
            on={v.knowStats}
            onChange={(x) => set({ knowStats: x })}
          />
          <button
            type="button"
            onClick={onExport}
            className="mt-1 min-h-11 text-sm text-accent"
          >
            {t('lib2.openExport')}
          </button>
        </div>
      )}
      {section === 'shelves' && (
        <div>
          <ul>
            {(['all', 'reading', 'want', 'finished'] as const).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  aria-pressed={v.shelf === s}
                  onClick={() => set({ shelf: s })}
                  className={`min-h-11 w-full rounded-lg px-3 text-start text-sm hover:bg-hover ${v.shelf === s ? 'bg-hover font-medium' : ''}`}
                >
                  {t(`lib2.shelf.${s}`)}
                </button>
              </li>
            ))}
            {v.collections.map((c) => (
              <li key={c.id} className="flex items-center">
                <button
                  type="button"
                  aria-pressed={v.shelf === `c:${c.id}`}
                  onClick={() => set({ shelf: `c:${c.id}` as ShelfId })}
                  className={`min-h-11 flex-1 truncate rounded-lg px-3 text-start text-sm hover:bg-hover ${v.shelf === `c:${c.id}` ? 'bg-hover font-medium' : ''}`}
                >
                  {c.name}
                </button>
                <button
                  type="button"
                  aria-label={t('lib2.collection.remove', { name: c.name })}
                  onClick={() =>
                    set({
                      collections: v.collections.filter((x) => x.id !== c.id),
                      shelf: v.shelf === `c:${c.id}` ? 'all' : v.shelf,
                    })
                  }
                  className="grid size-11 place-items-center rounded-full text-muted hover:bg-hover"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <ClearField
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClear={() => setName('')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCollection()
              }}
              placeholder={t('lib2.collection.new')}
              aria-label={t('lib2.collection.new')}
              maxLength={80}
              className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-3 text-sm"
            />
            <button
              type="button"
              onClick={addCollection}
              className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
            >
              {t('lib2.collection.add')}
            </button>
          </div>
        </div>
      )}
      {section === 'import' && (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={onImport}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('library.import')}
          </button>
          <button
            type="button"
            onClick={onCapture}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('library.capture')}
          </button>
          {prompts}
          <p className="text-xs text-muted">{t('library.importHint')}</p>
        </div>
      )}
      {section === 'daily' && (
        <div>
          <p className="mb-2 text-sm text-muted">{t('lib2.daily.hint')}</p>
          <button
            type="button"
            onClick={onDaily}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('lib2.daily.open')}
          </button>
        </div>
      )}
    </SheetBase>
  )
}
