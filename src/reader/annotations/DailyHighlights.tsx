import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { usePref } from '../../app/usePref'
import type { LearningNotesDB } from '../../core/db'
import type { Annotation } from '../../core/types'
import { t } from '../../i18n/t'
import { makeCardsFromAnnotations } from '../../recall/cardFromAnnotation'
import {
  EMPTY_DAILY,
  isDailyState,
  pickDaily,
} from '../../recall/highlightReview'
import { listAllHighlights, placeLabel } from './annotationService'
import { COLOUR_FILL } from './colours'
import { SaveToSheet, type SaveTarget } from './SaveToSheet'
import { saveAnnotationTo, saveAnnotationToSummary } from './saveToNotes'
import { createPage } from '../../pages/pageService'

/** Today's date as the user's own calendar day. */
const today = () => new Date().toLocaleDateString('en-CA')

/**
 * "Highlights for today" on the Review home (CR3): five highlights a day,
 * oldest-unseen first, with Make card and Save to notes on each.
 */
export function DailyHighlights({
  db,
  onOpen,
  count,
  pageId,
}: {
  db: LearningNotesDB
  onOpen: (a: Annotation) => void
  /** How many a day (default 5). The Library chooses 3, 5 or 10. */
  count?: number
  /**
   * Reader v2 (RD-P17): only this book's highlights, inside the Annotations
   * tab. Its own day list, so the Home card's list is not touched.
   */
  pageId?: string
}) {
  const { toast } = useContext(AppUiContext)
  const [shared, setShared] = usePref(
    'highlights.daily',
    isDailyState,
    EMPTY_DAILY,
  )
  const [own, setOwn] = useState(EMPTY_DAILY)
  const state = pageId ? own : shared
  const setState = pageId ? setOwn : setShared
  const [saving, setSaving] = useState<Annotation | null>(null)
  const all = useLiveQuery(async () => {
    const list = await listAllHighlights(db)
    return pageId ? list.filter((a) => a.pageId === pageId) : list
  }, [db, pageId])

  // Pick today's five once per day (adjusting state while rendering).
  const picked = useMemo(
    () => (all ? pickDaily(all, state, today(), count) : null),
    [all, state, count],
  )
  if (
    picked &&
    (picked.day !== state.day || picked.ids.join() !== state.ids.join())
  ) {
    setState(picked)
  }
  const byId = useMemo(() => new Map((all ?? []).map((a) => [a.id, a])), [all])
  const pages = useLiveQuery(
    async () =>
      new Map(
        (await db.pages.bulkGet([...new Set((all ?? []).map((a) => a.pageId))]))
          .filter((p) => !!p)
          .map((p) => [p!.id, p!.title]),
      ),
    [db, all],
  )
  const shown = (picked?.ids ?? [])
    .filter((id) => !picked?.done.includes(id))
    .map((id) => byId.get(id))
    .filter((a): a is Annotation => !!a)

  const finish = (id: string) =>
    setState({ ...state, done: [...state.done, id] })

  const makeCard = (a: Annotation) =>
    runTask(
      (async () => {
        const made = await makeCardsFromAnnotations(db, a.pageId, [a])
        if (made.blockIds.length === 0) return toast(t('recall.bulkNone'))
      })(),
    )

  const saveTo = async (a: Annotation, target: SaveTarget) => {
    const where = placeLabel(a)
    if (target.kind === 'summary') {
      const ok = await saveAnnotationToSummary(db, a, a.pageId, where)
      toast(t(ok ? 'summary.saved' : 'summary.full'))
      return
    } else if (target.kind === 'page') {
      await saveAnnotationTo(db, a, target.pageId, where)
    } else if (target.kind === 'new') {
      const book = await db.pages.get(a.pageId)
      if (!book) return
      const created = await createPage(
        db,
        book.notebookId,
        null,
        `${t('annot.highlightsPageTitle')} · ${book.title}`.slice(0, 200),
      )
      await saveAnnotationTo(db, a, created.id, where)
    } else await saveAnnotationTo(db, a, a.pageId, where, 'highlights')
  }

  if (!all || (pageId && all.length === 0)) return null
  return (
    <section
      aria-label={t('recall.dailyTitle')}
      data-testid={pageId ? 'book-daily-highlight' : 'daily-highlights'}
      className={pageId ? '' : 'mb-8'}
    >
      <h2 className="mb-3 text-[15px] font-semibold">
        {t('recall.dailyTitle')}
      </h2>
      {all.length === 0 ? (
        <p className="text-sm text-muted">{t('recall.dailyEmpty')}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">{t('recall.dailyDone')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((a) => (
            <li
              key={a.id}
              data-testid="daily-item"
              className="rounded-xl border border-line p-3"
            >
              <button
                type="button"
                onClick={() => onOpen(a)}
                className="block w-full text-start"
                aria-label={t('annot.jump')}
              >
                <span
                  className="rounded px-1 text-sm"
                  style={{
                    background: a.colour ? COLOUR_FILL[a.colour] : undefined,
                  }}
                >
                  {a.quote?.exact}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {pages?.get(a.pageId) ?? ''}
                  {placeLabel(a) ? ` · ${placeLabel(a)}` : ''}
                </span>
              </button>
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  data-testid="daily-make-card"
                  onClick={() => makeCard(a)}
                  disabled={!!a.cardIds?.length}
                  className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50"
                >
                  {t('annot.makeCard')}
                </button>
                <button
                  type="button"
                  onClick={() => setSaving(a)}
                  className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
                >
                  {t('recall.dailySaveNotes')}
                </button>
                <button
                  type="button"
                  data-testid="daily-seen"
                  onClick={() => finish(a.id)}
                  className="min-h-11 rounded-lg px-3 text-sm text-muted hover:bg-hover"
                >
                  {t('recall.dailySeen')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {saving && (
        <SaveToSheet
          db={db}
          excludePageId={saving.pageId}
          onCancel={() => setSaving(null)}
          onPick={(target) => {
            const a = saving
            setSaving(null)
            runTask(saveTo(a, target))
          }}
        />
      )}
    </section>
  )
}
