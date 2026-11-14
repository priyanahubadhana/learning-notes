import { lazy, Suspense, type ComponentProps } from 'react'
import type BoxBarV2Type from './BoxBarV2'
import type BoxMoreHostType from './BoxMoreHost'
import { loadBar, loadedV2, loadMore } from './boxBarV2Load'

const Bar = lazy(loadBar)
const More = lazy(loadMore)

/** The v2 box bar, loaded only when switch textbox.v2 is on. */
export function BoxBarV2Lazy(props: ComponentProps<typeof BoxBarV2Type>) {
  // Its code is here already (fetched with the page): no Suspense wait.
  const Loaded = loadedV2.bar
  if (Loaded) return <Loaded {...props} />
  return (
    <Suspense fallback={null}>
      <Bar {...props} />
    </Suspense>
  )
}

/** The v2 ⋯ list (replaces the old box menu when switch textbox.v2 is on). */
export function BoxMoreV2Lazy(props: ComponentProps<typeof BoxMoreHostType>) {
  const Loaded = loadedV2.more
  if (Loaded) return <Loaded {...props} />
  return (
    <Suspense fallback={null}>
      <More {...props} />
    </Suspense>
  )
}
