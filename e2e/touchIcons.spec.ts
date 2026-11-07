import { expect, test } from '@playwright/test'
import { createNotebook, openSidebar } from './helpers.ts'

test.describe('touch screen', () => {
  test.use({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  })

  test('touch rows show one big ⋯ instead of the small icons', async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Touch NB', 'First')
    const side = await openSidebar(page)
    for (const label of ['Add page', 'Rename', 'Delete notebook']) {
      await expect(side.getByLabel(label, { exact: true }).first()).toBeHidden()
    }
    const more = side.getByRole('button', { name: 'More for Touch NB' })
    const box = (await more.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
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
