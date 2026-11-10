import { lazy, Suspense, type ComponentProps } from 'react'

// The menu loads at the first press-and-hold, not in the first download.
const HoldMenu = lazy(() => import('./HoldMenu'))

export function HoldMenuLazy(props: ComponentProps<typeof HoldMenu>) {
  return (
    <Suspense fallback={null}>
      <HoldMenu {...props} />
    </Suspense>
  )
}
