// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { installRealPen } from './realPen.ts'

/**
 * Re-test fixes C31 and C32 (switch textbox.v2 ON).
 * C31: touching or dragging the three-line tab moves the box; it never
 * changes its width or height. C32: every side and corner dot resizes in its
 * own direction, every time, with the Pencil, a finger and the mouse; none
 * gets stuck (let go and grab again, a selected box, after a scroll).
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const INPUTS = ['mouse', 'pen', 'finger'] as const
type Input = (typeof INPUTS)[number]
type Pt = { x: number; y: number }
const HOW = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
const rect = async (l: Locator) => (await l.boundingBox())!
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
const dot = (box: Locator, how: string) =>
  box.locator(`[data-resize-handle="${how}"]`)
/**
 * Where a finger presses a dot: the middle of its 44 pt target; the top dot's
 * target is partly under the tab, so there it is the ring itself (on the edge).
 */
const pressAt = (box: Locator, how: string) =>
  centre(
    how === 'n' ? dot(box, how).locator('[data-handle-dot]') : dot(box, how),
  )

async function start(page: Page, name: string) {
  await installRealPen(page)
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
  })
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

async function addBox(page: Page, lines: string[], keepFocus = false) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 90)
  const box = page.locator(EXTRA).nth(n)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  for (const [i, l] of lines.entries()) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  if (!keepFocus) {
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(900)
  }
  return box
}

