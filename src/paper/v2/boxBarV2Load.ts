import type BoxBarV2Type from './BoxBarV2'
import type BoxMoreHostType from './BoxMoreHost'

// Why: a lazy part that suspends waits up to 300 ms (React 19 holds a
// Suspense reveal back that long), even when its code arrived long before.
// So the bar's and the ⋯ list's code is fetched when a page opens, and once
// here they are drawn directly, with no Suspense in the way (BoxBarV2Lazy).
export const loadedV2: {
  bar: typeof BoxBarV2Type | null
  more: typeof BoxMoreHostType | null
} = { bar: null, more: null }

export const loadBar = () =>
  import('./BoxBarV2').then((m) => {
    loadedV2.bar = m.default
    return m
  })
export const loadMore = () =>
  import('./BoxMoreHost').then((m) => {
    loadedV2.more = m.default
    return m
  })

/** Fetch the box bar and ⋯ list code ahead: the first selected box shows them at once. */
export function prefetchBoxBarV2(): void {
  if (!loadedV2.bar) loadBar().catch(() => {})
  if (!loadedV2.more) loadMore().catch(() => {})
}
