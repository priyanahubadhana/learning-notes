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

/** One tap of a run: how long the tip stays down, the pause before it, its drift (ms, px). */
export type PenTap = { hold: number; gap?: number; drift?: number }

/** Waits until `t` on this process's clock (the last 20 ms without a timer: Windows timers are 15 ms coarse). */
async function until(t: number): Promise<void> {
  const far = t - performance.now() - 20
  if (far > 0) await new Promise((done) => setTimeout(done, far))
  while (performance.now() < t) await new Promise((done) => setImmediate(done))
}

/**
 * A run of Pencil taps at one spot with a hand's own timing (C14).
 *
 * Why: the taps used to be driven call by call (hover, hover, down, up), and
 * each call waits for the browser's answer. WebKit answers a hover move only
 * after its next repaint, which took 150-260 ms whenever the page had just
 * changed (a caret, a selection): measured 16 Nov, the page's own listeners
 * ran 1-13 ms. Taps asked 90 ms apart reached the page 290-580 ms apart, so
 * a double or triple tap sometimes fell outside the app's 500 ms. A Pencil
 * does not wait for a repaint between two taps.
 *
 * Here the tip hovers in once, before the run. Every down and up is then
 * sent at its own time on one clock, counted from the run's first down; the
 * drift while the tip is down and the way back between two taps are sent
 * alongside, so their answers never hold a down or an up back.
 */
export async function realPenTaps(
  page: Page,
  at: Pt,
  taps: PenTap[],
): Promise<void> {
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  // The hover a Pencil sends before it touches (no button, pressure 0).
  await page.mouse.move(at.x - 3, at.y - 6)
  await page.mouse.move(at.x, at.y)
  let back: Promise<void> = Promise.resolve()
  let next = performance.now()
  for (const tap of taps) {
    // The pause before this tap, counted from when the last lift was sent.
    await Promise.all([until(next + (tap.gap ?? 0)), back])
    const down = performance.now()
    await page.mouse.down()
    const drift = tap.drift
      ? page.mouse.move(at.x + tap.drift * 0.6, at.y + tap.drift * 0.8)
      : Promise.resolve()
    await Promise.all([until(down + tap.hold), drift])
    next = performance.now()
    await page.mouse.up()
    back = tap.drift ? page.mouse.move(at.x, at.y) : Promise.resolve()
  }
  await back
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}
