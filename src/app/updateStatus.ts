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
}

export const updateStatus = memStore<UpdateStatus>({ phase: 'idle' })
