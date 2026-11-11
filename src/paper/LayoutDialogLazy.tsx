import { lazy, Suspense } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { GridInfo } from './layoutPlan'

const Dialog = lazy(() => import('./LayoutDialog'))

/** The Layout pop-up loads only when it opens (first-load budget). */
export function LayoutDialogLazy(props: {
  db: LearningNotesDB
  pageId: string
  info: GridInfo
  onClose: () => void
}) {
  return (
    <Suspense fallback={null}>
      <Dialog {...props} />
    </Suspense>
  )
}
