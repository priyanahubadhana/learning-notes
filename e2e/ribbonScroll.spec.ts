// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Bug batch 1 leftovers (item 49): the ribbon, and every row that overflows,
 * scrolls sideways with a mouse: chevrons at the edges, the wheel, and a thin
 * scrollbar on hover (touch swipes scroll natively).
 */
test.use({ viewport: { width: 820, height: 900 } })

async function open(page: Page) {
  await startInMode(page, 'touch')
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:toolbar.ribbon', 'true')
  })
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.waitForTimeout(400)
}

const panel = (page: Page) => dockedBar(page).getByRole('tabpanel')

test('the ribbon: chevrons, wheel and a thin scrollbar', async ({ page }) => {
  await open(page)
  await dockedBar(page).getByRole('tab', { name: 'Home' }).click()
  const row = panel(page)
  await expect(row).toBeVisible()
  const over = await row.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(over).toBeGreaterThan(20)
  // The end chevron shows; the start one does not (at the start).
  await expect(row.locator('[data-scroll-chevron="end"]')).toBeVisible()
  await expect(row.locator('[data-scroll-chevron="start"]')).toHaveCount(0)
  // The wheel scrolls it sideways.
  const b = (await row.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.wheel(0, 200)
  await expect
    .poll(() => row.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(50)
  await expect(row.locator('[data-scroll-chevron="start"]')).toBeVisible()
  // The chevrons slide it.
  const x1 = await row.evaluate((el) => el.scrollLeft)
  await row.locator('[data-scroll-chevron="end"]').click()
  await expect
    .poll(() => row.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(x1)
  await row.locator('[data-scroll-chevron="start"]').click()
  await expect
    .poll(() => row.evaluate((el) => el.scrollLeft))
    .toBeLessThan(x1 + 400)
  // A thin scrollbar while the pointer is over it.
  expect(await row.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe(
    'thin',
  )
})
