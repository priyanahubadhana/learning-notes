import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { tn } from './tn'
import type { ContinueCard } from './homeLogic'
import { notebookName } from './useNotebookActions'
import { openedLabel } from './openedLabel'
import { holdJustFired } from './rowHold'
import { notebookColour, shortLabel } from '../notebookLook'
import { displayName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'

/**
 * NB-B11: "Continue where you stopped": up to 4 cards (cover + page title).
 * A tap opens that notebook on that page. A thin track shows when the row
 * is wider than the screen.
 */
export function ContinueStrip({
  db,
  cards,
  onOpen,
  pad,
}: {
  db: LearningNotesDB
  cards: ContinueCard[]
  onOpen: (notebookId: string) => void
  pad: number
}) {
  const titles = useLiveQuery(async () => {
    const pages = await db.pages.bulkGet(cards.map((c) => c.pageId))
    return Object.fromEntries(
      pages.map((p, i) => [
        cards[i].pageId,
        p && p.deletedAt === null ? p : null,
      ]),
    )
  }, [db, cards.map((c) => c.pageId).join(',')])
  const shown = cards.filter((c) => titles?.[c.pageId])
  if (shown.length === 0) return null
  return (
    <section
      data-testid="nbv2-continue"
      aria-label={tn('nbv2.continue.title')}
      className="pb-3"
    >
      <h2
        className="pb-1.5 text-[13px] font-semibold text-muted"
        style={{ paddingInline: pad }}
      >
        {tn('nbv2.continue.title')}
      </h2>
      <div
        className="flex gap-2.5 overflow-x-auto pb-1"
        style={{ paddingInline: pad, scrollbarWidth: 'thin' }}
      >
        {shown.map((c) => {
          const page = titles?.[c.pageId]
          const name = notebookName(c.notebook)
          const title = displayName(page?.title ?? '') || t('nbh.blankPage')
          return (
            <button
              key={c.notebook.id}
              type="button"
              data-testid="nbv2-continue-card"
              aria-label={tn('nbv2.continue.open', { name, page: title })}
              onClick={() => {
                if (!holdJustFired()) onOpen(c.notebook.id)
              }}
              className="flex min-h-14 w-[228px] shrink-0 items-center gap-3 rounded-lg border border-line bg-bg p-2.5 text-start hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent any-pointer-coarse:min-h-16"
            >
              <span
                aria-hidden
                className="grid h-11 w-8 shrink-0 place-items-center text-[10px] font-bold text-white"
                style={{
                  background: notebookColour(c.notebook),
                  borderRadius: '3px 8px 8px 3px',
                }}
              >
                {shortLabel(name)}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-semibold">
                  {title}
                </strong>
                <small className="block truncate text-xs text-muted">
                  {name} · {openedLabel(c.openedAt)}
                </small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
