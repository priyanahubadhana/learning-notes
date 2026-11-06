import { IconButton } from '../../app/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import {
  HIGHLIGHT_COLOURS,
  type Annotation,
  type HighlightColour,
} from '../../core/types'
import { t } from '../../i18n/t'
import {
  deleteAnnotation,
  exportMarkdown,
  filterAnnotations,
  listAnnotations,
  placeLabel,
  restoreAnnotation,
  updateAnnotation,
  type AnnotationFilter,
} from './annotationService'
import { deepLinkFor } from './deepLink'
import { NoteSheet } from './NoteSheet'
import { COLOUR_FILL } from './colours'

/**
 * The annotations panel (C4): the highlights, notes and bookmarks of a book
 * with filters by type, colour and chapter. Tap one to jump to it; edit the
 * note or delete (with Undo); export as Markdown.
 */
export function AnnotationsPanel({
  db,
  pageId,
  title,
  onJump,
  onMakeCard,
  onMakeCards,
}: {
  db: LearningNotesDB
  pageId: string
  title: string
  onJump: (a: Annotation) => void
  onMakeCard?: (a: Annotation) => void
  onMakeCards?: (list: Annotation[]) => void
}) {
  const { toast } = useContext(AppUiContext)
  const [filter, setFilter] = useState<AnnotationFilter>({})
  const [editing, setEditing] = useState<Annotation | null>(null)
  const all = useLiveQuery(() => listAnnotations(db, pageId), [db, pageId])
  const shown = useMemo(
    () => filterAnnotations(all ?? [], filter),
    [all, filter],
  )
  const chapters = useMemo(
    () => [...new Set((all ?? []).map((a) => a.chapter).filter(Boolean))],
    [all],
  ) as string[]

  const remove = (a: Annotation) =>
    runTask(
      (async () => {
        await deleteAnnotation(db, a.id)
        toast(t('annot.removed'), {
          label: t('annot.undo'),
          onSelect: () => void runTask(restoreAnnotation(db, a.id)),
        })
      })(),
    )

  const markdown = () =>
    exportMarkdown(title, shown, (a) => deepLinkFor(a), {
      heading: t('annot.exportTitle', { title }),
      location: (where) => t('annot.exportLocation', { where }),
    })

  const copyAll = () =>
    runTask(
      navigator.clipboard
        .writeText(markdown())
        .then(() => toast(t('annot.exportCopied'))),
    )

  const saveFile = () => {
    const url = URL.createObjectURL(
      new Blob([markdown()], { type: 'text/markdown' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Highlights'}.md`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-3 text-xs ${
      active ? 'border-accent bg-accent/10' : 'border-line text-muted'
    }`
  return (
    <section
      aria-label={t('annot.panel')}
      data-testid="annotations-panel"
      className="flex flex-col gap-3"
    >
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={t('annot.filter.type')}
      >
        <button
          type="button"
          aria-pressed={!filter.type}
          onClick={() => setFilter((f) => ({ ...f, type: undefined }))}
          className={chip(!filter.type)}
        >
          {t('annot.filter.all')}
        </button>
        {(['highlight', 'note', 'bookmark'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter.type === k}
            onClick={() => setFilter((f) => ({ ...f, type: k }))}
            className={chip(filter.type === k)}
          >
            {t(`annot.type.${k}`)}
          </button>
        ))}
      </div>
      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label={t('annot.filter.colour')}
      >
        {HIGHLIGHT_COLOURS.map((c: HighlightColour) => (
          <IconButton
            tip="annot.colourFilter"
            bare
            tipClassName="inline-flex shrink-0"
            key={c}
            type="button"
            aria-pressed={filter.colour === c}
            aria-label={t(`annot.colour.${c}`)}
            onClick={() =>
              setFilter((f) => ({
                ...f,
                colour: f.colour === c ? undefined : c,
              }))
            }
            className="flex size-11 items-center justify-center rounded-lg hover:bg-hover"
          >
            <span
              aria-hidden
              className={`size-5 rounded-full border ${filter.colour === c ? 'border-ink' : 'border-line'}`}
              style={{ background: COLOUR_FILL[c] }}
            />
          </IconButton>
        ))}
        {chapters.length > 0 && (
          <select
            aria-label={t('annot.filter.chapter')}
            value={filter.chapter ?? ''}
            onChange={(e) =>
              setFilter((f) => ({ ...f, chapter: e.target.value || undefined }))
            }
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-xs"
          >
            <option value="">{t('annot.filter.chapter')}</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t('annot.panelEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((a) => (
            <li
              key={a.id}
              data-testid="annotation-row"
              className="rounded-lg border border-line p-2"
            >
              <button
                type="button"
                onClick={() => onJump(a)}
                aria-label={t('annot.jump')}
                className="block w-full text-start"
              >
                <span className="mb-1 block text-xs text-muted">
                  {t(`annot.type.${a.kind}`)}
                  {placeLabel(a) ? ` · ${placeLabel(a)}` : ''}
                </span>
                {a.quote && (
                  <span
                    className="block rounded px-1 text-sm"
                    style={{
                      background: a.colour ? COLOUR_FILL[a.colour] : undefined,
                    }}
                  >
                    {a.quote.exact}
                  </span>
                )}
                {a.note && <span className="mt-1 block text-sm">{a.note}</span>}
              </button>
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="min-h-11 rounded-lg px-2 text-xs text-muted hover:bg-hover"
                >
                  {t('annot.edit')}
                </button>
                {onMakeCard && a.quote && (
                  <button
                    type="button"
                    onClick={() => onMakeCard(a)}
                    className="min-h-11 rounded-lg px-2 text-xs text-muted hover:bg-hover"
                  >
                    {t('annot.makeCard')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(a)}
                  className="min-h-11 rounded-lg px-2 text-xs text-muted hover:bg-hover"
                >
                  {t('annot.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {shown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {onMakeCards && (
            <button
              type="button"
              data-testid="make-cards-all"
              onClick={() => onMakeCards(shown.filter((a) => a.quote))}
              className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
            >
              {t('recall.cardsFromAll')}
            </button>
          )}
          <button
            type="button"
            data-testid="export-copy"
            onClick={() => void copyAll()}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('annot.exportCopy')}
          </button>
          <button
            type="button"
            onClick={saveFile}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('annot.exportFile')}
          </button>
        </div>
      )}
      {editing && (
        <NoteSheet
          quote={editing.quote?.exact}
          initial={editing.note ?? ''}
          onCancel={() => setEditing(null)}
          onSave={(note) => {
            const id = editing.id
            setEditing(null)
            void runTask(updateAnnotation(db, id, { note }))
          }}
        />
      )}
    </section>
  )
}
