import { Suspense, type ComponentProps } from 'react'
import { lazyNow } from '../app/lazyNow'

// The menu loads at the first press-and-hold, not in the first download.
const HoldMenu = lazyNow(() => import('./HoldMenu'))

/** Fetches the menu's code ahead of the first hold (R13). */
export const preloadHoldMenu = HoldMenu.preload

export function HoldMenuLazy(props: ComponentProps<typeof HoldMenu>) {
  return (
    <Suspense fallback={null}>
      <HoldMenu {...props} />
    </Suspense>
  )
}
