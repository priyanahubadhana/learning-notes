/** The preview switch of the Lasso recorder (see app/input/lassoRecorder.ts). */
export const RECORDER_KEY = 'learning-notes:preview.circleRecorder'

/** Is the recorder switched on for this device? */
export function recorderOn(): boolean {
  try {
    return JSON.parse(localStorage.getItem(RECORDER_KEY) ?? 'null') === 'on'
  } catch {
    return false
  }
}

type Recorder = typeof import('../app/input/lassoRecorder')
let loaded: Recorder | null = null

/**
 * Makes the recorder match the switch: on loads it (a lazy chunk, so it costs
 * nothing at the first load), off stops it and clears what it held.
 */
export function syncRecorder(): void {
  if (!recorderOn() && !loaded) return
  void import('../app/input/lassoRecorder').then((m) => {
    loaded = m
    if (recorderOn()) m.startLassoRecorder()
    else m.stopLassoRecorder()
  })
}
