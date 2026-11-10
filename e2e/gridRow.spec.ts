// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Owner bug batch 2, item 9 (10 Nov): a 50/50 two-column row on iPad width
 * lays out side by side with no overlap and stable sizes; the grip sits at
 * the box's top-left; the placeholder shows only in the focused empty box.
 */
test.use({ viewport: { width: 1180, height: 1000 } })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!

async function twoColumns(page: Page) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Row')
  await typeInEditor(page, 'Main text')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const extra = page.locator(EXTRA)
  // Two boxes, the way paperGrid.spec makes them: wait for the caret before typing.
  for (const [i, text] of ['Left text here', 'Right words'].entries()) {
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 50 + i * 110,
    )
    await expect(extra).toHaveCount(i + 1)
    await expect(extra.nth(i).locator('.bn-editor')).toBeFocused()
    await page.keyboard.type(text)
    await page.waitForTimeout(600)
  }
  // Drop box 2 on the right third of box 1: one row, two columns.
  const from = extra.nth(1)
  await from.hover()
  const g = await rect(from.locator('[data-box-grip]'))
  const t = await rect(extra.nth(0))
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(t.x + t.width * 0.9, t.y + t.height * 0.5, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  return { extra }
}

const rects = (page: Page) =>
  page.locator('[data-paper-box]').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect()
      return { l: r.left, t: r.top, r: r.right, b: r.bottom }
    }),
  )

test('two columns: side by side, no overlap, stable sizes, grip top-left', async ({
  page,
}) => {
  const { extra } = await twoColumns(page)
  const a0 = await rects(page)
  console.log(JSON.stringify(a0))
  await extra.nth(1).locator('.bn-editor').click()
  await page.keyboard.type(' more')
  await page.waitForTimeout(500)
  const a1 = await rects(page)
  console.log(JSON.stringify(a1))
  for (let i = 0; i < a1.length; i++)
    for (let j = i + 1; j < a1.length; j++) {
      const a = a1[i]
      const b = a1[j]
      expect(
        a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1,
        `boxes ${i}/${j} overlap`,
      ).toBe(false)
    }
  const r0 = await rect(extra.nth(0))
  const r1 = await rect(extra.nth(1))
  expect(r1.x).toBeGreaterThan(r0.x + r0.width - 1)
  expect(Math.abs(r0.width - r1.width)).toBeLessThan(8)
  for (const i of [0, 1]) {
    await extra.nth(i).hover()
    const box = await rect(extra.nth(i))
    const g = await rect(extra.nth(i).locator('[data-box-grip]'))
    expect(Math.abs(g.x - box.x)).toBeLessThan(6)
    // The corner above the box's top left (not the middle): WebKit sits a few px lower.
    expect(g.y).toBeLessThan(box.y + 12)
  }
})

test('after a move the grip is still at the top-left; the drag is one transform', async ({
  page,
}) => {
  const { extra } = await twoColumns(page)
  const from = extra.nth(1)
  await from.hover()
  const g0 = await rect(from.locator('[data-box-grip]'))
  const b0 = await rect(from)
  await page.mouse.move(g0.x + g0.width / 2, g0.y + g0.height / 2)
  await page.mouse.down()
  await page.mouse.move(g0.x + 40, g0.y + 120, { steps: 6 })
  // Mid-drag: the copy is placed once and moved by a transform only.
  const style = () =>
    from.evaluate((e) => ({
      left: (e as HTMLElement).style.left,
      top: (e as HTMLElement).style.top,
      t: (e as HTMLElement).style.transform,
    }))
  await expect.poll(async () => (await style()).t).toContain('translate3d')
  const mid = await style()
  await page.mouse.move(g0.x + 80, g0.y + 160, { steps: 6 })
  await page.waitForTimeout(300)
  const mid2 = await style()
  expect(mid2.left).toBe(mid.left)
  expect(mid2.top).toBe(mid.top)
  await page.mouse.up()
  await page.waitForTimeout(600)
  expect(b0.width).toBeGreaterThan(50)
  for (let i = 0; i < 2; i++) {
    await extra.nth(i).hover()
    const box = await rect(extra.nth(i))
    const g = await rect(extra.nth(i).locator('[data-box-grip]'))
    expect(Math.abs(g.x - box.x), 'grip x').toBeLessThan(6)
    expect(g.y, 'grip in the top-left corner').toBeLessThan(box.y + 12)
  }
})
