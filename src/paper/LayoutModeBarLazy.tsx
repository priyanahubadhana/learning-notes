import { lazy, Suspense, type ComponentProps } from 'react'

// The Layout mode strip loads only when the mode opens (first-download size).
const LayoutModeBar = lazy(() => import('./LayoutModeBar'))

export function LayoutModeBarLazy(props: ComponentProps<typeof LayoutModeBar>) {
  return (
    <Suspense fallback={null}>
      <LayoutModeBar {...props} />
    </Suspense>
  )
}
