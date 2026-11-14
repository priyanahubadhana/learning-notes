import { lazy, Suspense } from 'react'

const ToolbarV8 = lazy(() => import('./ToolbarV8'))

/** Loads the new tool bar on first use, so the first download stays small. */
export function ToolbarV8Lazy() {
  return (
    <Suspense fallback={null}>
      <ToolbarV8 />
    </Suspense>
  )
}
