import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import {
  addOwnLine,
  listSummary,
  MAX_LINE_LENGTH,
  removeLine,
  updateOwnLine,
  type SummaryGroup,
  type SummaryLine,
  type SummaryScope,
} from '../../core/summaryService'
import { revealBlock } from '../../editor/revealBlock'
import { Tip } from '../../help/Help'
import { sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import {
  MAX_SUMMARY_LENGTH,
  setLessonSummary,
} from '../../revise/reviseService'
import { runTask } from '../errors'

/**
 * A Summary at any level (Phase M): the key-point lines of one page (with
 * its sub-pages), of a notebook or of the whole app, grouped by page. Lines
 * linked to a note show the note's live words; typed lines can be edited
 * here. Every level reads the same rows, so nothing is copied.
 */
export function SummaryView({
  db,
  scope,
  onOpenPage,
  onOpenBlock,
}: {
  db: LearningNotesDB
  scope: SummaryScope
  onOpenPage: (pageId: string) => void
  /** Opens a note line; unset = open its page and show the line. */
  onOpenBlock?: (pageId: string, blockId: string) => void
}) {
  const groups = useLiveQuery(
    () => listSummary(db, scope),
    [db, scopeKey(scope)],
  )
  const page = scope.kind === 'page'
  const openBlock =
    onOpenBlock ??
    ((pageId: string, blockId: string) => {
      onOpenPage(pageId)
      revealBlock(blockId)
    })
  const goTo = async (line: SummaryLine) => {
    const block = line.item.sourceBlockId
      ? await db.blocks.get(line.item.sourceBlockId)
      : undefined
    if (block) openBlock(block.pageId, block.id)
  }

  if (!groups) return null
  const rootId = scope.kind === 'page' ? scope.pageId : null
  return (
    <section aria-label={t('summary.seg.summary')} className="min-w-0">
      {groups.every((g) => g.ownText.trim() === '' && g.lines.length === 0) && (
        <p className="mb-3 text-sm text-muted">
          {t(page ? 'summary.emptyPage' : 'summary.emptyAll')}
        </p>
      )}
      {groups.map((group) => (
        <Group
          key={group.page.id}
          db={db}
          group={group}
          // One page: no heading. Several: a heading per page.
          heading={!page || groups.length > 1 || group.page.id !== rootId}
          editable={group.page.id === rootId}
          onOpenPage={onOpenPage}
          onGoTo={(line) => runTask(goTo(line))}
        />
      ))}
      {rootId && <AddLine db={db} pageId={rootId} />}
    </section>
  )
}

const scopeKey = (scope: SummaryScope) =>
  scope.kind === 'page'
    ? `p:${scope.pageId}`
    : scope.kind === 'notebook'
      ? `n:${scope.notebookId}`
      : `a:${scope.notebookId ?? ''}`

function Group({
  db,
  group,
  heading,
  editable,
  onOpenPage,
  onGoTo,
}: {
  db: LearningNotesDB
  group: SummaryGroup
  heading: boolean
  /** The page's own paragraph can be typed here (the open page only). */
  editable: boolean
  onOpenPage: (pageId: string) => void
  onGoTo: (line: SummaryLine) => void
}) {
  const { page, ownText, lines } = group
  return (
    <div className="mb-5" data-summary-page={page.id}>
      {heading && (
        <h3 className="mb-1.5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onOpenPage(page.id)}
            aria-label={`${t('summary.openPage')}: ${sampleName(page) || t('review.untitled')}`}
            className="rounded-md text-start hover:underline"
          >
            {sampleName(page) || t('review.untitled')}
          </button>
        </h3>
      )}
      {editable ? (
        <OwnParagraph db={db} pageId={page.id} saved={ownText} />
      ) : (
        ownText.trim() !== '' && (
          <p className="mb-2 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-soft">
            {ownText}
          </p>
        )
      )}
      <ul aria-label={t('summary.lines')} className="grid gap-1">
        {lines.map((line) => (
          <Line
            key={line.item.id}
            db={db}
            line={line}
            onGoTo={() => onGoTo(line)}
          />
        ))}
      </ul>
    </div>
  )
}

function Line({
  db,
  line,
  onGoTo,
}: {
  db: LearningNotesDB
  line: SummaryLine
  onGoTo: () => void
}) {
  const { item } = line
  const [draft, setDraft] = useState(line.text)
  const [seen, setSeen] = useState(line.text)
  // The stored words changed elsewhere (another device, the note): show them.
  if (seen !== line.text) {
    setSeen(line.text)
    setDraft(line.text)
  }
  return (
    <li
      data-summary-line={item.id}
      className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-hover"
    >
      <span
        aria-hidden
        className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
      />
      <div className="min-w-0 flex-1">
        {line.linked ? (
          <p
            className={`text-[15px] leading-relaxed ${line.missing ? 'text-muted' : ''}`}
          >
            {line.text}
            {line.missing && (
              <span className="ms-2 text-xs">({t('summary.gone')})</span>
            )}
          </p>
        ) : (
          <textarea
            value={draft}
            rows={1}
            maxLength={MAX_LINE_LENGTH}
            aria-label={t('summary.lineLabel')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim() === '') setDraft(line.text)
              else runTask(updateOwnLine(db, item.id, draft))
            }}
            className="field-sizing-content w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
          />
        )}
        {item.href && (
          <a
            href={item.href}
            className="text-xs text-accent hover:underline"
            {...(item.href.startsWith('https://')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {item.where || item.href}
          </a>
        )}
      </div>
      {line.linked && !line.missing && (
        <Tip id="summary.goto" touchInfo={false}>
          <button
            type="button"
            onClick={onGoTo}
            aria-label={t('summary.goto')}
            className="grid min-h-9 min-w-9 place-items-center rounded-md text-muted hover:bg-soft hover:text-ink"
          >
            ↗
          </button>
        </Tip>
      )}
      <Tip id="summary.remove" touchInfo={false}>
        <button
          type="button"
          onClick={() => runTask(removeLine(db, item.id))}
          aria-label={t('summary.remove')}
          className="grid min-h-9 min-w-9 place-items-center rounded-md text-muted hover:bg-soft hover:text-ink"
        >
          ×
        </button>
      </Tip>
    </li>
  )
}

/** The page's own paragraph (the same text the Revise tab edits). */
function OwnParagraph({
  db,
  pageId,
  saved,
}: {
  db: LearningNotesDB
  pageId: string
  saved: string
}) {
  const [text, setText] = useState(saved)
  const [seen, setSeen] = useState(saved)
  if (seen !== saved) {
    setSeen(saved)
    setText(saved)
  }
  return (
    <label className="mb-3 grid gap-1">
      <span className="text-xs font-medium text-muted">
        {t('summary.ownLabel')}
      </span>
      <textarea
        value={text}
        rows={2}
        maxLength={MAX_SUMMARY_LENGTH}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== saved) runTask(setLessonSummary(db, pageId, text))
        }}
        className="field-sizing-content min-h-16 w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-[15px] leading-relaxed"
      />
    </label>
  )
}

function AddLine({ db, pageId }: { db: LearningNotesDB; pageId: string }) {
  const [text, setText] = useState('')
  const add = async () => {
    if (text.trim() === '') return
    const result = await addOwnLine(db, pageId, text)
    if (result.status === 'added') setText('')
  }
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        runTask(add())
      }}
    >
      <input
        value={text}
        maxLength={MAX_LINE_LENGTH}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('summary.linePlaceholder')}
        aria-label={t('summary.lineLabel')}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[15px]"
      />
      <button
        type="submit"
        disabled={text.trim() === ''}
        className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {t('summary.lineAdd')}
      </button>
    </form>
  )
}
