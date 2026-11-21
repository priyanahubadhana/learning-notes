import { useState } from 'react'
import { IconButton } from '../../app/ui'
import { RowMenu } from '../../app/RowStrip'
import { rowHoldMs, type RowPoint } from '../../app/rowStripLogic'
import { useLongPress } from '../../app/useLongPress'
import type { Page } from '../../core/types'
import { t } from '../../i18n/t'
import { imageRef } from '../../images/imageRef'
import { useImageUrl } from '../../images/useImageUrl'
import { progressPercent } from '../libraryService'
import type { LibraryPrefs } from './libraryPrefs'
import { statusOf } from './shelves'
import { bookMenuItems, startLabel, type BookActions } from './bookMenu'

/** Cover, title, a thin progress line and the main button (LB-B19). */
export function BookCard({
  page,
  prefs,
  actions,
  selecting,
  selected,
  onToggle,
}: {
  page: Page
  prefs: LibraryPrefs
  actions: BookActions
  selecting?: boolean
  selected?: boolean
  onToggle?: () => void
}) {
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null)
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  // Flag page.menus: a long-press opens the strip at the press point (PM-23).
  const [menuPt, setMenuPt] = useState<RowPoint | null>(null)
  const hold = useLongPress(
    (x, y) => {
      const card = document.elementFromPoint(x, y)?.closest('article')
      if (card) {
        setOpener(card as HTMLElement)
        setMenuPt({ x, y })
        setMenuAt(card.getBoundingClientRect())
      }
    },
    true,
    rowHoldMs,
  )
  const source = page.source
  const cover = useImageUrl(
    source?.coverImageId ? imageRef(source.coverImageId) : null,
  )
  const percent = progressPercent(source)
  const status = statusOf(page, prefs.manual)
  const title = page.title || t('review.untitled')
  const showBar = prefs.showProgress && percent > 0 && percent < 100
  return (
    <article
      data-chrome
      data-testid="source-card"
      data-selected={selected ? '' : undefined}
      {...hold}
      className={`relative flex h-full flex-col ${selected ? 'rounded-xl outline-2 outline-offset-2 outline-accent' : ''}`}
    >
      <button
        type="button"
        onClick={() => (selecting ? onToggle?.() : actions.open(page))}
        aria-label={selecting ? title : t('lib2.coverOpen', { title })}
        aria-pressed={selecting ? !!selected : undefined}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-soft shadow-sm transition-transform hover:-translate-y-0.5"
      >
        {cover ? (
          <img
            src={cover}
            alt={t('library.cover', { title })}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 p-3 text-center text-sm text-muted">
            <span className="line-clamp-4 font-semibold text-ink-soft">
              {title}
            </span>
            <span className="text-xs">
              {t(`library.kind.${source?.kind ?? 'file'}`)}
            </span>
          </span>
        )}
        {status === 'finished' && (
          <span
            aria-label={t('lib2.finished')}
            className="absolute bottom-2 left-2 grid size-6 place-items-center rounded-full bg-accent text-xs text-white"
          >
            ✓
          </span>
        )}
      </button>
      <IconButton
        tip="library.cardMenu"
        bare
        tipClassName="absolute top-1.5 right-1.5 inline-flex"
        data-testid="source-menu-button"
        aria-label={t('library.cardMenu')}
        aria-haspopup="menu"
        onClick={(e) => {
          setOpener(e.currentTarget)
          setMenuPt(null)
          setMenuAt(e.currentTarget.getBoundingClientRect())
        }}
        className="grid size-11 place-items-center rounded-full bg-bg/80 text-ink-soft hover:bg-hover"
      >
        ⋯
      </IconButton>
      {menuAt && (
        <RowMenu
          anchor={menuAt}
          at={menuPt}
          onClose={() => setMenuAt(null)}
          items={bookMenuItems(page, prefs, actions, opener)}
        />
      )}
      <div className="flex flex-1 flex-col gap-1 pt-2.5">
        <h2 className="line-clamp-2 text-[13.5px] leading-snug font-semibold">
          {title}
        </h2>
        {prefs.showAuthor && source?.author && (
          <p className="line-clamp-1 text-xs text-muted">{source.author}</p>
        )}
        {showBar && (
          <div
            role="progressbar"
            aria-label={t('library.progressLabel', { percent })}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 overflow-hidden rounded-full bg-soft"
          >
            <div
              className="h-full bg-accent"
              style={{ inlineSize: `${percent}%` }}
            />
          </div>
        )}
        <button
          type="button"
          data-testid="source-start"
          onClick={() => actions.start(page)}
          className="mt-1 min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {startLabel(page, prefs)}
        </button>
      </div>
    </article>
  )
}

/** One big "Continue reading" card: cover, title, thin progress, % read, button. */
export function ContinueCard({
  page,
  actions,
}: {
  page: Page
  actions: BookActions
}) {
  const source = page.source
  const cover = useImageUrl(
    source?.coverImageId ? imageRef(source.coverImageId) : null,
  )
  const percent = progressPercent(source)
  const title = page.title || t('review.untitled')
  return (
    <article
      data-testid="continue-card"
      className="flex gap-3.5 rounded-[20px] border border-line bg-bg p-3 transition-transform hover:-translate-y-px"
    >
      <button
        type="button"
        onClick={() => actions.open(page)}
        aria-label={t('lib2.coverOpen', { title })}
        className="block aspect-[3/4] w-[66px] shrink-0 overflow-hidden rounded-[9px] bg-soft"
      >
        {cover ? (
          <img
            src={cover}
            alt={t('library.cover', { title })}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center p-1 text-center text-[10px] text-muted">
            {title}
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-[14.5px] leading-snug font-semibold">
          {title}
        </h3>
        {source?.author && (
          <p className="line-clamp-1 text-[12.5px] text-muted">
            {source.author}
          </p>
        )}
        <div
          role="progressbar"
          aria-label={t('library.progressLabel', { percent })}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-1 h-1 overflow-hidden rounded-full bg-soft"
        >
          <div
            className="h-full bg-accent"
            style={{ inlineSize: `${percent}%` }}
          />
        </div>
        <span className="text-[11.5px] text-muted">
          {t('library.progress', { percent })}
        </span>
        <button
          type="button"
          data-testid="book-continue-card"
          onClick={() => actions.start(page)}
          className="mt-auto min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('library.continue')}
        </button>
      </div>
    </article>
  )
}
