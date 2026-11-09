import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { plainText } from '../editor/mapping'
import { t } from '../i18n/t'
import { syncCardRecords } from '../recall/cardService'
import { acronymOf, chunkAcronym, listItems } from './acronym'
import { DIGIT_SOUNDS, getPicks, savePick, splitNumber } from './majorSystem'

/**
 * Memory helpers (E2): a Major system word finder and an acronym builder that
 * makes a recall card. Opened from the Templates list.
 */
export function MemoryHelpers({
  db,
  pageId,
  onClose,
}: {
  db: LearningNotesDB
  /** The page that gets the acronym card (null = none open). */
  pageId: string | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [number, setNumber] = useState('')
  const [own, setOwn] = useState<Record<string, string>>({})
  const [list, setList] = useState('')
  const [made, setMade] = useState(false)
  const picks = useLiveQuery(() => getPicks(db), [db]) ?? {}

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const pieces = splitNumber(number, picks)
  const items = listItems(list)
  const acronym = acronymOf(items)

  const makeCard = async () => {
    if (!pageId || items.length < 2) return
    const block = await createBlock(db, {
      pageId,
      type: 'card',
      content: {
        text: plainText(t('memory.acronym.question', { acronym })),
      },
    })
    for (const item of items) {
      await createBlock(db, {
        pageId,
        type: 'bulletListItem',
        content: { text: plainText(item) },
        parentId: block.id,
      })
    }
    await syncCardRecords(db, pageId)
    setMade(true)
  }

  return (
    <dialog
      ref={ref}
      aria-label={t('memory.title')}
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto flex max-h-[min(44rem,calc(100dvh-2rem))] w-[min(32rem,calc(100vw-2rem))] flex-col rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 className="mb-2 text-[15px] font-semibold">{t('memory.title')}</h2>
      <div className="min-h-0 flex-1 space-y-5 overflow-auto">
        <section aria-label={t('memory.major.title')} data-major-helper>
          <h3 className="mb-1 text-sm font-semibold">
            {t('memory.major.title')}
          </h3>
          <p className="mb-2 text-xs text-muted">{t('memory.major.hint')}</p>
          <p className="mb-2 text-xs text-muted">
            {DIGIT_SOUNDS.map((s, d) => `${d} ${s}`).join(' · ')}
          </p>
          <input
            value={number}
            inputMode="numeric"
            maxLength={30}
            aria-label={t('memory.major.number')}
            placeholder={t('memory.major.number')}
            onChange={(e) => setNumber(e.target.value.replace(/[^\d ]/g, ''))}
            className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
          />
          <ul className="mt-2 grid gap-2">
            {pieces.map((p, i) => (
              <li key={`${i}-${p.digits}`} data-major-piece={p.digits}>
                <div className="mb-1 text-sm font-medium">{p.digits}</div>
                <div className="flex flex-wrap items-center gap-1">
                  {p.words.length === 0 && (
                    <span className="text-xs text-muted">
                      {t('memory.major.none')}
                    </span>
                  )}
                  {p.words.map((w) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={picks[p.digits]?.[0] === w}
                      title={t('memory.major.keep')}
                      onClick={() => savePick(db, p.digits, w)}
                      className={`min-h-11 rounded-lg border px-3 text-sm ${
                        picks[p.digits]?.[0] === w
                          ? 'border-accent bg-hover font-semibold text-accent'
                          : 'border-line hover:bg-hover'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                  <input
                    value={own[p.digits] ?? ''}
                    maxLength={40}
                    aria-label={t('memory.major.own', { digits: p.digits })}
                    placeholder={t('memory.major.ownPlaceholder')}
                    onChange={(e) =>
                      setOwn({ ...own, [p.digits]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void savePick(db, p.digits, own[p.digits] ?? '')
                        setOwn({ ...own, [p.digits]: '' })
                      }
                    }}
                    className="min-h-11 w-32 rounded-lg border border-line bg-bg px-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={t('memory.acronym.title')} data-acronym-helper>
          <h3 className="mb-1 text-sm font-semibold">
            {t('memory.acronym.title')}
          </h3>
          <p className="mb-2 text-xs text-muted">{t('memory.acronym.hint')}</p>
          <textarea
            value={list}
            rows={4}
            aria-label={t('memory.acronym.list')}
            onChange={(e) => {
              setList(e.target.value)
              setMade(false)
            }}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {items.length > 1 && (
            <p data-acronym aria-live="polite" className="mt-2 text-sm">
              <span className="text-lg font-semibold tracking-wider">
                {chunkAcronym(acronym).join(' ')}
              </span>
            </p>
          )}
          <button
            type="button"
            disabled={!pageId || items.length < 2 || made}
            onClick={() => void makeCard()}
            className="mt-2 min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50"
          >
            {made ? t('memory.acronym.made') : t('memory.acronym.make')}
          </button>
          {!pageId && (
            <p className="mt-1 text-xs text-muted">
              {t('memory.acronym.needPage')}
            </p>
          )}
        </section>
      </div>
      <div className="mt-3 flex justify-end text-sm">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink"
        >
          {t('databases.close')}
        </button>
      </div>
    </dialog>
  )
}
