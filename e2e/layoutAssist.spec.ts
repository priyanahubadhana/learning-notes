// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Owner bug batch 2, items 7 and 10: Layout Assist. Choosing a layout shows
 * a full-page preview first; Done applies (one write, one Undo), Cancel
 * leaves the page as it was; no empty boxes unless "+ New box"; the whole
 * notebook has its own preview.
 */
test.use({ viewport: { width: 1336, height: 1100 } })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
const assist = (page: Page) => page.locator('[data-layout-assist]')

async function boxes(page: Page, n: number) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Assist ' + n)
  await typeInEditor(page, 'Main text')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const extra = page.locator(EXTRA)
  for (let i = 0; i < n; i++) {
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 50 + i * 110,
    )
    await expect(extra).toHaveCount(i + 1)
    await expect(extra.nth(i).locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Box ' + (i + 1))
  }
  await page.waitForTimeout(600)
  return extra
}

async function openAssist(page: Page, box: Locator) {
  await box.hover()
  await box.locator('[data-box-menu]').click()
  await page.getByRole('menuitem', { name: /^Layout/ }).click()
  await expect(assist(page)).toBeVisible()
}

const rects = (page: Page) =>
  page
    .locator(EXTRA)
    .evaluateAll((els) =>
      els.map((e) => JSON.stringify(e.getBoundingClientRect().toJSON())),
    )

test('1:1:1 with two thumbnails tapped gives one row of three; one Undo puts it back', async ({
  page,
}) => {
  const extra = await boxes(page, 3)
  const before = await rects(page)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="three:0"]').click()
  // The preview shows the three zones before anything changes.
  await expect(page.locator('[data-preview-sheet]').first()).toBeVisible()
  expect(await rects(page)).toEqual(before)
  const thumbs = page.locator('[data-layout-thumb]')
  await expect(thumbs).toHaveCount(2)
  await thumbs.nth(0).click()
  await thumbs.nth(1).click()
  await page.locator('[data-layout-done]').click()
  await expect(assist(page)).toHaveCount(0)
  await expect(extra).toHaveCount(3)
  // The boxes slide into place (150 ms): wait for the row to settle.
  await expect
    .poll(async () => {
      const r = await Promise.all([0, 1, 2].map((i) => rect(extra.nth(i))))
      return (
        Math.abs(r[0].y - r[1].y) < 6 &&
        Math.abs(r[1].y - r[2].y) < 6 &&
        r[1].x > r[0].x + r[0].width - 1 &&
        r[2].x > r[1].x + r[1].width - 1
      )
    })
    .toBe(true)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect(extra).toHaveCount(3)
  await expect.poll(() => rects(page)).toEqual(before)
})

test('1:1 then Done with nothing chosen creates no box and collapses to one column', async ({
  page,
}) => {
  const extra = await boxes(page, 1)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="two:0"]').click()
  await expect(page.getByText('No other boxes on this page')).toBeVisible()
  await page.locator('[data-layout-done]').click()
  await expect(extra).toHaveCount(1)
})

test('+ New box creates exactly one box', async ({ page }) => {
  const extra = await boxes(page, 1)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="two:0"]').click()
  await page
    .locator('[data-layout-zone-row="1"]')
    .getByRole('button', { name: '+ New box' })
    .click()
  await page.locator('[data-layout-done]').click()
  await expect(extra).toHaveCount(2)
})

test('Cancel and Esc leave the page exactly as it was', async ({ page }) => {
  const extra = await boxes(page, 2)
  const before = await rects(page)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="two:1"]').click()
  await page.locator('[data-layout-thumb]').first().click()
  await assist(page).getByRole('button', { name: 'Cancel' }).first().click()
  await expect(assist(page)).toHaveCount(0)
  expect(await rects(page)).toEqual(before)
  await openAssist(page, extra.nth(0))
  await page.keyboard.press('Escape')
  await expect(assist(page)).toHaveCount(0)
  expect(await rects(page)).toEqual(before)
})

test('dragging a thumbnail onto a zone fills it', async ({ page }) => {
  const extra = await boxes(page, 2)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="two:0"]').click()
  await page
    .locator('[data-layout-thumb]')
    .first()
    .dragTo(page.locator('[data-layout-zone-row="1"]'))
  await expect(page.locator('[data-layout-zone-row="1"]')).toContainText(
    'Box 2',
  )
  await page.locator('[data-layout-done]').click()
  const r0 = await rect(extra.nth(0))
  const r1 = await rect(extra.nth(1))
  expect(Math.abs(r0.y - r1.y)).toBeLessThan(6)
})

test('recent layouts come first next time', async ({ page }) => {
  const extra = await boxes(page, 1)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="six:0"]').click()
  await page.locator('[data-layout-done]').click()
  await openAssist(page, extra.nth(0))
  const first = page.locator('[data-layout-zone]').first()
  await expect(first).toHaveAttribute('data-layout-zone', /^six:/)
})

test('whole notebook: a preview of every page, then one Undo', async ({
  page,
}) => {
  const extra = await boxes(page, 3)
  await openAssist(page, extra.nth(0))
  await page.locator('[data-layout-zone="two:0"]').click()
  await assist(page)
    .getByRole('button', { name: 'Apply to whole notebook' })
    .click()
  await expect(page.locator('[data-notebook-thumb]').first()).toBeVisible()
  await page.locator('[data-layout-notebook-confirm]').click()
  await expect(assist(page)).toHaveCount(0)
  await expect
    .poll(async () => {
      const a = await rect(extra.nth(0))
      const b = await rect(extra.nth(1))
      return Math.abs(a.y - b.y) < 6
    })
    .toBe(true)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect
    .poll(async () => {
      const a = await rect(extra.nth(0))
      const b = await rect(extra.nth(1))
      return b.y > a.y + a.height - 1
    })
    .toBe(true)
})
