// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'

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
export async function realPen(
  page: Page,
  path: Pt[],
  /** Moves sent between two points; fewer = a quicker stroke (WebKit answers each move only after a repaint). */
  steps = 4,
): Promise<void> {
  const [first, ...rest] = path
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  // The hover a Pencil sends before it touches (no button, pressure 0).
  await page.mouse.move(first.x - 3, first.y - 6)
  await page.mouse.move(first.x, first.y)
  if (rest.length === 0) {
    // A tap: the lift goes with the press. Why (CI run 46092819007, F3 pen):
    // WebKit answers a press only after its next repaint, so an awaited
    // press sent the lift 315 ms later and the page stamped a hold (over the
    // 300 ms of tapSelect.ts), not a tap. Probed 28 Nov with a page busy
    // 350 ms on the press: awaited, the stamps were 371 ms apart; sent
    // together, 1 ms apart, the press still first (chromium alike).
    await Promise.all([page.mouse.down(), page.mouse.up()])
  } else {
    await page.mouse.down()
    for (const p of rest) await page.mouse.move(p.x, p.y, { steps })
    await page.mouse.up()
  }
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

/**
 * One tap of a run: how long the tip stays down, the pause before it, its
 * drift while down (ms, px), and how far off the run's spot it lands (px;
 * a hand's second tap is seldom on the first, C19).
 */
export type PenTap = {
  hold: number
  gap?: number
  drift?: number
  dx?: number
  dy?: number
}

/** Waits until `t` on this process's clock (the last 20 ms without a timer: Windows timers are 15 ms coarse). */
async function until(t: number): Promise<void> {
  const far = t - performance.now() - 20
  if (far > 0) await new Promise((done) => setTimeout(done, far))
  while (performance.now() < t) await new Promise((done) => setImmediate(done))
}

/**
 * When one press or lift was really sent by the driver (ms on its clock),
 * against when it was planned. `sent - planned` is the driver's own lateness
 * (a test fault if it is more than a few ms); what the page then stamps on
 * top of that is the machine.
 */
export type PenSent = { what: 'down' | 'up'; planned: number; sent: number }

/** The worst the driver was behind its own plan, in ms. */
export const driverLate = (log: PenSent[]) =>
  Math.round(Math.max(0, ...log.map((e) => e.sent - e.planned)))

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
 * alongside, so their answers never hold a down or an up back. `lead` (ms)
 * is how much earlier each lift and each next down is sent: the browser
 * makes the event a little after it is sent, and the caller knows how much
 * from the time stamps of the runs before.
 */
export async function realPenTaps(
  page: Page,
  at: Pt,
  taps: PenTap[],
  lead: { hold: number; gap: number } = { hold: 0, gap: 0 },
): Promise<PenSent[]> {
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  // The hover a Pencil sends before it touches (no button, pressure 0).
  await page.mouse.move(at.x - 3, at.y - 6)
  await page.mouse.move(at.x, at.y)
  // Chromium: every down, move and up carries its own time (the browser's
  // event time stamp is exactly what is asked, however late the machine
  // delivers it; probed 19 Nov: stamps 500 and 2000 ms apart arrived as asked).
  // WebKit has no such channel: there the old sending-early way stays.
  const cdp = await controlledStamps(page)
  const epoch = Date.now() / 1000
  const clock0 = performance.now()
  const stamp = (t: number) => epoch + (t - clock0) / 1000
  const send = (
    type: 'mousePressed' | 'mouseMoved' | 'mouseReleased',
    p: Pt,
    t: number,
    buttons: number,
  ) =>
    cdp!.send('Input.dispatchMouseEvent', {
      type,
      x: p.x,
      y: p.y,
      button: type === 'mouseMoved' ? 'none' : 'left',
      buttons,
      clickCount: type === 'mouseMoved' ? 0 : 1,
      pointerType: 'pen',
      timestamp: stamp(t),
    })
  // When each press and lift was really sent, against the time planned for it.
  const sentLog: PenSent[] = []
  const log = (what: PenSent['what'], planned: number) =>
    sentLog.push({ what, planned, sent: performance.now() })
  let back: Promise<unknown> = Promise.resolve()
  const answers: Promise<unknown>[] = []
  const moves = (p: Promise<unknown>) => {
    answers.push(p)
    return p
  }
  let next = performance.now()
  let plan = next
  let tip = at
  for (const tap of taps) {
    // Where this tap lands: the hover there goes alongside the pause.
    const spot = { x: at.x + (tap.dx ?? 0), y: at.y + (tap.dy ?? 0) }
    if (spot.x !== tip.x || spot.y !== tip.y) {
      // WebKit: sent at once, in order behind the way back; its answer
      // (a repaint away, 500 ms on a busy runner) is awaited at the end.
      back = cdp
        ? back.then(() => page.mouse.move(spot.x, spot.y))
        : moves(page.mouse.move(spot.x, spot.y))
      tip = spot
    }
    if (cdp) {
      // The asked times, counted from the run's first tap.
      const planDown = plan + (tap.gap ?? 0)
      const planUp = planDown + tap.hold
      await Promise.all([until(planDown), back])
      log('down', planDown)
      await send('mousePressed', spot, planDown, 1)
      const drift = tap.drift
        ? send(
            'mouseMoved',
            { x: spot.x + tap.drift * 0.6, y: spot.y + tap.drift * 0.8 },
            planDown + tap.hold / 2,
            1,
          )
        : Promise.resolve()
      await Promise.all([until(planUp), drift])
      log('up', planUp)
      await send('mouseReleased', spot, planUp, 0)
      plan = planUp
      back = Promise.resolve()
      continue
    }
    // The pause before this tap, counted from when the last lift was sent.
    // WebKit answers a move only at its next repaint (500 ms on a busy
    // runner): a press is never held back for that answer.
    const planDown = next + Math.max(0, (tap.gap ?? 0) - lead.gap)
    await until(planDown)
    const down = performance.now()
    log('down', planDown)
    await page.mouse.down()
    const drift = tap.drift
      ? page.mouse.move(spot.x + tap.drift * 0.6, spot.y + tap.drift * 0.8)
      : Promise.resolve()
    const planUp = down + Math.max(0, tap.hold - lead.hold)
    await Promise.all([until(planUp), drift])
    next = performance.now()
    log('up', planUp)
    await page.mouse.up()
    if (tap.drift) back = moves(page.mouse.move(spot.x, spot.y))
  }
  await Promise.all([back, ...answers])
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
  return sentLog
}

/** A browser channel that takes an event time (Chromium's), or null (WebKit). */
async function controlledStamps(page: Page) {
  try {
    return await page.context().newCDPSession(page)
  } catch {
    return null
  }
}

/**
 * A Pencil drag as an iPad sends it (C21): the tip hovers in (moves with no
 * button, pressure 0), touches down, rests `hold` ms (the 120 ms lift of a box
 * or a dot), then moves along `path` one point at a time and lifts at the
 * last. `step` runs after each move with its index (a test reads the page
 * there). With `lift: false` the tip stays down at the end.
 */
export async function realPenDrag(
  page: Page,
  path: Pt[],
  o: {
    hold?: number
    step?: (i: number) => Promise<void>
    lift?: boolean
  } = {},
): Promise<void> {
  const [first, ...rest] = path
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  await page.mouse.move(first.x - 12, first.y - 16)
  await page.mouse.move(first.x - 4, first.y - 6, { steps: 3 })
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  await page.waitForTimeout(o.hold ?? 180)
  for (const [i, p] of rest.entries()) {
    await page.mouse.move(p.x, p.y)
    if (o.step) await o.step(i)
  }
  if (o.lift !== false) await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

/** The Pencil hovering along `path` without touching (pointermove, no button). */
export async function realPenHover(page: Page, path: Pt[]): Promise<void> {
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  for (const p of path) await page.mouse.move(p.x, p.y, { steps: 2 })
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

/**
 * One Pencil tap at the caret spot of a box's first line (the left end of the
 * line's own box, where the caret stands), once the tap window has passed.
 *
 * Why (found 19 Nov by logging the page's own state at the tap, 4 of 60
 * tries at 4 workers): the spec had just clicked at the same screen spot on
 * the page before (the "Old words" line), 0.85-1.0 s earlier by the events'
 * time stamps. Inside the 1 s window and near that spot a tap is the SECOND
 * tap of a run (a word select, which on an empty line does nothing), so no
 * caret came: no event was lost and the app followed its rule. The pen goes
 * down after the window, and the line is measured then (the page was still
 * settling: the line moved 11 px after the spec had measured it).
 */
export async function penCaretInFirstBox(
  page: Page,
  main: Locator,
): Promise<void> {
  await page.waitForTimeout(1100)
  const r = (await main.locator('.bn-inline-content').first().boundingBox())!
  await realPen(page, [{ x: r.x + 4, y: r.y + r.height / 2 }])
  await expect(main.locator('.bn-editor')).toBeFocused()
}
