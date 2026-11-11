import { useEffect, useMemo, useRef, useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import {
  DEFAULT_FILTERS,
  describeHits,
  runSearch,
  type SearchHit,
} from '../../search/searchQuery'
import { runTask } from '../errors'
import { Icon } from '../tools/icons'
import { FIND_SCOPES, findRanges, type FindScope } from './findInPage'
import { glideTo, landOn, prefersReducedMotion, targetTopFor } from './glide'
import { nextPageInNotebook } from './nextPage'
import { Shell } from './ReadingPanels'
import type { ReadingPosition } from './useReadingPosition'
import { readDeviceSetting } from '../../settings/settingsService'
import { readingGlideSetting } from '../../settings/readingSettings'

/**
 * Find in the reader (B3). A scope row comes first and is open by default:
 * This page (every match marked in the text, "3 of 12" with ↑ ↓, the last
 * match goes on to the next page of the notebook), This notebook, or
 * Everywhere (a result list; tapping a result jumps there with the glow).
 * Page matches use the CSS Custom Highlight API (Safari 17.2+); without it
 * the matches are still counted and stepped, just not painted.
 */

type Highlights = {
  set: (name: string, value: unknown) => void
  delete: (name: string) => void
}
const highlights = (): Highlights | null =>
  (typeof CSS !== 'undefined' &&
    (CSS as unknown as { highlights?: Highlights }).highlights) ||
  null

function paint(ranges: Range[], current: number) {
  const h = highlights()
  const Ctor = (globalThis as { Highlight?: new (...r: Range[]) => unknown })
    .Highlight
  if (!h || !Ctor) return
  if (ranges.length === 0) {
    h.delete('reading-find')
    h.delete('reading-find-current')
    return
  }
  h.set('reading-find', new Ctor(...ranges))
  h.set('reading-find-current', new Ctor(ranges[current]))
}

export function ReaderFind({
  db,
  pageId,
  inner,
  scroller,
  position,
  onOpenPage,
  onClose,
}: {
  db: LearningNotesDB
  pageId: string
  inner: HTMLElement | null
  scroller: HTMLElement | null
  position: ReadingPosition
  onOpenPage: (pageId: string, blockId?: string) => void
  onClose: () => void
}) {
  const [scope, setScope] = useState<FindScope>('page')
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<
    { hit: SearchHit; title: string; snippet: string }[]
  >([])
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus({ preventScroll: true }), [])

  const ranges = useMemo(
    () => (scope === 'page' && inner ? findRanges(inner, text) : []),
    [scope, inner, text],
  )
  const current = ranges.length ? Math.min(index, ranges.length - 1) : 0

  // Paint the matches; clear them when the panel goes.
  useEffect(() => {
    paint(ranges, current)
  }, [ranges, current])
  useEffect(
    () => () => {
      highlights()?.delete('reading-find')
      highlights()?.delete('reading-find-current')
    },
    [],
  )

  const show = (i: number) => {
    const r = ranges[i]
    if (!r) return
    const block = r.startContainer.parentElement?.closest<HTMLElement>(
      '.bn-block-outer[data-id]',
    )
    if (!block) return
    if (scroller) {
      glideTo(
        scroller,
        targetTopFor(scroller, block),
        readDeviceSetting(readingGlideSetting),
        {
          instant: prefersReducedMotion(),
        },
      )
      landOn(block)
    } else if (block.dataset.id) {
      position.goToBlock(block.dataset.id)
    }
  }
  const step = (delta: 1 | -1) => {
    if (ranges.length === 0) return
    const next = current + delta
    if (next >= ranges.length) {
      // The last match goes on to the next page of the notebook.
      runTask(
        nextPageInNotebook(db, pageId).then((page) => {
          if (page) {
            onOpenPage(page.id)
          } else {
            setIndex(0)
            show(0)
          }
        }),
      )
      return
    }
    const i = (next + ranges.length) % ranges.length
    setIndex(i)
    show(i)
  }

  // Wider scopes: a result list.
  useEffect(() => {
    if (scope === 'page' || !text.trim()) return
    let cancelled = false
    const timer = setTimeout(() => {
      runTask(
        (async () => {
          const page = await db.pages.get(pageId)
          const outcome = await runSearch(db, {
            text,
            type: 'all',
            filters: {
              ...DEFAULT_FILTERS,
              notebookId:
                scope === 'notebook' ? (page?.notebookId ?? null) : null,
            },
          })
          const hits = outcome.hits.slice(0, 30)
          const details = await describeHits(db, hits)
          if (cancelled) return
          setResults(
            hits.map((hit) => ({
              hit,
              title: details.get(hit.id)?.pageTitle || t('review.untitled'),
              snippet: details.get(hit.id)?.text ?? '',
            })),
          )
        })(),
      )
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [scope, text, db, pageId])

  const shownResults = text.trim() ? results : []
  const scopeLabel = (s: FindScope) => t(`reading.find.scope.${s}`)

  return (
    <Shell name="find" title={t('reading.ctl.find')} onClose={onClose}>
      <div
        role="radiogroup"
        aria-label={t('reading.find.scope')}
        className="mb-2 flex gap-1"
      >
        {FIND_SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={scope === s}
            onClick={() => {
              setScope(s)
              setIndex(0)
            }}
            className={`min-h-11 flex-1 rounded-lg border px-2 text-sm ${
              scope === s
                ? 'border-accent bg-hover font-semibold text-accent'
                : 'border-line hover:bg-hover'
            }`}
          >
            {scopeLabel(s)}
          </button>
        ))}
      </div>
      <input
        ref={input}
        type="search"
        value={text}
        aria-label={t('reading.find.input')}
        placeholder={t('reading.find.input')}
        onChange={(e) => {
          setText(e.target.value)
          setIndex(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            step(e.shiftKey ? -1 : 1)
          }
        }}
        className="mb-2 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
      />
      {scope === 'page' ? (
        <div className="flex items-center gap-1">
          <span
            data-testid="find-count"
            role="status"
            className="me-auto text-sm text-muted"
          >
            {text.trim()
              ? ranges.length
                ? t('reading.find.count', {
                    n: current + 1,
                    total: ranges.length,
                  })
                : t('reading.find.none')
              : ''}
          </span>
          <button
            type="button"
            aria-label={t('reading.find.previous')}
            disabled={ranges.length === 0}
            onClick={() => step(-1)}
            className="grid size-11 place-items-center rounded-lg border border-line hover:bg-hover disabled:opacity-40"
          >
            <Icon name="chevronUp" />
          </button>
          <button
            type="button"
            aria-label={t('reading.find.next')}
            disabled={ranges.length === 0}
            onClick={() => step(1)}
            className="grid size-11 place-items-center rounded-lg border border-line hover:bg-hover disabled:opacity-40"
          >
            <Icon name="chevronDown" />
          </button>
        </div>
      ) : (
        <ul aria-label={t('reading.find.results')} className="grid gap-0.5">
          {shownResults.map(({ hit, title, snippet }) => (
            <li key={hit.id}>
              <button
                type="button"
                data-find-result={hit.pageId}
                onClick={() => {
                  onOpenPage(hit.pageId, hit.blockId)
                  onClose()
                }}
                className="min-h-11 w-full rounded-lg px-2 text-start text-sm hover:bg-hover"
              >
                <span className="block font-medium">{title}</span>
                {snippet && (
                  <span className="line-clamp-2 block text-xs text-muted">
                    {snippet}
                  </span>
                )}
              </button>
            </li>
          ))}
          {text.trim() && shownResults.length === 0 && (
            <li className="px-2 text-sm text-muted">
              {t('reading.find.none')}
            </li>
          )}
        </ul>
      )}
    </Shell>
  )
}
