import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { pushRouteParts, useRouteParts } from '../app/router'
import { revealBlock } from '../editor/revealBlock'
import { HelpLine, Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { ReviewScope } from '../recall/reviewService'
import { groupMarks, markName, MARK_LABELS } from './reviseMarks'
import {
  listLessonMarks,
  MAX_SUMMARY_LENGTH,
  setLessonSummary,
} from './reviseService'

/**
 * A notebook's Revise tab: pick a lesson and see its revision sheet: your
 * own summary, then every marked piece of its notes (and its sub-pages')
 * grouped as Key points, Keywords, Must know and Formulas, and a button to
 * practise the lesson's cards.
 */
export function ReviseTab({
  db,
  notebookId,
  tabId,
  onOpenPage,
  onReview,
}: {
  db: LearningNotesDB
  notebookId: string
  /** This tab's id, the first level of the address. */
  tabId: string
  onOpenPage: (pageId: string) => void
  onReview: (scope: ReviewScope) => void
}) {
  const lessons = useLiveQuery(
    () => listLessonMarks(db, notebookId),
    [db, notebookId],
  )
  // The open lesson is the second level of the address.
  const pickedId = useRouteParts(1)
  if (!lessons)
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  if (lessons.length === 0) {
    return <p className="text-sm text-muted">{t('revise.noLessons')}</p>
  }
  const current = lessons.find((l) => l.lesson.id === pickedId) ?? lessons[0]
  const groups = groupMarks(current.marks)

  return (
    <section aria-label={t('notebook.tab.revise')}>
      <HelpLine id="revise.how" className="mb-3 text-xs text-muted" />
      <div className="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
        <ul
          aria-label={t('revise.lessons')}
          className="flex gap-1.5 overflow-x-auto md:grid md:content-start md:gap-0.5 md:overflow-visible"
        >
          {lessons.map(({ lesson, marks }) => (
            <li key={lesson.id}>
              <button
                type="button"
                aria-pressed={lesson.id === current.lesson.id}
                onClick={() =>
                  pushRouteParts(1, lesson.id, [tabId, current.lesson.id])
                }
                className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-start text-sm whitespace-nowrap hover:bg-hover aria-pressed:bg-soft aria-pressed:font-semibold md:whitespace-normal"
              >
                <span className="min-w-0 flex-1 truncate">
                  {lesson.title || t('review.untitled')}
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {marks.length}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div key={current.lesson.id} className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="me-auto min-w-0 text-[17px] font-semibold">
              {current.lesson.title || t('review.untitled')}
            </h2>
            <button
              type="button"
              onClick={() => onOpenPage(current.lesson.id)}
              className="min-h-9 rounded-lg border border-line px-3 text-[13px] hover:bg-hover"
            >
              {t('revise.openLesson')}
            </button>
            <Tip id="revise.practice" touchInfo={false}>
              <button
                type="button"
                onClick={() =>
                  onReview({
                    kind: 'page',
                    pageId: current.lesson.id,
                    includeSubpages: true,
                  })
                }
                className="min-h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90"
              >
                {t('revise.practice')}
              </button>
            </Tip>
          </div>

          <Summary
            db={db}
            lessonId={current.lesson.id}
            saved={current.lesson.summary ?? ''}
          />

          {groups.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('revise.noMarks')}</p>
          ) : (
            groups.map(({ label, marks }) => (
              <section
                key={label}
                className="mt-4"
                aria-label={markName(label)}
              >
                <h3 className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold">
                  <span
                    aria-hidden
                    className="recall-mark inline-block size-3 rounded-sm"
                    data-mark={label}
                  />
                  {markName(label)}
                  <span className="font-normal text-muted">{marks.length}</span>
                </h3>
                <ul className="grid gap-1">
                  {marks.map((mark, i) => (
                    <li key={`${mark.blockId}:${i}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenPage(mark.pageId)
                          revealBlock(mark.blockId)
                        }}
                        className="w-full rounded-lg border border-line px-3 py-1.5 text-start text-sm break-words hover:bg-hover"
                      >
                        {mark.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <p className="mt-4 text-xs text-muted">
            {MARK_LABELS.map(markName).join(' · ')}
          </p>
        </div>
      </div>
    </section>
  )
}

/** The lesson's own summary: saved when you click away. */
function Summary({
  db,
  lessonId,
  saved,
}: {
  db: LearningNotesDB
  lessonId: string
  saved: string
}) {
  const [text, setText] = useState(saved)
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">
        {t('revise.summary')}
      </span>
      <textarea
        value={text}
        maxLength={MAX_SUMMARY_LENGTH}
        rows={3}
        placeholder={t('revise.summaryPlaceholder')}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== saved) void setLessonSummary(db, lessonId, text)
        }}
        className="w-full resize-y rounded-lg border border-line bg-bg p-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  )
}
