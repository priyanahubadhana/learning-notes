import type { SyncDisplay } from './syncDisplay'
import { useSyncLabel } from './useSyncLabel'

const DOT: Record<SyncDisplay, string> = {
  synced: 'bg-green-600',
  syncing: 'bg-accent motion-safe:animate-pulse',
  offline: 'bg-muted',
  attention: 'bg-danger',
}

/**
 * A small status dot with its words: Synced (time), Syncing, Offline or
 * Needs attention. The colour never carries the meaning alone.
 */
export function SyncDot({ className = '' }: { className?: string }) {
  const state = useSyncLabel()
  if (!state) return null
  return (
    <span
      data-testid="sync-dot"
      data-state={state.display}
      className={`inline-flex items-center gap-1.5 text-xs text-muted ${className}`}
    >
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${DOT[state.display]}`}
      />
      <span aria-live="polite">{state.label}</span>
    </span>
  )
}
