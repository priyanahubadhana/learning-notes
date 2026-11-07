import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useRef, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { NoteLinkProps } from '../editor/mapping'
import { t } from '../i18n/t'
import { readRecentPages } from '../search/recentPages'
import {
  findLinkPages,
  linkAnchors,
  linkLabel,
  type LinkPageOption,
  pagesByIds,
} from './linkService'

/** Width of the picker, and its gap from the screen edge. */
const WIDTH = 320
const EDGE = 12

/**
 * The link picker ("[[" or "/ Link to page"): find a page by its title,
 * pick it, or press → (or tap ›) to pick a heading or card on it. Keys:
 * ↑ ↓ Enter, → / ← between pages and headings, Esc closes. Full width on
 * phones.
 */
export function LinkPicker({
  db,
  at,
  onPick,
  onClose,
}: {
  db: LearningNotesDB
  /** Where the cursor is, to open just below it. */
  at: DOMRect | undefined
  onPick: (link: NoteLinkProps) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState(0)
  /** Set while picking a heading/card on this page. */
  const [page, setPage] = useState<LinkPageOption | null>(null)
  const listId = useId()

  const notebooks = useLiveQuery(
    async () => new Map((await db.notebooks.toArray()).map((n) => [n.id, n])),
    [db],
  )
  const pages = useLiveQuery(
    async () =>
      text.trim()
        ? findLinkPages(db, text)
        : pagesByIds(db, readRecentPages().slice(0, 8)),
    [db, text],
  )
  const anchors = useLiveQuery(
    async () => (page ? linkAnchors(db, page.pageId) : []),
    [db, page],
  )
  const query = text.trim().toLocaleLowerCase()
  const anchorRows = (anchors ?? []).filter(
    (a) => !query || a.text.toLocaleLowerCase().includes(query),
  )
  // Rows on the heading step: "Whole page" first.
  const rows = page ? anchorRows.length + 1 : (pages?.length ?? 0)

  // Close on a click outside.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [onClose])

  useEffect(() => {
    document
      .getElementById(`${listId}-${selected}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, listId])

  const pickPage = (option: LinkPageOption) =>
    onPick({
      pageId: option.pageId,
      blockId: '',
      label: option.title || t('review.untitled'),
    })
  const openAnchors = (option: LinkPageOption) => {
    setPage(option)
    setText('')
    setSelected(0)
    inputRef.current?.focus()
  }
  const backToPages = () => {
    setPage(null)
    setText('')
    setSelected(0)
    inputRef.current?.focus()
  }
  const pickRow = (i: number) => {
    if (!page) {
      if (pages?.[i]) pickPage(pages[i])
      return
    }
    if (i === 0) return pickPage(page)
    const anchor = anchorRows[i - 1]
    if (anchor) {
      onPick({
        pageId: page.pageId,
        blockId: anchor.blockId,
        label: linkLabel(page.title || t('review.untitled'), anchor.text),
      })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const atEnd = e.currentTarget.selectionStart === text.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(rows - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(0, s - 1))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      pickRow(selected)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowRight' && !page && atEnd && pages?.[selected]) {
      e.preventDefault()
      openAnchors(pages[selected])
    } else if (e.key === 'ArrowLeft' && page && text === '') {
      e.preventDefault()
      backToPages()
    }
  }

  // Just below the cursor, kept on screen.
  const style: React.CSSProperties = {
    top: Math.min((at?.bottom ?? 120) + 6, window.innerHeight - 340),
    left: Math.max(
      EDGE,
      Math.min(at?.left ?? 40, window.innerWidth - WIDTH - EDGE),
    ),
  }
  const optionId = (i: number) => `${listId}-${i}`
  const rowClass = (i: number) =>
    `flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-start text-sm hover:bg-hover ${
      selected === i
        ? 'bg-hover shadow-[inset_2px_0_0_var(--color-accent)]'
        : ''
    }`

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('links.picker')}
      style={style}
      className="fixed z-50 w-[320px] rounded-[10px] border border-line bg-bg p-1.5 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.16)] phone:!inset-x-3 phone:w-auto"
    >
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSelected(0)
        }}
        onKeyDown={onKeyDown}
        placeholder={page ? t('links.findHeading') : t('links.findPage')}
        aria-label={page ? t('links.findHeading') : t('links.findPage')}
        role="combobox"
        aria-expanded={rows > 0}
        aria-controls={listId}
        aria-activedescendant={rows > 0 ? optionId(selected) : undefined}
        autoComplete="off"
        className="mb-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
      />
      <div className="flex min-h-7 items-center gap-1 px-2 text-[11px] tracking-[0.06em] text-muted uppercase">
        {page ? (
          <>
            <button
              type="button"
              onClick={backToPages}
              className="min-h-7 rounded px-1 tracking-normal text-accent normal-case hover:bg-hover"
            >
              ‹ {t('links.pages')}
            </button>
            <span className="truncate tracking-normal normal-case">
              · {page.title || t('review.untitled')}
            </span>
          </>
        ) : (
          <span>
            {text.trim() ? t('links.pages') : t('search.recent')}
            <span className="tracking-normal normal-case phone:hidden">
              {' '}
              · {t('links.headingHint')}
            </span>
          </span>
        )}
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label={page ? t('links.headings') : t('links.pages')}
        className="max-h-[260px] overflow-y-auto"
      >
        {page ? (
          <>
            <button
              id={optionId(0)}
              type="button"
              role="option"
              aria-selected={selected === 0}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickRow(0)}
              className={rowClass(0)}
            >
              {t('links.wholePage')}
            </button>
            {anchorRows.map((a, i) => (
              <button
                key={a.blockId}
                id={optionId(i + 1)}
                type="button"
                role="option"
                aria-selected={selected === i + 1}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickRow(i + 1)}
                className={rowClass(i + 1)}
              >
                <span aria-hidden className="w-4 shrink-0 text-muted">
                  {a.kind === 'card' ? '◫' : '#'}
                </span>
                <span className="truncate">{a.text}</span>
              </button>
            ))}
          </>
        ) : pages && pages.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">
            {text.trim()
              ? t('links.noPage', { query: text.trim() })
              : t('links.typeToFind')}
          </p>
        ) : (
          pages?.map((p, i) => (
            <div key={p.pageId} className="flex items-center">
              <button
                id={optionId(i)}
                type="button"
                role="option"
                aria-selected={selected === i}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickPage(p)}
                className={rowClass(i)}
              >
                <span className="truncate">
                  {p.title || t('review.untitled')}
                </span>
                <span className="shrink-0 truncate text-xs text-muted">
                  · {notebooks?.get(p.notebookId)?.title ?? ''}
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openAnchors(p)}
                aria-label={t('links.toHeading', {
                  page: p.title || t('review.untitled'),
                })}
                className="min-h-10 min-w-10 shrink-0 rounded-md text-muted hover:bg-hover hover:text-ink"
              >
                ›
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
