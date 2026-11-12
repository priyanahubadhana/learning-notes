import { EmptyState } from '../../design/parts/EmptyState'
import { changeNote, type Change } from './changeNote'
import { tv } from './tv'

/**
 * The live preview body. Later steps fill it with the effect of the changed
 * setting; for now it says so in plain words. Shared by the wide column
 * (SET-B01) and the phone sheet (SET-B03).
 */
export function PreviewBody({ last }: { last: Change | null }) {
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
export function PreviewPane({ last }: { last: Change | null }) {
  return (
    <aside
      data-preview-pane
      aria-label={tv('sv3.previewTitle')}
      className="sv3-preview"
    >
      <h2 className="sv3-preview-title">{tv('sv3.previewTitle')}</h2>
      <PreviewBody last={last} />
    </aside>
  )
}
