import { useEffect, useState, useSyncExternalStore } from 'react'
import { t } from '../i18n/t'
import { getSyncStatus, subscribeSync } from './syncService'
import { syncDisplay, type SyncDisplay } from './syncProblem'

const DOT: Record<SyncDisplay, string> = {
  synced: 'bg-green-600',
  syncing: 'bg-accent motion-safe:animate-pulse',
  offline: 'bg-muted',
  attention: 'bg-danger',
}

/** True while the device says it has a connection. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** The words next to the dot, e.g. "Synced 10:42" or "Offline". */
export function useSyncLabel(): {
  display: SyncDisplay
  label: string
} | null {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const online = useOnline()
  const display = syncDisplay(status, online)
  if (!display) return null
  const time = status.lastSyncedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(status.lastSyncedAt)
    : ''
  const label =
    display === 'synced'
      ? time
        ? t('sync.state.syncedAt', { time })
        : t('sync.state.synced')
      : t(`sync.state.${display}`)
  return { display, label }
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
