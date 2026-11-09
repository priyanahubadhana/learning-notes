// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { line, type Pt } from './inkHelpers.ts'

/** Shared steps for the tools-robustness specs (the input machine, health, refresh). */

type Tools = {
  toolState: () => Record<string, Record<string, unknown>>
  machine: { state: () => string; abort: (r: string) => void }
  setLasso: (patch: Record<string, unknown>) => Promise<void>
  health: (reason?: string) => string[]
  [more: string]: unknown
}
declare global {
  interface Window {
    __lnTools?: Tools
  }
}

/** The tools hooks load when the browser is idle after start: wait for them. */
export const toolsReady = (page: Page) =>
  page.waitForFunction(() => !!window.__lnTools?.health, null, {
    timeout: 20_000,
  })

/** The input machine's state: 'idle' when no pointer is believed down. */
export const machineState = async (page: Page) => {
  await toolsReady(page)
  return page.evaluate(() => window.__lnTools!.machine.state())
}

/** One section of the tool-state dump. */
export const section = async (page: Page, name: string) => {
  await toolsReady(page)
  return page.evaluate((n) => window.__lnTools!.toolState()[n] ?? {}, name)
}

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
