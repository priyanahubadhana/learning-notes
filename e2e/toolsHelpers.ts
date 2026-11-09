// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { line, type Pt } from './inkHelpers.ts'

/** Shared steps for the tools-robustness specs (the input machine, health, refresh). */

type Tools = {
  toolState: () => Record<string, Record<string, unknown>>
  machine: { state: () => string; abort: (r: string) => void }
  [more: string]: unknown
}
declare global {
  interface Window {
    __lnTools?: Tools
  }
}

/** The input machine's state: 'idle' when no pointer is believed down. */
export const machineState = (page: Page) =>
  page.evaluate(() => window.__lnTools!.machine.state())

/** One section of the tool-state dump. */
export const section = (page: Page, name: string) =>
  page.evaluate((n) => window.__lnTools!.toolState()[n] ?? {}, name)

/** A loop of small steps around the corners of a box (a hand does not jump). */
export function loopAround(
  b: { x: number; y: number; width: number; height: number },
  side = 14,
): Pt[] {
  const c: Pt[] = [
    [b.x - side, b.y + b.height + 10],
    [b.x - side, b.y - 8],
    [b.x + b.width + side, b.y - 8],
    [b.x + b.width + side, b.y + b.height + 10],
    [b.x - side + 2, b.y + b.height + 8],
  ]
  return c.slice(1).flatMap((p, i) => line(c[i], p, 10))
}

/** Pretends the app went to the background (or came back). */
export async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => s,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}

/** An app switch: hidden, then visible and pageshow. `cancel` sends pointercancel first. */
export async function appSwitch(page: Page, cancel?: number) {
  await setVisibility(page, 'hidden')
  if (cancel !== undefined) {
    await page.evaluate((id) => {
      document.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: id,
          bubbles: true,
          pointerType: 'pen',
        }),
      )
    }, cancel)
  }
  await page.waitForTimeout(60)
  await setVisibility(page, 'visible')
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await page.waitForTimeout(60)
}
