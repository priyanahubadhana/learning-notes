import { pageMode } from '../editor/editPolicy'
import { activeTool, miniToolbarOpen } from './tools/main/mainTools'
import { toolState, toolStateReport } from './gestureReset'
import { lastCheckedAt, updateWaiting } from './updates'

/**
 * Settings › Advanced › Copy tool state (R7 debugging): what every piece of
 * the pointer and tool code believes right now, as text to paste into a
 * message. Shown and made on this device only; nothing leaves it.
 */
export function buildToolStateReport(): string {
  const sw = navigator.serviceWorker
  const header: Record<string, unknown> = {
    app: `${__APP_COMMIT__} built ${__APP_BUILT__}`,
    at: new Date().toISOString(),
    visibility: document.visibilityState,
    hasFocus: document.hasFocus(),
    activeElement: describe(document.activeElement),
    standalone: matchMedia('(display-mode: standalone)').matches,
    online: navigator.onLine,
    tool: activeTool.get(),
    pageMode: pageMode.get(),
    miniToolbar: miniToolbarOpen.get(),
    serviceWorker: sw?.controller ? 'controlled' : 'none',
    updateWaiting: updateWaiting(),
    lastUpdateCheck: lastCheckedAt()
      ? `${Math.round((Date.now() - (lastCheckedAt() ?? 0)) / 1000)}s ago`
      : 'never',
    gripFlag: document.documentElement.hasAttribute('data-grip-drag'),
    editableNow: document.querySelectorAll('[contenteditable="true"]').length,
    editableOff: document.querySelectorAll('[contenteditable="false"]').length,
    inkPad: describe(document.querySelector('[data-ink-pad]')),
  }
  return toolStateReport(toolState(), header)
}

function describe(el: Element | null): string {
  if (!el) return 'none'
  const h = el as HTMLElement
  const bits = [el.tagName.toLowerCase()]
  for (const a of ['data-ink-pad', 'contenteditable', 'inert']) {
    if (el.hasAttribute(a)) bits.push(`${a}=${el.getAttribute(a) || 'yes'}`)
  }
  if (h.style?.pointerEvents) bits.push(`pe=${h.style.pointerEvents}`)
  if (h.style?.touchAction) bits.push(`ta=${h.style.touchAction}`)
  return bits.join(' ')
}
