import { readPref } from '../app/uiPrefs'

/**
 * Starts or stops the slow-moments recorder (R6-11) without pulling it into
 * the first load: the recorder itself is a separate chunk, fetched only when
 * Settings › Advanced › Record slow moments is on.
 */

const PREF = 'advanced.slowMoments'
let stop: (() => void) | null = null
let wanted = false

export const slowMomentsWanted = (): boolean =>
  readPref(PREF, (v): v is 'on' | 'off' => v === 'on' || v === 'off', 'off') ===
  'on'

export function setSlowMomentsOn(on: boolean): void {
  wanted = on
  if (!on) {
    stop?.()
    stop = null
    return
  }
  if (stop) return
  void import('./slowMoments').then((m) => {
    if (!wanted || stop) return
    stop = m.startSlowMoments()
  })
}
