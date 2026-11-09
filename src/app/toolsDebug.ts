import { toolState } from './gestureReset'
import { registerProbe, runHealth } from './healthCheck'
import { refreshNow, requestSoftRefresh } from './softRefresh'
import { inputMachine } from './inputMachine'
import { lock } from '../editor/editLock'

/**
 * `window.__lnTools`: what the end-to-end tests (and a person with the
 * console open) use to look at, and poke, the gesture machinery. Nothing in
 * the app reads it.
 */
export interface ToolsDebug {
  toolState: typeof toolState
  machine: typeof inputMachine
  [more: string]: unknown
}

declare global {
  interface Window {
    __lnTools?: ToolsDebug
  }
}

export function installToolsDebug(extra: Record<string, unknown> = {}): void {
  window.__lnTools = {
    ...window.__lnTools,
    toolState,
    machine: inputMachine,
    // Tests: the Lasso's shape and filters without opening its pill.
    setLasso: async (patch: Record<string, unknown>) => {
      const m = await import('./tools/main/inkSettings')
      m.lassoSettings.update(patch as never)
    },
    // Tests: one health run now; and a few ways to put a flag in a bad state.
    softRefresh: (why = 'test') => requestSoftRefresh(why),
    refreshNow,
    health: (reason = 'manual') => runHealth(reason),
    stick: {
      // A problem no heal can fix: two runs ask for a soft refresh.
      unhealable: () =>
        registerProbe({
          name: 'test-unhealable',
          check: () => 'still bad',
          heal: () => {},
        }),
      selectGesture: async () => {
        ;(await import('../editor/gesture')).selectGesture.active = true
      },
      penGuard: async () => {
        ;(await import('../editor/penGuard')).penState.down = true
      },
      lock: () => {
        const el = document.querySelector<HTMLElement>('[data-page-content]')
        if (el) lock('test', el)
      },
      editable: (value: string) => {
        document
          .querySelector('[data-page-content]')
          ?.setAttribute('contenteditable', value)
      },
    },
    ...extra,
  }
}
