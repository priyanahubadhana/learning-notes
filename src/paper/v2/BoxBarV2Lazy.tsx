import { lazy, Suspense, type ComponentProps } from 'react'
import type BoxBarV2Type from './BoxBarV2'

const Bar = lazy(() => import('./BoxBarV2'))

/** The v2 box bar, loaded only when switch textbox.v2 is on. */
export function BoxBarV2Lazy(props: ComponentProps<typeof BoxBarV2Type>) {
  return (
    <Suspense fallback={null}>
      <Bar {...props} />
    </Suspense>
  )
}
