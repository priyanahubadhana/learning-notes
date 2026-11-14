// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * A Pencil as real Safari sends it (P1.5, first look L11).
 *
 * The older specs build pen events in the page (`dispatchEvent`). Those are
 * not what an iPad sends, and they hid L11: a made-up event always goes to the
 * element we name, runs every listener in one go, and is never followed by
 * anything. A real Pencil press is sent by the browser:
 *  - it hovers first (pointermove, no button, pressure 0);
 *  - each event goes to whatever is under the tip AT THAT MOMENT, so when a
 *    menu closes at the press, the rest of the press lands on the page behind;
 *  - the page's own updates run between two listeners of the same event;
 *  - the browser adds the click itself.
 * This helper drives the browser's own pointer (Playwright's mouse, which is
 * trusted input on Chromium and on WebKit) and only relabels it as a pen while
 * `realPen` runs, so the app sees `pointerType: 'pen'` on real browser events.
 */
export async function installRealPen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __realPen?: boolean }
    const type = Object.getOwnPropertyDescriptor(
      PointerEvent.prototype,
      'pointerType',
    )
    const pressure = Object.getOwnPropertyDescriptor(
      PointerEvent.prototype,
      'pressure',
    )
    if (!type?.get || !pressure?.get) return
    const typeOf = type.get
    const pressureOf = pressure.get
    const isPen = (e: PointerEvent) =>
      !!w.__realPen &&
      e.isTrusted &&
      // Safari reports the click that follows a Pencil tap as a mouse click.
      e.type !== 'click' &&
      typeOf.call(e) === 'mouse'
    Object.defineProperty(PointerEvent.prototype, 'pointerType', {
      configurable: true,
      get(this: PointerEvent) {
        return isPen(this) ? 'pen' : typeOf.call(this)
      },
    })
    Object.defineProperty(PointerEvent.prototype, 'pressure', {
      configurable: true,
      get(this: PointerEvent) {
        if (!isPen(this)) return pressureOf.call(this)
        return this.buttons ? 0.08 : 0
      },
    })
  })
}

export type Pt = { x: number; y: number }

/**
 * One Pencil press along `path`: hover in, touch down at the first point, move
 * through the others, lift at the last. One point = a tap.
 */
export async function realPen(page: Page, path: Pt[]): Promise<void> {
  const [first, ...rest] = path
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  // The hover a Pencil sends before it touches (no button, pressure 0).
  await page.mouse.move(first.x - 3, first.y - 6)
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  for (const p of rest) await page.mouse.move(p.x, p.y, { steps: 4 })
  await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}
