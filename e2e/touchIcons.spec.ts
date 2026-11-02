import { expect, test } from '@playwright/test'
import { createNotebook, openSidebar } from './helpers.ts'

test.describe('touch screen', () => {
  test.use({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  })

  test('row icons are always visible and big enough for a finger', async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Touch NB', 'First')
    const side = await openSidebar(page)
    // The "+" of the new notebook is visible without hovering.
    const add = side.getByLabel('Add page', { exact: true }).first()
    await expect(add).toBeVisible()
    for (const label of ['Add page', 'Rename', 'Delete notebook']) {
      const button = side.getByLabel(label, { exact: true }).first()
      expect(
        await button.evaluate(
          (el) =>
            getComputedStyle(el.closest('[class*="group-hover:opacity-100"]')!)
              .opacity,
        ),
      ).toBe('1')
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(32) // narrow, so names stay readable
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})

test('with a mouse the icons still wait for hover', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Mouse NB', 'First')
  const side = await openSidebar(page)
  await page.getByRole('main').click({ position: { x: 40, y: 5 } }) // focus and mouse away
  const button = side.getByLabel('Delete notebook', { exact: true }).first()
  expect(
    await button.evaluate(
      (el) =>
        getComputedStyle(el.closest('[class*="group-hover:opacity-100"]')!)
          .opacity,
    ),
  ).toBe('0')
})
