import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { downloadFile } from '../../app/download'
import { loadExportItems } from './exportData'
import type { LearningNotesDB } from '../../core/db'
import { HIGHLIGHT_COLOURS, type HighlightColour } from '../../core/types'
import { t } from '../../i18n/t'
import { COLOUR_FILL } from '../../reader/annotations/colours'
import {
  DEFAULT_EXPORT,
  INCLUDE_KEYS,
  buildExport,
  planExport,
  type ExportOptions,
} from './exportBuilder'

/** The Export card (LB-B45..B47): which books, what to include, only, format. */
export function ExportCard({ db }: { db: LearningNotesDB }) {
  const { toast } = useContext(AppUiContext)
  const [o, setO] = useState<ExportOptions>(DEFAULT_EXPORT)
  const first = useRef<HTMLSelectElement>(null)
  const data = useLiveQuery(() => loadExportItems(db), [db])
  const plan = useMemo(() => planExport(data?.items ?? [], [], o), [data, o])
  const toggle = (k: keyof ExportOptions['include']) =>
    setO({ ...o, include: { ...o.include, [k]: !o.include[k] } })
  const run = () => {
    downloadFile(
      o.format === 'csv'
        ? 'learning-notes-highlights.csv'
        : 'learning-notes-highlights.md',
      buildExport(plan, o),
      o.format === 'csv' ? 'text/csv' : 'text/markdown',
    )
    toast(t(o.format === 'csv' ? 'lib2.export.doneCsv' : 'lib2.export.doneMd'))
  }
  return (
    <section
      aria-label={t('lib2.export.title')}
      data-testid="export-card"
      className="max-w-[560px] rounded-[20px] border border-line p-4"
    >
      <h2 className="mb-3 text-lg font-semibold">{t('lib2.export.title')}</h2>
      <label className="mb-3 flex flex-col gap-1 text-sm">
        <span className="text-muted">{t('lib2.export.which')}</span>
        <select
          ref={first}
          data-autofocus
          data-testid="export-books"
          value={o.bookIds[0] ?? ''}
          onChange={(e) =>
            setO({ ...o, bookIds: e.target.value ? [e.target.value] : [] })
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-2"
        >
          <option value="">{t('lib2.export.allBooks')}</option>
          {(data?.books ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mb-3">
        <legend className="mb-1 text-sm text-muted">
          {t('lib2.export.include')}
        </legend>
        <div className="grid grid-cols-2 gap-x-4">
          {INCLUDE_KEYS.map((k) => (
            <label
              key={k}
              className="flex min-h-11 items-center justify-between gap-2 text-sm"
            >
              <span>{t(`lib2.inc.${k}`)}</span>
              <input
                type="checkbox"
                role="switch"
                data-testid={`inc-${k}`}
                checked={o.include[k]}
                onChange={() => toggle(k)}
                className="size-5 accent-[var(--color-accent)]"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mb-3">
        <legend className="mb-1 text-sm text-muted">
          {t('lib2.export.only')}
        </legend>
        <label className="flex min-h-11 items-center justify-between gap-2 text-sm">
          <span>{t('lib2.export.keyOnly')}</span>
          <input
            type="checkbox"
            role="switch"
            checked={o.keyOnly}
            onChange={() => setO({ ...o, keyOnly: !o.keyOnly })}
            className="size-5 accent-[var(--color-accent)]"
          />
        </label>
        <div
          role="group"
          aria-label={t('lib2.export.colours')}
          className="flex gap-2"
        >
          {HIGHLIGHT_COLOURS.map((c: HighlightColour) => {
            const on = o.colours.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                aria-label={c}
                onClick={() =>
                  setO({
                    ...o,
                    colours: on
                      ? o.colours.filter((x) => x !== c)
                      : [...o.colours, c],
                  })
                }
                className={`grid size-11 place-items-center rounded-full ${on ? 'outline-2 outline-accent' : ''}`}
              >
                <span
                  className="size-6 rounded-full"
                  style={{ background: COLOUR_FILL[c] }}
                />
              </button>
            )
          })}
        </div>
      </fieldset>
      <div
        role="radiogroup"
        aria-label={t('lib2.export.format')}
        className="mb-3 flex gap-2"
      >
        {(['md', 'csv'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={o.format === f}
            onClick={() => setO({ ...o, format: f })}
            className={`min-h-11 flex-1 rounded-lg border text-sm ${o.format === f ? 'border-accent bg-accent/10 font-medium' : 'border-line hover:bg-hover'}`}
          >
            {t(f === 'md' ? 'lib2.export.md' : 'lib2.export.csv')}
          </button>
        ))}
      </div>
      <p
        role="status"
        data-testid="export-count"
        className="mb-3 text-sm text-muted"
      >
        {plan.count === 0
          ? t('lib2.export.none')
          : t('lib2.export.count', { n: plan.count, m: plan.books })}
      </p>
      <button
        type="button"
        data-testid="export-run"
        disabled={plan.count === 0}
        onClick={run}
        className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {t('lib2.export.button')}
      </button>
    </section>
  )
}
