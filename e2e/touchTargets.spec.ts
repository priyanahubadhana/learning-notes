import { devices, expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  hideSidebar,
  selectText,
  showSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

const { viewport, hasTouch, isMobile, userAgent } = devices['iPad Pro 11']
test.use({ viewport, hasTouch, isMobile, userAgent })

const SCREENS = ['#/settings', '#/search', '#/cards', '#/databases', '#/review']

/** Visible buttons too small for a finger, as "name width×height". */
const tooSmall = (page: Page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'button, select, input:not([type=checkbox], [type=radio], [type=file])',
      ),
    ]
      .filter((el) => el.checkVisibility() && !el.closest('.bn-inline-content'))
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(
        ({ el, box }) =>
          box.height < 44 || (el.tagName === 'BUTTON' && box.width < 32),
      )
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

test('the selection toolbar stays inside the screen', async ({ page }) => {
  await startInMode(page, 'computer') // the floating toolbar
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'Heart sounds')
  await typeInEditor(page, 'select these words')
  await selectText(page, 'these')
  const toolbar = page.locator('.bn-formatting-toolbar')
  await expect(toolbar).toBeVisible()
  const box = (await toolbar.boundingBox())!
  const width = page.viewportSize()!.width
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(width)
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  )
  expect(pageWidth).toBeLessThanOrEqual(width)
})

test('the docked bar stays inside the screen and its buttons fit a finger', async ({
  page,
}) => {
  await page.goto('/') // a touch screen starts in Touch mode
  await createNotebook(page, 'Test NB', 'Heart sounds')
  await typeInEditor(page, 'select these words')
  const bar = dockedBar(page)
  await expect(bar).toBeVisible()
  const box = (await bar.boundingBox())!
  const width = page.viewportSize()!.width
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(width)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(width)
  for (const name of ['Text', 'Pen', 'Toolbar menu']) {
    const button = bar.getByRole('button', { name, exact: true })
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})

test('a database in a note has finger-sized controls', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'Heart sounds')
  await hideSidebar(page)
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/database')
  await page.keyboard.press('Enter')
  await page
    .getByRole('dialog', { name: 'Add a database' })
    .getByRole('option', { name: /^Drug list — / })
    .click()
  const block = page.getByRole('region', { name: 'Drug list' })
  await block.getByRole('button', { name: /Table/ }).click()
  const fullWidth = block.getByRole('button', { name: /Full width/ })
  await expect(fullWidth).toBeVisible()
  expect((await fullWidth.boundingBox())!.height).toBeGreaterThanOrEqual(44)
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
