import { Suspense, type ComponentProps } from 'react'
import { lazyNow } from '../../app/lazyNow'

// The strip loads at the first press-and-hold, not in the first download.
const PageStrip = lazyNow(() => import('./PageStrip'))

export function PageStripLazy(props: ComponentProps<typeof PageStrip>) {
  return (
    <Suspense fallback={null}>
      <PageStrip {...props} />
    </Suspense>
  )
}

/** Fetches the strip's code ahead of the first hold (R13). */
PageStripLazy.preload = PageStrip.preload
