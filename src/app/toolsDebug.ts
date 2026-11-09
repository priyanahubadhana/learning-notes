import { toolState } from './gestureReset'
import { inputMachine } from './inputMachine'

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
    ...extra,
  }
}
