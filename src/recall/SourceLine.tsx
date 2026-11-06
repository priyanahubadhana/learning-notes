import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'

/**
 * "From: Book › Chapter" under a card made from a highlight (CR3). A tap
 * opens the reader at the highlight (with the landing glow).
 */
export function SourceLine({
  db,
  annotationId,
  onOpen,
}: {
  db: LearningNotesDB
  annotationId: string
  onOpen: (annotationId: string) => void
}) {
  const info = useLiveQuery(async () => {
    const a = await db.annotations.get(annotationId)
    if (!a || a.deletedAt !== null) return null
    const page = await db.pages.get(a.pageId)
    return { title: page?.title ?? '', chapter: a.chapter ?? '' }
  }, [db, annotationId])
  if (!info) return null
  const where = [info.title || t('review.untitled'), info.chapter]
    .filter(Boolean)
    .join(' › ')
  return (
    <p className="mt-2 text-center text-[13px]">
      <button
        type="button"
        data-testid="card-source"
        onClick={() => onOpen(annotationId)}
        className="min-h-11 rounded-lg px-3 text-accent underline-offset-2 hover:underline"
      >
        {t('recall.from', { where })}
      </button>
    </p>
  )
}
