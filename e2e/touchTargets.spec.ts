import { devices, expect, test, type Page } from '@playwright/test'
import { createNotebook, showSidebar } from './helpers.ts'

const { viewport, hasTouch, isMobile, userAgent } = devices['iPad Pro 11']
test.use({ viewport, hasTouch, isMobile, userAgent })

const SCREENS = ['#/settings', '#/search', '#/cards', '#/databases', '#/review']

/** Visible buttons too small for a finger, as "name width×height". */
const tooSmall = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button')]
      .filter((el) => el.checkVisibility() && !el.closest('.bn-editor'))
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 32 || box.height < 44)
      .map(
        ({ el, box }) =>
          `${el.getAttribute('aria-label') ?? el.textContent?.trim()} ${Math.round(box.width)}×${Math.round(box.height)}`,
      ),
  )

test('on a touch screen every button is big enough for a finger', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'Heart sounds')
  expect(await tooSmall(page)).toEqual([])
  for (const hash of SCREENS) {
    await page.goto('/' + hash)
    await expect(page.getByRole('main')).toBeVisible()
    await page.waitForTimeout(300)
    expect(await tooSmall(page), hash).toEqual([])
  }
})

for (const [width, height] of [
  [320, 700],
  [500, 800],
  [700, 800],
  [900, 450],
]) {
  test(`a resized window ${width}×${height} fits and the menu opens`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await createNotebook(page, 'Test NB', 'Heart sounds')
    for (const hash of ['', ...SCREENS]) {
      if (hash) await page.goto('/' + hash)
      await expect(page.getByRole('main')).toBeVisible()
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, hash).toBeLessThanOrEqual(0)
    }
    await showSidebar(page)
    await expect(page.locator('aside')).toBeVisible()
  })
}