/** One touch pointer event, sent to the element the finger first touched. */
const touchEvent = (page: Page, name: string, p: Pt, first = false) =>
  page.evaluate(
    ({ name, p, first }) => {
      const w = window as unknown as { __finger?: Element }
      if (first)
        w.__finger = document.elementFromPoint(p.x, p.y) ?? document.body
      w.__finger?.dispatchEvent(
        new PointerEvent(name, {
          pointerType: 'touch',
          pointerId: 21,
          isPrimary: true,
          clientX: p.x,
          clientY: p.y,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
          pressure: 0.5,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      )
    },
    { name, p, first },
  )

/**
 * One press-drag-lift with the named input. The mouse and the Pencil are the
 * browser's own pointer (the Pencil only relabelled); the finger is a touch
 * pointer sent to the element under it, as a real touch does.
 */
async function gesture(page: Page, input: Input, from: Pt, to: Pt, hold = 160) {
  const at = (i: number) => ({
    x: from.x + ((to.x - from.x) * i) / 8,
    y: from.y + ((to.y - from.y) * i) / 8,
  })
  if (input === 'finger') {
    await touchEvent(page, 'pointerdown', from, true)
    await page.waitForTimeout(hold)
    for (let i = 1; i <= 8; i++) {
      await touchEvent(page, 'pointermove', at(i))
      await page.waitForTimeout(16)
    }
    await touchEvent(page, 'pointerup', to)
    await page.waitForTimeout(500)
    return
  }
  const pen = input === 'pen'
  const setPen = (on: boolean) =>
    page.evaluate((on) => {
      ;(window as unknown as { __realPen?: boolean }).__realPen = on
    }, on)
  if (pen) await setPen(true)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(hold)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
  if (pen) await setPen(false)
  await page.waitForTimeout(500)
}

/** A box with 3 lines, narrowed so every dot has room, then selected. */
async function pickedBox(page: Page, name: string) {
  await start(page, name)
  const box = await addBox(page, ['Alpha beta', 'Gamma', 'Delta'])
  await pickBox(page, box)
  const e = await centre(dot(box, 'e'))
  await gesture(page, 'mouse', e, { x: e.x - 320, y: e.y })
  await expect(box).toHaveAttribute('data-picked', '')
  return box
}

const size = async (box: Locator) => {
  const r = await rect(box)
  return { w: r.width, h: r.height, x: r.x, y: r.y }
}
const same = (a: { w: number; h: number }, b: { w: number; h: number }) => {
  expect(Math.abs(a.w - b.w)).toBeLessThanOrEqual(1)
  expect(Math.abs(a.h - b.h)).toBeLessThanOrEqual(1)
}

for (const input of INPUTS) {
  test(`C31 ${input}: dragging the tab of a selected box moves it, the size stays`, async ({
    page,
  }) => {
    const box = await pickedBox(page, 'C31a' + input)
    const before = await size(box)
    const g = await centre(box.locator('[data-box-grip]'))
    await gesture(page, input, g, { x: g.x + 70, y: g.y + 50 })
    const after = await size(box)
    same(before, after)
    expect(
      Math.abs(after.x - before.x) + Math.abs(after.y - before.y),
    ).toBeGreaterThan(20)
  })

  test(`C31 ${input}: a tap or a small slip on the tab changes no size`, async ({
    page,
  }) => {
    const box = await pickedBox(page, 'C31b' + input)
    const before = await size(box)
    const g = await rect(box.locator('[data-box-grip]'))
    // The lower edge of the tab (where it meets the top dot's target) and its middle.
    for (const y of [g.y + g.height - 3, g.y + g.height / 2]) {
      const at = { x: g.x + g.width / 2, y }
      await gesture(page, input, at, { x: at.x + 3, y: at.y + 6 })
      same(before, await size(box))
    }
  })

  test(`C31 ${input}: while typing, touching or dragging where the tab is changes no size`, async ({
    page,
  }) => {
    await start(page, 'C31c' + input)
    const box = await addBox(page, ['Alpha beta', 'Gamma'], true)
    await page.keyboard.type(' more')
    const f = await rect(box)
    const before = await size(box)
    const mid = f.x + f.width / 2
    // The tab sits 20 to 64 px above the box; its lower part is also the top dot's target.
    for (const y of [f.y - 55, f.y - 40, f.y - 25, f.y - 8]) {
      await gesture(page, input, { x: mid, y }, { x: mid + 40, y: y - 40 })
      same(before, await size(box))
    }
  })
}

for (const input of INPUTS)
  for (const how of HOW) {
    test(`C32 ${input}: the ${how} dot resizes in its own direction, twice in a row`, async ({
      page,
    }) => {
      const box = await pickedBox(page, `C32${how}${input}`)
      // Round 1 drags the dot out, round 2 grabs it again and drags it back in
      // (the page edge may stop an outward drag, an inward one never is).
      for (const round of [1, 2]) {
        const sign = round === 1 ? 1 : -1.5
        const before = await size(box)
        const at = await pressAt(box, how)
        const dx = (how.includes('e') ? 50 : how.includes('w') ? -50 : 0) * sign
        const dy = (how.includes('s') ? 40 : how.includes('n') ? -40 : 0) * sign
        await gesture(page, input, at, { x: at.x + dx, y: at.y + dy })
        const after = await size(box)
        const msg = `${how} round ${round}`
        const out = round === 1
        const eE = after.x + after.w - (before.x + before.w)
        const eW = before.x - after.x
        const eS = after.y + after.h - (before.y + before.h)
        const eN = before.y - after.y
        if (how.includes('e'))
          expect(out ? eE : -eE, msg).toBeGreaterThan(out ? 30 : 10)
        if (how.includes('w'))
          expect(out ? eW : -eW, msg).toBeGreaterThan(out ? 30 : 10)
        if (how.includes('s'))
          expect(out ? eS : -eS, msg).toBeGreaterThan(out ? 25 : 8)
        if (how.includes('n'))
          expect(
            out
              ? eN > 25 || after.h > before.h + 25
              : eN < -8 || after.h < before.h - 8,
            msg,
          ).toBe(true)
        // A side dot never changes the other direction.
        if (!how.includes('e') && !how.includes('w'))
          expect(Math.abs(after.w - before.w), msg).toBeLessThanOrEqual(1)
        if (!how.includes('n') && !how.includes('s'))
          expect(Math.abs(after.h - before.h), msg).toBeLessThanOrEqual(1)
        await expect(box).toHaveAttribute('data-picked', '')
      }
    })
  }

for (const input of INPUTS) {
  test(`C32 ${input}: the middle dots still work after a scroll and after typing`, async ({
    page,
  }) => {
    const box = await pickedBox(page, 'C32scroll' + input)
    await page.locator('[data-page-scroller]').evaluate((s) => {
      s.scrollTop += 60
    })
    await page.waitForTimeout(300)
    for (const how of ['e', 's', 'w', 'n'] as const) {
      const before = await size(box)
      const at = await pressAt(box, how)
      const d = { e: [50, 0], w: [-50, 0], s: [0, 40], n: [0, -40] }[how]
      await gesture(page, input, at, { x: at.x + d[0], y: at.y + d[1] })
      const after = await size(box)
      expect(
        Math.abs(after.w - before.w) +
          Math.abs(after.h - before.h) +
          Math.abs(after.x - before.x) +
          Math.abs(after.y - before.y),
        how,
      ).toBeGreaterThan(25)
    }
    // Type in the box and leave it: it stays selected, the dots are there and work.
    const t = await rect(box)
    await page.mouse.click(t.x + 30, t.y + 10)
    await page.keyboard.type(' and more words')
    await page.waitForTimeout(500)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(600)
    await expect(box).toHaveAttribute('data-picked', '')
    await expect(dot(box, 'e')).toHaveCount(1)
    const before = await size(box)
    const at = await centre(dot(box, 'e'))
    await gesture(page, input, at, { x: at.x + 60, y: at.y })
    expect((await size(box)).w).toBeGreaterThan(before.w + 30)
  })
}

// C32: the edge follows the drag by the distance moved. It never jumps to the
// pointer (a press on the dot's target, 22 px outside the edge, used to move
// the edge 22 px at once), and a press that does not move changes nothing.
for (const input of INPUTS)
  for (const how of ['e', 'w', 's', 'n'] as const) {
    test(`C32 ${input}: the ${how} dot, press and no move changes nothing; 30 px moved changes it by 30`, async ({
      page,
    }) => {
      const box = await pickedBox(page, `C32d${how}${input}`)
      const at = await pressAt(box, how)
      const b0 = await size(box)
      await gesture(page, input, at, { x: at.x, y: at.y })
      const b1 = await size(box)
      expect(Math.abs(b1.w - b0.w) + Math.abs(b1.h - b0.h)).toBeLessThanOrEqual(
        1,
      )
      expect(Math.abs(b1.x - b0.x) + Math.abs(b1.y - b0.y)).toBeLessThanOrEqual(
        1,
      )
      const d = { e: [30, 0], w: [-30, 0], s: [0, 30], n: [0, -30] }[how]
      await gesture(page, input, at, { x: at.x + d[0], y: at.y + d[1] })
      const b2 = await size(box)
      const change = {
        e: b2.w - b1.w,
        w: b1.x - b2.x,
        s: b2.h - b1.h,
        // The top edge stops where the page flow puts the box; past that the box
        // keeps growing (spec TB-21), so the height is what follows the drag.
        n: b2.h - b1.h,
      }[how]
      expect(
        Math.abs(change - 30),
        `${how} changed by ${change}`,
      ).toBeLessThanOrEqual(3)
    })
  }
