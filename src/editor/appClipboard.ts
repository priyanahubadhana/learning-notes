import { detectDeviceMode } from '../app/deviceMode'
import { onCopyOrCut } from '../app/input/copyWatch'
import { onRouted } from '../app/input/eventRouter'
import { memStore } from '../app/tools/store'
import { t } from '../i18n/t'
import { deviceModeSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'
import type { PasteData } from './pasteFlow'

/**
 * One way to read what Paste pastes (C0-4, C0-5, C0-6; owner choice A, 20 Nov
 * 2026).
 *
 * 1. Copies made inside the app (our Copy and Cut, and normal copy events in
 *    the page) are also kept here, in memory only: never saved, never logged.
 *    The rule that keeps it safe: an in-app copy is used only while the app
 *    has stayed in front since that copy. The moment the window loses focus,
 *    the tab is hidden or the page is left (the only ways another app can
 *    copy something), the memory is dropped and Paste reads the system
 *    clipboard again. So the system clipboard cannot have changed behind it.
 * 2. Copies from other apps go through the system read. Safari on the iPad
 *    asks first with its own black "Paste" bubble and waits for a tap, so
 *    while the read waits we show a short line ("asking") next to the button.
 */

let mine: { html: string; text: string } | null = null

/** Keeps what the app just put on the clipboard (memory only). */
export function rememberAppCopy(html: string, text: string): void {
  mine = html || text ? { html, text } : null
}

/** The clipboard now holds something we did not keep (a picture): drop ours. */
export function forgetAppCopy(): void {
  mine = null
}

if (typeof document !== 'undefined') {
  // Another app can only copy while ours is not in front: drop ours then.
  onRouted('background', () => forgetAppCopy())
  // A normal copy or cut in the page (the editor, a text field).
  onCopyOrCut((e) => {
    const d = e.clipboardData
    const html = d?.getData('text/html') ?? ''
    let text = d?.getData('text/plain') ?? ''
    if (!html && !text) text = window.getSelection()?.toString() ?? ''
    rememberAppCopy(html, text)
  })
}

/** Waiting for the system read: the hint line shows next to this button. */
export const clipboardAsk = memStore<{
  phase: 'idle' | 'asking'
  anchor: Element | null
}>({ phase: 'idle', anchor: null })

/** A read that is quick (a granted browser) never shows the line. */
const ASK_AFTER_MS = 300

async function readSystem(): Promise<PasteData | null> {
  let refused = false
  try {
    const items = (await navigator.clipboard.read?.()) ?? []
    let html = ''
    let text = ''
    for (const item of items) {
      if (!html && item.types.includes('text/html'))
        html = await (await item.getType('text/html')).text()
      if (!text && item.types.includes('text/plain'))
        text = await (await item.getType('text/plain')).text()
    }
    if (html || text) return { html, text, own: false }
  } catch (e) {
    // A refusal is final: asking again would only show Safari's bubble twice.
    refused = (e as { name?: string } | null)?.name === 'NotAllowedError'
  }
  if (refused) return null
  try {
    const text = await navigator.clipboard.readText()
    return text ? { html: '', text, own: false } : null
  } catch {
    return null
  }
}

/**
 * What Paste pastes: the app's own copy, else the system clipboard. Null when
 * it is empty or the browser refused. `anchor` is the button that was tapped.
 */
export async function readClipboardData(
  anchor?: Element | null,
): Promise<PasteData | null> {
  if (mine) return { html: mine.html, text: mine.text, own: false }
  const timer = window.setTimeout(
    () => clipboardAsk.set({ phase: 'asking', anchor: anchor ?? null }),
    ASK_AFTER_MS,
  )
  try {
    return await readSystem()
  } finally {
    window.clearTimeout(timer)
    if (clipboardAsk.get().phase !== 'idle')
      clipboardAsk.set({ phase: 'idle', anchor: null })
  }
}

/**
 * A computer with a keyboard: only there may a message name a shortcut. Both
 * the device mode chosen in Settings and the device itself must say computer,
 * so an iPad (even one set to Computer) never hears of a keyboard.
 */
const hasKeyboard = () =>
  readDeviceSetting(deviceModeSetting) === 'computer' &&
  detectDeviceMode() === 'computer'

/** "Not pasted": on an iPad the steps to take, on a computer the shortcut. */
export const pasteRefusedMessage = (): string =>
  t(hasKeyboard() ? 'paste.blocked' : 'paste.refused')

/** The box bar's and the menu's version of the same refusal. */
export const pasteFailedMessage = (): string =>
  t(hasKeyboard() ? 'onebar.paste.failed' : 'paste.refused')
