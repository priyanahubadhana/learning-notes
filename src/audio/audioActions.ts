import { useSyncExternalStore } from 'react'
import { t, type MessageKey } from '../i18n/t'
import {
  getRecorderState,
  startRecording,
  stopRecording,
  type StartResult,
} from './recorder'

/** Whether the left panel's Audio list is open (one flag for the app). */
let panelOpen = false
const listeners = new Set<() => void>()
export const isAudioPanelOpen = () => panelOpen
export function setAudioPanel(open: boolean) {
  if (open === panelOpen) return
  panelOpen = open
  for (const l of listeners) l()
}
export const useAudioPanelOpen = (): boolean =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => panelOpen,
  )

const WHY: Record<Exclude<StartResult, { ok: true }>['reason'], MessageKey> = {
  unsupported: 'audio.unsupported',
  denied: 'audio.denied',
  noMic: 'audio.noMic',
  busy: 'audio.busy',
  failed: 'audio.failed',
}

/**
 * Record / Stop for the open page (the Insert › Audio tool and the panel's
 * button). Opens the Audio list when a recording starts.
 */
export async function toggleRecording(
  pageId: string | null,
  toast: (message: string) => void,
): Promise<void> {
  const state = getRecorderState()
  if (state.status === 'recording') {
    await stopRecording()
    return
  }
  if (state.status === 'saving') return
  if (!pageId) {
    toast(t('audio.needsPage'))
    return
  }
  const result = await startRecording(pageId)
  if (result.ok) setAudioPanel(true)
  else toast(t(WHY[result.reason]))
}
