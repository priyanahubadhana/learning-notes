import { EmptyState } from '../../design/parts/EmptyState'
import type { LearningNotesDB } from '../../core/db'
import { changeNote, type Change } from './changeNote'
import { GeneralPreview } from './previews/GeneralPreview'
import { tv } from './tv'

/**
 * The live preview body. Later steps fill it with the effect of the changed
 * setting; for now it says so in plain words. Shared by the wide column
 * (SET-B01) and the phone sheet (SET-B03).
 */
export function PreviewBody({
  last,
  db,
  section,
}: {
  last: Change | null
  db: LearningNotesDB
  section: string
}) {
  if (section === 'general')
    return (
      <div className="sv3-general">
        <GeneralPreview db={db} last={last} />
        {last && (
          <div
            key={last.seq}
            data-preview-note
            role="status"
            className="sv3-note"
          >
            {changeNote(last)}
          </div>
        )}
      </div>
    )
  if (!last)
    return (
      <EmptyState
        variant="inline"
        icon="eye"
        title={tv('sv3.previewEmptyTitle')}
        text={tv('sv3.previewEmptyText')}
      />
    )
  return (
    <div
      key={last.seq}
      data-preview-note
      data-glow="on"
      role="status"
      className="sv3-note"
    >
      <div className="sv3-note-title">{tv('sv3.previewLast')}</div>
      {changeNote(last)}
    </div>
  )
}

/** SET-B01: the 340 px sticky column on the right (from 1180 up, CSS). */
export function PreviewPane({
  last,
  db,
  section,
}: {
  last: Change | null
  db: LearningNotesDB
  section: string
}) {
  return (
    <aside
      data-preview-pane
      aria-label={tv('sv3.previewTitle')}
      className="sv3-preview"
    >
      <h2 className="sv3-preview-title">{tv('sv3.previewTitle')}</h2>
      <PreviewBody last={last} db={db} section={section} />
    </aside>
  )
}
