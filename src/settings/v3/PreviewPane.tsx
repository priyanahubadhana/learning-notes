import { EmptyState } from '../../design/parts/EmptyState'
import { tv } from './tv'

/**
 * The live preview body. Later steps fill it with the effect of the changed
 * setting; for now it says so in plain words. Shared by the wide column
 * (SET-B01) and the phone sheet (SET-B03).
 */
export function PreviewBody() {
  return (
    <EmptyState
      variant="inline"
      icon="eye"
      title={tv('sv3.previewEmptyTitle')}
      text={tv('sv3.previewEmptyText')}
    />
  )
}

/** SET-B01: the 340 px sticky column on the right (from 1180 up, CSS). */
export function PreviewPane() {
  return (
    <aside
      data-preview-pane
      aria-label={tv('sv3.previewTitle')}
      className="sv3-preview"
    >
      <h2 className="sv3-preview-title">{tv('sv3.previewTitle')}</h2>
      <PreviewBody />
    </aside>
  )
}
