import { lazy, Suspense } from 'react'
import { isPreviewHost, useFlag } from '../../app/flags'
import { diagGate } from '../../app/diagGate'
import { pencilCheckShown } from './pencilCheckLogic'
import { ScrollBar } from './ScrollBar'
import { useScrollTarget } from './scrollTarget'

// P1.5a: hidden recorder, preview host + ?pencilcheck=1 only (its own chunk).
const PencilCheck = lazy(() => import('./PencilCheck'))
// 2B.2: quiet box and save recorders, preview address only (its own chunk).
const DiagPanel = lazy(() => import('../../paper/v2/diag/DiagPanel'))

/**
 * Mounted once (new app frame, flag foundation.shell): the shared scroll bar on
 * whichever list is being scrolled, so every panel and list has the same bar
 * (F6). With the flag off nothing is drawn and the old handle stays.
 */
export function ScrollBarHost() {
  const on = useFlag('foundation.shell')
  const target = useScrollTarget()
  const check = pencilCheckShown(isPreviewHost(), location.search)
  return (
    <>
      {on ? <ScrollBar scroller={target} auto /> : null}
      {diagGate(isPreviewHost()) ? (
        <Suspense fallback={null}>
          <DiagPanel />
        </Suspense>
      ) : null}
      {check ? (
        <Suspense fallback={null}>
          <PencilCheck />
        </Suspense>
      ) : null}
    </>
  )
}
