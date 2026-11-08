import { lazy, Suspense, type ComponentProps } from 'react'

// The choice bars load only when sync is on.
const ClashBars = lazy(() => import('./ClashBars'))

export function ClashBarsLazy(props: ComponentProps<typeof ClashBars>) {
  return (
    <Suspense fallback={null}>
      <ClashBars {...props} />
    </Suspense>
  )
}
