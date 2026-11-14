// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * WebKit never lets a page read the system clipboard (no permission to grant),
 * so a Copy check there reads what the app handed to the clipboard instead:
 * the text given to `clipboard.writeText` / `clipboard.write`, or put on the
 * clipboard by a Copy event (Ctrl+C). Call before the page loads. The Chrome
 * checks keep reading the real clipboard.
 */
export async function spyClipboard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied?: string }
    w.__copied = ''
    const clip = navigator.clipboard
    if (clip) {
      const writeText = clip.writeText?.bind(clip)
      clip.writeText = async (text: string) => {
        w.__copied = text
        return writeText?.(text).catch(() => {})
      }
      const write = clip.write?.bind(clip)
      clip.write = async (items) => {
        for (const item of items) {
          if (item.types.includes('text/plain'))
            w.__copied = await (await item.getType('text/plain')).text()
        }
        return write?.(items).catch(() => {})
      }
    }
    // A Copy event (Ctrl+C, or the old copy command with our own data): the
    // text the app puts in the event's data is what is copied.
    const setData = DataTransfer.prototype.setData
    DataTransfer.prototype.setData = function (type: string, value: string) {
      if (type === 'text/plain' && value) w.__copied = value
      return setData.call(this, type, value)
    }
    // The browser's own copy of a selection has no setData call: last, take the selection.
    window.addEventListener('copy', (e) => {
      if (e.clipboardData?.getData('text/plain')) return
      const text = document.getSelection()?.toString() ?? ''
      if (text) w.__copied = text
    })
  })
}

/** What the app last copied (see spyClipboard). */
export const copiedText = (page: Page): Promise<string> =>
  page.evaluate(
    () => (window as unknown as { __copied?: string }).__copied ?? '',
  )
