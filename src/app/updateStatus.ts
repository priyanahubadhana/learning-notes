import { memStore } from './tools/store'

/** What the update pill shows (items 16 and 24). Tiny on purpose: the pill itself is a lazy chunk. */
export interface UpdateStatus {
  phase:
    | 'idle'
    | 'checking'
    | 'downloading'
    | 'installing'
    | 'ready'
    | 'updating'
    | 'updated'
    | 'postponed'
    | 'current'
    | 'offline'
    | 'failed'
  loaded?: number
  total?: number
  /** Seconds left, when the download is slow. */
  etaS?: number
  version?: string
  /** While restarting: waiting too long, or could not restart (C22). */
  restart?: 'slow' | 'failed'
  /** update.v2: seconds left in the 3-second restart prompt (UP-05). */
  countdown?: number
}

export const updateStatus = memStore<UpdateStatus>({ phase: 'idle' })
