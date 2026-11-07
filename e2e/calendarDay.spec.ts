// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Phase N3: Calendar › Day, a full-page card; swipe moves between days. */

const main = (page: Page) => page.getByRole('main')
const card = (page: Page) => main(page).locator('[data-calendar-card]')

async function swipe(page: Page, dx: number) {
  await card(page).evaluate((el, travel) => {
    const fire = (type: string, x: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'touch',
          clientX: x,
          clientY: 200,
          bubbles: true,
        }),
      )
    fire('pointerdown', 300)
    fire('pointerup', 300 + travel)
  }, dx)
}

test('Day shows one card; buttons, keys and swipes change the day', async ({
  page,
}) => {
  await page.goto('/#/calendar')
  await main(page).getByRole('button', { name: 'Day', exact: true }).click()
  const first = await card(page).getAttribute('data-calendar-card')
  expect(first).toMatch(/^\d{4}-\d{2}-\d{2}$/)

  const day = async () => card(page).getAttribute('data-calendar-card')
  const step = (iso: string, by: number) => {
    const d = new Date(`${iso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + by)
    return d.toISOString().slice(0, 10)
  }

  await main(page).getByRole('button', { name: 'Next' }).click()
  expect(await day()).toBe(step(first!, 1))
  await main(page).getByRole('button', { name: 'Previous' }).click()
  expect(await day()).toBe(first)

  await card(page).focus()
  await page.keyboard.press('ArrowRight')
  expect(await day()).toBe(step(first!, 1))

  await swipe(page, -150) // finger moves left: the next day
  expect(await day()).toBe(step(first!, 2))
  await swipe(page, 150) // finger moves right: the day before
  expect(await day()).toBe(step(first!, 1))
  await swipe(page, 20) // too short: stays
  expect(await day()).toBe(step(first!, 1))

  await main(page).getByRole('button', { name: 'Today' }).click()
  expect(await day()).toBe(first)

  // Remembered, and the day's journal can be started from the card.
  await page.reload()
  await expect(card(page)).toBeVisible()
  await main(page)
    .getByRole('button', { name: /journal/ })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeVisible()
})

test('Day fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/calendar')
  await main(page).getByRole('button', { name: 'Day', exact: true }).click()
  await expect(card(page)).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
