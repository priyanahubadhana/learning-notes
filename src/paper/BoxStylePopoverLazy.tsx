import { lazy, Suspense, type ComponentProps } from 'react'

// The Box style panel loads only when it is opened (first-download size).
const BoxStylePopover = lazy(() => import('./BoxStylePopover'))

export function BoxStylePopoverLazy(
  props: ComponentProps<typeof BoxStylePopover>,
) {
  return (
    <Suspense fallback={null}>
      <BoxStylePopover {...props} />
    </Suspense>
  )
}
