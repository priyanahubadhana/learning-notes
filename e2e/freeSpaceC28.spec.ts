// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addBox,
  centre,
  drag,
  EXTRA,
  narrowBox,
  pick,
  rect,
  start,
} from './cBoxesHelpers.ts'
import { installRealPen, realPenDrag } from './realPen.ts'

/**
 * C28 (owner, 17 Nov 2026, switch textbox.v2 ON): "there is visual space
 * available, but it does not allow me to paste and adjust a box there." Free
 * paper where no box is (beside a box, under the first box) takes a box moved
 * by its tab, and a pasted box, at the place it is dropped or pasted. Past
 * rule C21 (a box moves into any free space it fits in) and TB-15 (a box on
 * blank paper stays where it was put).
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const onSheet = async (box: Locator) => {
  const r = await rect(box)
  const s = await rect(box.page().locator('[data-paper-sheet="1"]'))
  return { ...r, x: r.x - s.x, y: r.y - s.y }
}

/** The first box "Main text" and three boxes narrowed to the right, stacked. */
async function rightColumn(page: Page, name: string) {
  await start(page, name)
  const boxes: Locator[] = []
  for (const [i, n] of ['R1', 'R2', 'R3'].entries()) {
    const b = await addBox(page, [n + ' a', n + ' b'], 0.62, 60 + i * 20)
    await narrowBox(page, b, 'w', 420)
    boxes.push(b)
  }
  return boxes
}

type How = 'pen' | 'mouse'
async function move(
  page: Page,
  how: How,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (how === 'pen') {
    const path = [from]
    for (let i = 1; i <= 12; i++)
      path.push({
        x: from.x + ((to.x - from.x) * i) / 12,
        y: from.y + ((to.y - from.y) * i) / 12,
      })
    await realPenDrag(page, path)
  } else await drag(page, from, to)
  await page.waitForTimeout(900)
}

for (const how of ['pen', 'mouse'] as const) {
  test.describe(how, () => {
    test.beforeEach(async ({ page }) => {
      if (how === 'pen') await installRealPen(page)
    })

    test(`C28 ${how}: a box dragged to the free space beside the top right box lands there, the first box stays`, async ({
      page,
    }) => {
      const [r1, r2] = await rightColumn(page, 'C28a' + how)
      const main0 = await rect(page.locator('[data-paper-box="main"]'))
      const top = await onSheet(r1)
      await pick(page, r2)
      const g = await centre(r2.locator('[data-box-grip]'))
      const m = await onSheet(r2)
      // To the left of the right column, top level with the top right box.
      await move(page, how, g, {
        x: g.x - (m.x - 180),
        y: g.y - (m.y - top.y),
      })
      const now = await onSheet(r2)
      const main1 = await rect(page.locator('[data-paper-box="main"]'))
      expect(now.x + now.width).toBeLessThan(top.x + 2)
      expect(Math.abs(now.y - top.y)).toBeLessThan(70)
      // The right column was not pushed down, the box kept its width.
      expect(Math.abs((await onSheet(r1)).y - top.y)).toBeLessThan(2)
      expect(Math.abs(now.width - m.width)).toBeLessThan(2)
      // The first box neither moved nor got narrower.
      expect(Math.abs(main1.x - main0.x)).toBeLessThan(2)
      expect(Math.abs(main1.width - main0.width)).toBeLessThan(2)
    })

    test(`C28 ${how}: a box dragged to just under the first box lands in the free space, the first box stays`, async ({
      page,
    }) => {
      const [, , r3] = await rightColumn(page, 'C28b' + how)
      const main0 = await rect(page.locator('[data-paper-box="main"]'))
      await pick(page, r3)
      const g = await centre(r3.locator('[data-box-grip]'))
      const m = await rect(r3)
      // The tab sits ~44 px above the box: put the box just under "Main text".
      await move(page, how, g, {
        x: m.x > 0 ? main0.x + 120 : g.x,
        y: main0.y + main0.height + 6,
      })
      const now = await rect(r3)
      expect(Math.abs(now.width - m.width)).toBeLessThan(2)
      const main1 = await rect(page.locator('[data-paper-box="main"]'))
      expect(now.x).toBeLessThan(main0.x + 400)
      expect(now.y).toBeLessThan(main0.y + main0.height + 120)
      expect(now.y).toBeGreaterThan(main0.y + main0.height - 10)
      expect(Math.abs(main1.x - main0.x)).toBeLessThan(2)
      expect(Math.abs(main1.width - main0.width)).toBeLessThan(2)
    })
  })
}

const GEMINI =
  '<message-content><div class="markdown"><h2>Agents explained</h2>' +
  '<p><b>Goal:</b> understand agents</p></div></message-content>'

for (const how of ['pen', 'mouse'] as const) {
  test(`C28 ${how}: a box pasted in the free space beside a box lands at the paste spot`, async ({
    page,
  }) => {
    if (how === 'pen') await installRealPen(page)
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
    )
    const [r1, r2, r3] = await rightColumn(page, 'C28p' + how)
    const t1 = await rect(r1)
    const m0 = await rect(page.locator('[data-paper-box="main"]'))
    // A tap in the free paper left of the right column puts the caret there.
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    const tapX = sheet.x + 120
    const tapY = t1.y + 20
    if (how === 'pen')
      await realPenDrag(page, [
        { x: tapX, y: tapY },
        { x: tapX, y: tapY },
      ])
    else await page.mouse.click(tapX, tapY)
    await page.waitForTimeout(500)
    const n0 = await page.locator(EXTRA).count()
    expect(n0).toBe(4)
    const fresh = page.locator(EXTRA).nth(3)
    await expect(fresh.locator('.bn-editor')).toBeFocused()
    const f0 = await rect(fresh)
    // The empty box the tap made is the layout the paste lands in.
    const before = await Promise.all([r1, r2, r3].map(rect))
    await page.evaluate((html) => {
      const data = new DataTransfer()
      data.setData('text/html', html)
      data.setData('text/plain', 'Agents explained\nGoal: understand agents')
      document.activeElement!.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    }, GEMINI)
    const chooser = page.getByRole('dialog', { name: 'Paste as' })
    await chooser.getByRole('option', { name: /As text box/ }).click()
    await page.waitForTimeout(900)
    const pasted = page
      .locator(EXTRA)
      .filter({ hasText: 'Agents explained' })
      .first()
    await expect(pasted).toBeVisible()
    const p = await rect(pasted)
    // At the paste spot (left of the column), not under everything.
    expect(p.x).toBeLessThan(t1.x - 20)
    expect(Math.abs(p.y - f0.y)).toBeLessThan(120)
    expect(p.x + p.width).toBeLessThan(t1.x + 2)
    // The first box and the right column stay where they were.
    const m1 = await rect(page.locator('[data-paper-box="main"]'))
    expect(Math.abs(m1.y - m0.y) + Math.abs(m1.x - m0.x)).toBeLessThan(2)
    for (const [i, b] of [r1, r2, r3].entries()) {
      const a = await rect(b)
      expect(Math.abs(a.y - before[i].y)).toBeLessThan(2)
      expect(Math.abs(a.x - before[i].x)).toBeLessThan(2)
    }
  })
}
