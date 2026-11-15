import { lazy, Suspense, type ComponentProps } from 'react'

// The strip loads at the first press-and-hold, not in the first download.
const PageStrip = lazy(() => import('./PageStrip'))

export function PageStripLazy(props: ComponentProps<typeof PageStrip>) {
  return (
    <Suspense fallback={null}>
      <PageStrip {...props} />
    </Suspense>
  )
}
