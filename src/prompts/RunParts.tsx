import { useEffect, useState } from 'react'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { t } from '../i18n/t'
import {
  EMPTY_INPUT,
  clipInput,
  pdfOfPage,
  textOfPage,
  textOfPdf,
  type InputValue,
} from './inputSource'
import { costLine, type RunCost } from './promptRun'

type Mode = 'page' | 'book' | 'text' | 'pdf'

const field = 'min-h-11 rounded-lg border border-line bg-bg px-2 text-sm'

/**
 * Chooses the input of a run: the open page, the PDF of an open book, text
 * pasted here, or a PDF file. Reads the words (for a PDF, page by page) and
 * hands them up; nothing is sent from here.
 */
export function InputPicker({
  db,
  page,
  onChange,
}: {
  db: LearningNotesDB
  page?: Page
  onChange: (v: InputValue) => void
}) {
  const [mode, setMode] = useState<Mode>(page ? 'page' : 'text')
  const [pasted, setPasted] = useState('')
  const [hasBook, setHasBook] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!page) return
    let live = true
    runTask(
      pdfOfPage(db, page).then((d) => {
        if (live) setHasBook(!!d)
      }),
    )
    return () => {
      live = false
    }
  }, [db, page])

  useEffect(() => {
    if (mode === 'text')
      onChange({ ...clipInput(pasted), busy: false, label: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pasted])

  useEffect(() => {
    if (!page || (mode !== 'page' && mode !== 'book')) return
    let live = true
    onChange({ ...EMPTY_INPUT, busy: true })
    runTask(
      (async () => {
        const read =
          mode === 'page'
            ? await textOfPage(db, page)
            : await pdfOfPage(db, page).then((d) =>
                d ? textOfPdf(d) : { text: '', cut: false },
              )
        if (live) onChange({ ...read, busy: false, label: page.title })
      })(),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, db, page])

  const chooseFile = (file: File | undefined) => {
    if (!file) return
    setMessage('')
    onChange({ ...EMPTY_INPUT, busy: true })
    runTask(
      file
        .arrayBuffer()
        .then((d) => textOfPdf(d))
        .then((read) => {
          if (!read.text) setMessage(t('prompts.pdfEmpty'))
          onChange({ ...read, busy: false, label: file.name })
        })
        .catch(() => {
          setMessage(t('prompts.pdfFailed'))
          onChange(EMPTY_INPUT)
        }),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">{t('prompts.inputFrom')}</span>
        <select
          className={field}
          data-testid="input-mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as Mode)
            if (e.target.value === 'pdf') onChange(EMPTY_INPUT)
          }}
        >
          {page && <option value="page">{t('prompts.fromPage')}</option>}
          {hasBook && <option value="book">{t('prompts.fromBook')}</option>}
          <option value="text">{t('prompts.fromText')}</option>
          <option value="pdf">{t('prompts.fromPdf')}</option>
        </select>
      </label>
      {mode === 'text' && (
        <textarea
          data-testid="input-text"
          aria-label={t('prompts.fromText')}
          placeholder={t('prompts.pasteHere')}
          className={`${field} min-h-32 py-2`}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
      )}
      {mode === 'pdf' && (
        <input
          type="file"
          accept="application/pdf,.pdf"
          data-testid="input-pdf"
          aria-label={t('prompts.fromPdf')}
          className="text-sm"
          onChange={(e) => {
            chooseFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      )}
      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </div>
  )
}

/** The words an input holds: a short status line under the picker. */
export function InputStatus({ value }: { value: InputValue }) {
  if (value.busy) {
    return <p className="text-sm text-muted">{t('prompts.reading')}</p>
  }
  if (!value.text) return null
  return (
    <p className="text-sm text-muted" data-testid="input-status">
      {t('prompts.inputSize', { count: value.text.length })}
      {value.cut && ` ${t('prompts.inputCut')}`}
    </p>
  )
}

/** "About ₹0.42 · 3,000 tokens in, up to 2,000 out · Claude Haiku 5.5". */
export function CostLine({
  cost,
  extra,
}: {
  cost: RunCost
  /** Text before the cost (e.g. "Fact check"). */
  extra?: string
}) {
  return (
    <p
      className="rounded-lg bg-hover px-3 py-2 text-sm"
      data-testid="cost-line"
    >
      {extra && <strong>{extra}: </strong>}
      {costLine(cost)}
    </p>
  )
}

/** Five stars to rate a result (1-5). */
export function StarRating({
  value,
  label,
  onRate,
}: {
  value: number
  label: string
  onRate: (stars: number) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1"
      data-testid="star-rating"
    >
      <span className="mr-1 text-sm text-muted">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={t('prompts.starsN', { count: n })}
          aria-pressed={value === n}
          onClick={() => onRate(n)}
          className="grid size-11 place-items-center rounded-lg text-xl hover:bg-hover"
        >
          <span aria-hidden>{n <= value ? '★' : '☆'}</span>
        </button>
      ))}
    </div>
  )
}
