import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import {
  buildExport,
  canShareFile,
  printDocument,
  saveFile,
  shareFile,
  type ExportFormat,
  type ExportResult,
  type ExportTarget,
} from './exportService'

/** The page's picture with its ink (words + ink), asked for only when needed. */
type InkSource = () => Promise<{
  png: Uint8Array
  w: number
  h: number
} | null>

const FORMATS: { id: ExportFormat; label: string; desc: string }[] = [
  { id: 'pdf', label: 'export.pdf', desc: 'export.pdf.desc' },
  { id: 'docx', label: 'export.docx', desc: 'export.docx.desc' },
  { id: 'md', label: 'export.md', desc: 'export.md.desc' },
  { id: 'txt', label: 'export.txt', desc: 'export.txt.desc' },
]

/**
 * Export a page or a notebook (J1). Pick a format; the file is made on this
 * device, then you can Save it, Share it (the iPad share sheet) or, for PDF,
 * open the print window. Locked pages are left out and counted.
 */
export function ExportDialog({
  db,
  target,
  title,
  hasSubpages,
  getInk,
  onClose,
}: {
  db: LearningNotesDB
  target: ExportTarget
  title: string
  /** Offer "Include sub-pages" (pages only). */
  hasSubpages?: boolean
  getInk?: InkSource
  onClose: () => void
}) {
  const [subpages, setSubpages] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState(false)
  const [note, setNote] = useState('')
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => first.current?.focus(), [])

  const make = async (format: ExportFormat) => {
    setBusy(format)
    setError(false)
    try {
      const withInk =
        target.kind === 'page' &&
        getInk &&
        (format === 'pdf' || format === 'docx')
          ? await getInk()
          : null
      const built = await buildExport(
        db,
        target.kind === 'page'
          ? { ...target, subpages: hasSubpages && subpages, ink: withInk }
          : target,
        format,
        { lang: document.documentElement.lang || 'en' },
      )
      setResult(built)
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  const btn =
    'min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover'
  const share =
    result?.kind === 'file' && canShareFile(result.blob, result.fileName)

  return createPortal(
    <div
      data-chrome
      role="dialog"
      aria-modal="true"
      aria-label={t('export.title')}
      data-testid="export-dialog"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-3"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="mt-8 w-full max-w-md rounded-xl border border-line bg-bg p-4 shadow-xl">
        <h2 className="mb-1 text-base font-semibold">{t('export.title')}</h2>
        <p className="mb-3 truncate text-sm text-muted">{title}</p>
        {!result ? (
          <>
            {hasSubpages && target.kind === 'page' && (
              <label className="mb-2 flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={subpages}
                  onChange={(e) => setSubpages(e.target.checked)}
                />
                {t('export.subpages')}
              </label>
            )}
            <ul className="mb-3 flex flex-col gap-1">
              {FORMATS.map((f, i) => (
                <li key={f.id}>
                  <button
                    ref={i === 0 ? first : undefined}
                    type="button"
                    data-testid={`export-${f.id}`}
                    disabled={busy !== null}
                    onClick={() => void make(f.id)}
                    className="flex min-h-11 w-full flex-col items-start rounded-lg px-3 py-2 text-start hover:bg-hover disabled:opacity-50"
                  >
                    <span className="text-sm font-medium">
                      {busy === f.id
                        ? t('export.preparing')
                        : t(f.label as 'export.pdf')}
                    </span>
                    <span className="text-xs text-muted">
                      {t(f.desc as 'export.pdf.desc')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {target.kind === 'page' && getInk && (
              <p className="mb-2 text-xs text-muted">{t('export.inkNote')}</p>
            )}
            {error && (
              <p role="alert" className="mb-2 text-sm text-red-600">
                {t('export.failed')}
              </p>
            )}
          </>
        ) : (
          <div data-testid="export-ready">
            <p className="mb-1 text-sm">
              {t('export.ready', { name: result.fileName })}
            </p>
            {result.skipped > 0 && (
              <p className="mb-2 text-xs text-muted">
                {t('export.skipped', { count: result.skipped })}
              </p>
            )}
            {result.kind === 'print' && (
              <p className="mb-2 text-xs text-muted">{t('export.printHelp')}</p>
            )}
            {note && (
              <p role="status" className="mb-2 text-xs text-muted">
                {note}
              </p>
            )}
            <div className="mb-2 flex flex-wrap gap-2">
              {result.kind === 'file' ? (
                <>
                  <button
                    type="button"
                    data-testid="export-save"
                    className={`${btn} bg-accent text-white hover:opacity-90`}
                    onClick={() => {
                      saveFile(result.blob, result.fileName)
                      setNote(t('export.saved', { name: result.fileName }))
                    }}
                  >
                    {t('export.save')}
                  </button>
                  {share && (
                    <button
                      type="button"
                      data-testid="export-share"
                      className={btn}
                      onClick={() =>
                        void shareFile(result.blob, result.fileName)
                      }
                    >
                      {t('export.share')}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  data-testid="export-print"
                  className={`${btn} bg-accent text-white hover:opacity-90`}
                  onClick={() =>
                    void printDocument(result.html, title).catch(() =>
                      setError(true),
                    )
                  }
                >
                  {t('export.print')}
                </button>
              )}
              <button
                type="button"
                className={btn}
                onClick={() => setResult(null)}
              >
                {t('export.another')}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {t('export.failed')}
              </p>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <button type="button" className={btn} onClick={onClose}>
            {t('export.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
