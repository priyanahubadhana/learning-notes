/** The preview switch of the circle recorder (see circleRecorder.ts). */
export const RECORDER_KEY = 'learning-notes:preview.circleRecorder'

/** Is the recorder switched on for this device? */
export function recorderOn(): boolean {
  try {
    return JSON.parse(localStorage.getItem(RECORDER_KEY) ?? 'null') === 'on'
  } catch {
    return false
  }
}
