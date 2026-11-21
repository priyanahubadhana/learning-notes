import { lazy, Suspense } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { GridInfo } from '../layoutPlan'

const Assist = lazy(() => import('./layoutAssist'))

/** Layout Assist loads only when it opens, and only with textbox.v2 on (first-load budget). */
export function LayoutAssistLazy(props: {
  db: LearningNotesDB
  pageId: string
  getInfo: () => GridInfo
  onDone: () => void
}) {
  return (
    <Suspense fallback={null}>
      <Assist {...props} />
    </Suspense>
  )
}
