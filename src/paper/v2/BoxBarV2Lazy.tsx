import { lazy, Suspense, type ComponentProps } from 'react'
import type BoxBarV2Type from './BoxBarV2'
import type BoxMoreHostType from './BoxMoreHost'

const Bar = lazy(() => import('./BoxBarV2'))
const More = lazy(() => import('./BoxMoreHost'))

/** The v2 box bar, loaded only when switch textbox.v2 is on. */
export function BoxBarV2Lazy(props: ComponentProps<typeof BoxBarV2Type>) {
  return (
    <Suspense fallback={null}>
      <Bar {...props} />
    </Suspense>
  )
}

/** The v2 ⋯ list (replaces the old box menu when switch textbox.v2 is on). */
export function BoxMoreV2Lazy(props: ComponentProps<typeof BoxMoreHostType>) {
  return (
    <Suspense fallback={null}>
      <More {...props} />
    </Suspense>
  )
}
