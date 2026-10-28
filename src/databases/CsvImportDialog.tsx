import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { runTask } from '../app/errors'
import { ConfirmDialog } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { DbColumn } from '../core/types'
import { t, type MessageKey } from '../i18n/t'
import { FileButton } from '../share/FileButton'
import { MAX_CSV_CHARS, parseCsv, unprotectCell } from './csv'
import {
  guessMapping,
  IMPORTABLE_TYPES,
  importCsvAsNewDatabase,
  importCsvRows,
  type ColumnMapping,
  type ImportMode,
  type ImportResult,
} from './csvTransfer'
import { listRows } from './databaseService'

/** What the dialog did: a new database, or one of the modes on this one. */
export type CsvOutcome = ImportResult & {
  mode: 'new' | ImportMode
  /** `new`: the database that was made. */
  databaseId?: string
}

const MODES = ['new', 'add', 'replace', 'update'] as const

/** Most rows shown in the preview. */
const PREVIEW_ROWS = 3

/**
 * "Import CSV": pick a file, say what each CSV column becomes (the title,
 * an existing column, a new column of a type, or nothing), then add the
 * rows. It asks what to do with the rows already there: make a new
 * database (the default, nothing here changes), add rows, replace them (the
 * old ones go to Trash) or update the ones with the same title.
 */
export function CsvImportDialog({
  db,
  databaseId,
  titleName,
  columns,
  onDone,
  onClose,
}: {
  db: LearningNotesDB
  databaseId: string
  titleName: string
  columns: readonly DbColumn[]
  onDone: (outcome: CsvOutcome) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [csv, setCsv] = useState<{
    headers: string[]
    body: string[][]
    truncated: boolean
  } | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<(typeof MODES)[number]>('new')
  const [confirming, setConfirming] = useState(false)
  const rowCount = useLiveQuery(
    async () => (await listRows(db, databaseId)).length,
    [db, databaseId],
  )
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const fillable = useMemo(
    () =>
      columns.filter((c) =>
        (IMPORTABLE_TYPES as readonly string[]).includes(c.type),
      ),
    [columns],
  )

  async function read(file: File) {
    setError('')
    if (file.size > MAX_CSV_CHARS) {
      setError(t('csv.tooBig'))
      return
    }
    const { rows, truncated } = parseCsv(await file.text())
    if (rows.length < 2) {
      setError(t('csv.empty'))
      return
    }
    const [headers, ...body] = rows
    setCsv({ headers, body, truncated })
    setMapping(guessMapping(headers, fillable, titleName, body))
  }

  const value = (m: ColumnMapping): string =>
    m.kind === 'column'
      ? `column:${m.columnId}`
      : m.kind === 'new'
        ? `new:${m.type}`
        : m.kind
  const parse = (v: string): ColumnMapping =>
    v === 'title'
      ? { kind: 'title' }
      : v === 'skip'
        ? { kind: 'skip' }
        : v.startsWith('column:')
          ? { kind: 'column', columnId: v.slice(7) }
          : { kind: 'new', type: v.slice(4) }
  const hasTitle = mapping.some((m) => m.kind === 'title')
  const go = () => {
    if (!csv) return
    setBusy(true)
    runTask(
      (mode === 'new'
        ? importCsvAsNewDatabase(db, databaseId, csv.headers, csv.body, mapping)
        : importCsvRows(db, databaseId, csv.headers, csv.body, mapping, mode)
      )
        .then((result) => onDone({ ...result, mode }))
        .finally(() => setBusy(false)),
    )
  }
  const field =
    'min-h-9 w-full rounded-lg border border-line bg-bg px-2 text-[13px]'

  return (
    <dialog
      ref={ref}
      aria-label={t('csv.title')}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <h2 className="mb-1 text-[15px] font-semibold">{t('csv.title')}</h2>
      <p className="mb-3 text-sm text-muted">{t('csv.intro')}</p>
      <FileButton
        label={t('csv.file')}
        accept=".csv,text/csv,text/plain"
        onFile={(file) => runTask(read(file))}
        className="mb-3"
      />
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      {csv && (
        <>
          <p className="mb-2 text-sm">
            {t('csv.rows', { count: csv.body.length })}
            {csv.truncated && ` ${t('csv.truncated')}`}
          </p>
          <div className="mb-3 max-h-64 overflow-auto rounded-lg border border-line">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-start text-xs text-muted">
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t('csv.column')}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t('csv.example')}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t('csv.becomes')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {csv.headers.map((header, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="px-2 py-1.5 font-medium">
                      {unprotectCell(header) || `#${i + 1}`}
                    </td>
                    <td className="max-w-40 px-2 py-1.5 text-muted">
                      {csv.body
                        .slice(0, PREVIEW_ROWS)
                        .map((r) => unprotectCell(r[i] ?? ''))
                        .join(' · ')}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        aria-label={t('csv.becomesOf', {
                          name: unprotectCell(header) || `#${i + 1}`,
                        })}
                        value={value(mapping[i] ?? { kind: 'skip' })}
                        onChange={(e) =>
                          setMapping(
                            mapping.map((m, j) =>
                              j === i ? parse(e.target.value) : m,
                            ),
                          )
                        }
                        className={field}
                      >
                        <option value="title">
                          {t('csv.map.title', { name: titleName })}
                        </option>
                        {fillable.map((c) => (
                          <option key={c.id} value={`column:${c.id}`}>
                            {t('csv.map.column', { name: c.name })}
                          </option>
                        ))}
                        {IMPORTABLE_TYPES.map((type) => (
                          <option key={type} value={`new:${type}`}>
                            {t('csv.map.new', {
                              type: t(`column.type.${type}` as MessageKey),
                            })}
                          </option>
                        ))}
                        <option value="skip">{t('csv.map.skip')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <fieldset className="mb-3">
            <legend className="mb-1 text-sm font-medium">
              {t('csv.mode.title')}
            </legend>
            {MODES.map((m) => (
              <label
                key={m}
                className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-hover"
              >
                <input
                  type="radio"
                  name="csv-mode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="mt-1"
                />
                <span className="text-sm">
                  {t(`csv.mode.${m}` as MessageKey)}
                  <span className="block text-xs text-muted">
                    {t(`csv.mode.${m}.hint` as MessageKey)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {!hasTitle && (
            <p className="mb-2 text-xs text-muted">{t('csv.noTitle')}</p>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink"
        >
          {t('dialog.cancel')}
        </button>
        <button
          type="button"
          disabled={!csv || busy}
          onClick={() => {
            if (mode === 'replace' && (rowCount ?? 0) > 0) setConfirming(true)
            else go()
          }}
          className="min-h-9 rounded-lg bg-accent px-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {csv
            ? t('csv.import', { count: csv.body.length })
            : t('csv.importNone')}
        </button>
      </div>
      {confirming && csv && (
        <ConfirmDialog
          message={t('csv.replace.confirm', {
            count: rowCount ?? 0,
            incoming: csv.body.length,
          })}
          confirmLabel={t('csv.replace.button')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            go()
          }}
        />
      )}
    </dialog>
  )
}
