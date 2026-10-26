import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { getBacklinks } from './linkService'

/** Links shown at first, and added by each "Show more". */
const STEP = 20

/**
 * "Linked from" at the end of a page: every block on another page that
 * links here, with the sentence around the link. Live; a click opens that
 * block.
 */
export function LinkedFrom({
  db,
  pageId,
  pageTitle,
  onOpenBlock,
}: {
  db: LearningNotesDB
  pageId: string
  pageTitle: string
  onOpenBlock: (pageId: string, blockId: string) => void
}) {
  const [limit, setLimit] = useState(STEP)
  const backlinks = useLiveQuery(
    () => getBacklinks(db, pageId, limit),
    [db, pageId, limit],
  )
  const notebooks = useLiveQuery(
    async () => new Map((await db.notebooks.toArray()).map((n) => [n.id, n])),
    [db],
  )
  if (!backlinks) return null

  return (
    <section
      aria-labelledby={`linked-from-${pageId}`}
      className="mt-12 border-t border-line pt-4"
    >
      <h2
        id={`linked-from-${pageId}`}
        className="mb-2.5 flex items-baseline gap-2 text-[13px] font-semibold"
      >
        {t('links.linkedFrom')}
        <span className="font-normal text-muted">{backlinks.total}</span>
      </h2>
      {backlinks.total === 0 ? (
        <p className="text-sm text-muted">
          {t('links.none', { page: pageTitle || t('review.untitled') })}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {backlinks.items.map((item) => (
            <li key={item.blockId}>
              <button
                type="button"
                onClick={() => onOpenBlock(item.pageId, item.blockId)}
                className="w-full rounded-lg px-2.5 py-2 text-start hover:bg-hover focus-visible:bg-hover"
              >
                <div className="text-sm font-medium">
                  {item.pageTitle || t('review.untitled')}{' '}
                  <small className="font-normal text-muted">
                    · {notebooks?.get(item.notebookId)?.title ?? ''}
                  </small>
                </div>
                <div className="mt-0.5 line-clamp-3 text-sm text-ink-soft">
                  {item.before}
                  {item.link && (
                    <em className="font-medium text-ink not-italic">
                      {item.link}
                    </em>
                  )}
                  {item.after}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {backlinks.total > backlinks.items.length && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + STEP)}
          className="mt-1 min-h-10 rounded-lg px-2.5 text-sm text-accent hover:bg-hover"
        >
          {t('links.showMore')}
        </button>
      )}
    </section>
  )
}
