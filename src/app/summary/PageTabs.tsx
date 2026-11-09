import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { MenuPopover } from '../ui'
import { EXTRA_TAB_LABEL, type ExtraTab } from '../../notebooks/pageTabs'
import type { LearningNotesDB } from '../../core/db'
import type { ReviewScope } from '../../recall/reviewService'
import { scopeCounts } from '../../recall/reviewLazy'
import { t } from '../../i18n/t'

/** The three views of a page (Phase M): its notes, its Summary, its cards. */
export type BaseTab = 'notes' | 'summary' | 'review'
export type PageTab = BaseTab | ExtraTab

const TABS: {
  id: PageTab
  label: 'summary.seg.notes' | 'summary.seg.summary' | 'summary.seg.review'
}[] = [
  { id: 'notes', label: 'summary.seg.notes' },
  { id: 'summary', label: 'summary.seg.summary' },
  { id: 'review', label: 'summary.seg.review' },
]

/** Notes · Summary · Review, under the page title. Buttons are 44 px tall. */
export function Segments<T extends PageTab = PageTab>({
  tab,
  onTab,
  className = '',
  extras = [],
  onToggleExtra,
  allExtras = [],
}: {
  tab: T
  onTab: (tab: T) => void
  className?: string
  /** The optional tabs this notebook has switched on, in order. */
  extras?: readonly ExtraTab[]
  /** Switches an optional tab on or off for the notebook (the ⋯ menu). */
  onToggleExtra?: (tab: ExtraTab, on: boolean) => void
  /** Every optional tab (for the ⋯ menu). */
  allExtras?: readonly ExtraTab[]
}) {
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const shown = [
    ...TABS,
    ...extras.map((id) => ({ id, label: EXTRA_TAB_LABEL[id] })),
  ]
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <div
        role="group"
        aria-label={t('summary.seg.label')}
        data-page-tabs
        className="inline-flex max-w-full flex-nowrap overflow-x-auto rounded-xl border border-line bg-soft p-0.5 [scrollbar-width:none]"
      >
        {shown.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            data-page-tab={id}
            onClick={() => onTab(id as T)}
            className="min-h-9 any-pointer-coarse:min-h-11 shrink-0 whitespace-nowrap rounded-[10px] px-4 text-sm text-ink-soft hover:text-ink aria-pressed:bg-bg aria-pressed:font-semibold aria-pressed:text-ink aria-pressed:shadow-sm"
          >
            {t(label)}
          </button>
        ))}
      </div>
      {onToggleExtra && (
        <button
          type="button"
          aria-label={t('tabs.menu')}
          aria-haspopup="menu"
          data-page-tabs-menu
          onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}
          className="min-h-9 min-w-9 any-pointer-coarse:min-h-11 any-pointer-coarse:min-w-11 rounded-lg text-lg text-ink-soft hover:bg-hover hover:text-ink"
        >
          ⋯
        </button>
      )}
      {menu && onToggleExtra && (
        <MenuPopover
          anchor={menu}
          label={t('tabs.menuLabel')}
          onClose={() => setMenu(null)}
          items={allExtras.map((id) => ({
            label: t(EXTRA_TAB_LABEL[id]),
            icon: '',
            checked: extras.includes(id),
            onSelect: () => onToggleExtra(id, !extras.includes(id)),
          }))}
        />
      )}
    </div>
  )
}

/** A page's Review view: what is due and a Practise button. */
export function PageReview({
  db,
  pageId,
  onReview,
}: {
  db: LearningNotesDB
  pageId: string
  onReview: (scope: ReviewScope) => void
}) {
  const scope: ReviewScope = { kind: 'page', pageId, includeSubpages: true }
  const counts = useLiveQuery(() => scopeCounts(db, scope), [db, pageId])
  if (!counts) return null
  const due = counts.due + counts.learning
  return (
    <section aria-label={t('summary.seg.review')} className="grid gap-3">
      <p className="text-[15px]" data-review-counts>
        {t('summary.review.counts', { due, new: counts.new })}
      </p>
      {due + counts.new === 0 && (
        <p className="text-sm text-muted">{t('summary.review.none')}</p>
      )}
      <div>
        <button
          type="button"
          onClick={() => onReview(scope)}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('summary.review.practice')}
        </button>
      </div>
    </section>
  )
}
