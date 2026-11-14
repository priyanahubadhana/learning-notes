import { readPref } from '../app/uiPrefs'

/**
 * Starts or stops the slow-moments recorder (R6-11) without pulling it into
 * the first load: the recorder itself is a separate chunk, fetched only when
 * Settings › Advanced › Record slow moments is on.
 */

const PREF = 'advanced.slowMoments'
let stop: (() => void) | null = null
let wanted = false

const chosen = (): boolean =>
  readPref(PREF, (v): v is 'on' | 'off' => v === 'on' || v === 'off', 'off') ===
  'on'

/**
 * F7 (14 Nov): the freeze recorder runs by itself on the preview address
 * only, never on the live host or a deploy hash address (those can be
 * production builds). The test machine (localhost) only with the browser
 * tests' switch.
 */
const PREVIEW = 'build-next.learning-notes-app.pages.dev'
const TEST_SWITCH = 'learning-notes:perf.freezeWatch'
export const freezeWatchHost = (host: string, testSwitch = false): boolean =>
  host === PREVIEW ||
  (testSwitch && (host === 'localhost' || host === '127.0.0.1'))

function onPreview(): boolean {
  try {
    return freezeWatchHost(
      location.hostname,
      localStorage.getItem(TEST_SWITCH) === '1',
    )
  } catch {
    return false
  }
}

/** On by choice (Settings › Advanced), or by itself on the preview (F7). */
export const slowMomentsWanted = (): boolean => chosen() || onPreview()

/** On the preview without the setting: only blocks of 500 ms or more. */
const FREEZE_MS = 500

export function setSlowMomentsOn(on: boolean): void {
  // The preview keeps its freeze recorder when the setting is turned off.
  if (!on && onPreview()) on = true
  wanted = on
  if (!on) {
    stop?.()
    stop = null
    return
  }
  const minMs = chosen() ? undefined : FREEZE_MS
  stop?.()
  stop = null
  void import('./slowMoments').then((m) => {
    if (!wanted || stop) return
    stop = m.startSlowMoments({ minMs })
  })
}
