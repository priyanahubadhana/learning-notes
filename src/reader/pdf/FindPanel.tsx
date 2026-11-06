import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { MAX_HITS, searchPdf, type PdfHit } from './pdfSearch'

/**
 * Find in a PDF (C2b): type two or more letters; matches are listed with the
 * words around them and their page; tapping one jumps to its page. Works on
 * PDFs that have text (a scanned PDF says so).
 */
export function FindPanel({
  doc,
  noText,
  onJump,
}: {
  doc: PDFDocumentProxy | null
  noText: boolean
  onJump: (page: number) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PdfHit[]>([])
  const [searched, setSearched] = useState(0)
  const run = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  useEffect(() => {
    if (!doc) return
    const mine = ++run.current
    const id = window.setTimeout(() => {
      setSearched(0)
      void searchPdf(
        doc,
        query,
        () => run.current !== mine,
        (found, done) => {
          if (run.current !== mine) return
          setHits(found)
          setSearched(done)
        },
      )
    }, 250)
    return () => window.clearTimeout(id)
  }, [doc, query])

  const total = doc?.numPages ?? 0
  const searching = query.trim().length >= 2 && searched < total
  return (
    <div data-testid="pdf-find">
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('reader.find.placeholder')}
        aria-label={t('reader.find.placeholder')}
        data-testid="pdf-find-input"
        className="mb-2 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
      />
      {noText && (
        <p className="text-sm text-muted">{t('reader.find.noText')}</p>
      )}
      {query.trim().length >= 2 && !noText && (
        <p className="mb-2 text-xs text-muted" role="status">
          {searching
            ? t('reader.find.searching', { done: searched, total })
            : hits.length === 0
              ? t('reader.find.none')
              : t('reader.find.count', { count: hits.length })}
        </p>
      )}
      <ul>
        {hits.map((h, i) => (
          <li key={`${h.page}:${i}`}>
            <button
              type="button"
              data-testid="pdf-find-hit"
              onClick={() => onJump(h.page)}
              className="flex min-h-11 w-full items-start gap-2 rounded-lg px-2 py-1 text-start text-sm hover:bg-hover"
            >
              <span className="mt-0.5 shrink-0 text-xs text-muted">
                {t('reader.find.page', { page: h.page })}
              </span>
              <span className="min-w-0">
                {h.before}
                <mark className="rounded bg-yellow-200 px-0.5 text-black">
                  {h.match}
                </mark>
                {h.after}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hits.length >= MAX_HITS && (
        <p className="mt-2 text-xs text-muted">
          {t('reader.find.tooMany', { count: MAX_HITS })}
        </p>
      )}
    </div>
  )
}
