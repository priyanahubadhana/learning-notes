import { useEffect, useLayoutEffect, useRef } from 'react'
import { motionMs } from '../../design/parts/motion'
import { createPillStore, type PillSpec, type PillStore } from './pillStore'

export type { PillSpec } from './pillStore'

/** The one app-wide store; owners reach it only through `usePill`. */
export const pillStore: PillStore = createPillStore(() => motionMs(200))

/**
 * Shows, updates or removes one pill (S3-20 to S3-29). Pass a spec to show it,
 * `null` to remove it. Owners never position their pill.
 */
export function usePill(spec: PillSpec | null): void {
  const id = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (spec) {
      id.current = spec.id
      pillStore.set(spec)
    } else if (id.current) {
      pillStore.leave(id.current)
      id.current = null
    }
  })
  useEffect(
    () => () => {
      if (id.current) pillStore.leave(id.current)
    },
    [],
  )
}
