import { lazy, Suspense, type ComponentProps } from 'react'

// The layout dialog loads only when it is opened (first-download size).
const LayoutAssist = lazy(() => import('./LayoutAssist'))

export function LayoutAssistLazy(props: ComponentProps<typeof LayoutAssist>) {
  return (
    <Suspense fallback={null}>
      <LayoutAssist {...props} />
    </Suspense>
  )
}
