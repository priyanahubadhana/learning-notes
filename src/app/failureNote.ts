import { t } from '../i18n/t'
import type { MandatoryFailure } from './mandatoryState'

/**
 * The small extra line on the "did not finish" screen of the preview host:
 * which step failed (download or restart) and how long it waited (L13).
 */
export function failureNote(f: MandatoryFailure | null): string | null {
  if (!f) return null
  return t(
    f.what === 'download' ? 'update.v2.noteDownload' : 'update.v2.noteRestart',
    { s: String(Math.round(f.waitedMs / 1000)) },
  )
}
