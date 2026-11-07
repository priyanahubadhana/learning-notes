/**
 * Tells the open screens which records sync just wrote from another device
 * (R6-13 live apply). The engine announces after each merged batch; the
 * open editor listens and puts the changed blocks into the page without a
 * reload. Other windows of this browser hear it too (BroadcastChannel), as
 * any of them may be the one that pulled.
 */

export interface AppliedRecords {
  table: string
  ids: string[]
  /** Blocks only: the pages those blocks belong to. */
  pageIds?: string[]
}

const CHANNEL = 'learning-notes:sync.applied'
const listeners = new Set<(a: AppliedRecords) => void>()
let channel: BroadcastChannel | null | undefined

function bus(): BroadcastChannel | null {
  if (channel !== undefined) return channel
  try {
    channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(CHANNEL)
    channel?.addEventListener('message', (e: MessageEvent<AppliedRecords>) => {
      if (e.data && Array.isArray(e.data.ids)) emit(e.data)
    })
  } catch {
    channel = null
  }
  return channel
}

function emit(a: AppliedRecords) {
  for (const l of listeners) l(a)
}

/** Called by the engine after pulled records were written here. */
export function announceApplied(a: AppliedRecords): void {
  emit(a)
  try {
    bus()?.postMessage(a)
  } catch {
    // No channel (old browser): this window only.
  }
}

export function onApplied(fn: (a: AppliedRecords) => void): () => void {
  listeners.add(fn)
  bus()
  return () => listeners.delete(fn)
}
