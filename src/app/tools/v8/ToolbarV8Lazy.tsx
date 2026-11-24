import { lazy, Suspense } from 'react'

const ToolbarV8 = lazy(() => import('./ToolbarV8'))

/**
 * Loads the new tool bar on first use, so the first download stays small.
 * While it loads, its two rows of space are kept (the same --v8-row-h the bar
 * uses), so the page below does not jump down when the bar draws (F8, 15 Nov).
 */
export function ToolbarV8Lazy() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden
          data-v8-reserve
          style={{ minHeight: 'calc(var(--v8-row-h, 52px) * 2)' }}
        />
      }
    >
      <ToolbarV8 />
    </Suspense>
  )
}
