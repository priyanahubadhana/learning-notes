import { useSyncExternalStore } from 'react'

/**
 * What the status pill stack must stay above (S3-23, S3-29). Owners set only
 * the things they own (the Tool frame its footer, the shell its tab bar, the
 * toast stack its height); the stack reads the sum. Never a pill position.
 */
export interface PillEnv {
  /** Height of the phone tab bar, px. */
  tabBar: number
  /** Height of the on-screen keyboard, px (0 when closed). */
  keyboard: number
  /** Height of the Tool frame footer while a Tool frame is open, px. */
  toolFooter: number
  /** Height of a toast that reaches the corner, px. */
  toast: number
}

const EMPTY: PillEnv = { tabBar: 0, keyboard: 0, toolFooter: 0, toast: 0 }
let env: PillEnv = EMPTY
const subs = new Set<() => void>()

export function setPillEnv(patch: Partial<PillEnv>): void {
  const next = { ...env, ...patch }
  if ((Object.keys(next) as (keyof PillEnv)[]).every((k) => next[k] === env[k]))
    return
  env = next
  subs.forEach((s) => s())
}

export const getPillEnv = (): PillEnv => env

export const usePillEnv = (): PillEnv =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    getPillEnv,
    () => EMPTY,
  )
