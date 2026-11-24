import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import { downloadFile } from '../../app/download'
import { t } from '../../i18n/t'
import { placeLabel } from '../../reader/annotations/annotationService'
import { listTags } from '../../tags/tagService'
import {
  DEFAULT_EXPORT,
  buildExport,
  planExport,
  type ExportItem,
  type ExportOptions,
} from './exportBuilder'

/** Every live annotation as an exportable item, with its book and tags. */
export async function loadExportItems(
  db: LearningNotesDB,
  bookIds?: readonly string[],
): Promise<{ items: ExportItem[]; books: { id: string; title: string }[] }> {
  const rows = (await db.annotations.toArray()).filter(
    (a) =>
      isLive(a) &&
      (!bookIds || bookIds.includes(a.pageId)) &&
      (a.kind !== 'highlight' || !!a.quote),
  )
  const pageIds = [...new Set(rows.map((a) => a.pageId))]
  const pages = (await db.pages.bulkGet(pageIds)).filter((p) => !!p)
  const tags = new Map((await listTags(db)).map((x) => [x.id, x.name]))
  const byId = new Map(pages.map((p) => [p!.id, p!]))
  const items = rows
    .filter((a) => byId.has(a.pageId))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((a): ExportItem => {
      const p = byId.get(a.pageId)!
      return {
        bookId: p.id,
        book: p.title || t('review.untitled'),
        kind: a.kind,
        quote: a.quote?.exact,
        note: a.note,
        colour: a.colour,
        chapter: a.chapter,
        place: placeLabel(a) || undefined,
        tags: (p.tagIds ?? [])
          .map((id) => tags.get(id))
          .filter((x): x is string => !!x),
      }
    })
  return {
    items,
    books: pages.map((p) => ({
      id: p!.id,
      title: p!.title || t('review.untitled'),
    })),
  }
}

/** Downloads highlights of one book as Markdown (⋯ › Export highlights). */
export async function exportBookHighlights(
  db: LearningNotesDB,
  bookId: string,
): Promise<boolean> {
  const { items } = await loadExportItems(db, [bookId])
  const o: ExportOptions = { ...DEFAULT_EXPORT, bookIds: [bookId] }
  const plan = planExport(items, [], o)
  if (plan.count === 0) return false
  downloadFile(
    'learning-notes-highlights.md',
    buildExport(plan, o),
    'text/markdown',
  )
  return true
}
