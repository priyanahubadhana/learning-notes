import { expect, test } from '@playwright/test'
import { sidebar } from './helpers.ts'

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('the sidebar slides in from a button and closes by itself', async ({
    page,
  }) => {
    await page.goto('/')
    // Start: the page, not the sidebar, fills the screen.
    await page.getByRole('button', { name: 'Create notebook' }).click()
    await expect(sidebar(page)).toBeHidden()

    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(sidebar(page)).toBeVisible()
    const box = await sidebar(page).boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.width).toBeLessThanOrEqual(300)

    // Esc and the backdrop close it.
    await page.keyboard.press('Escape')
    await expect(sidebar(page)).toBeHidden()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('button', { name: 'Close menu' }).click({
      position: { x: 370, y: 400 },
    })
    await expect(sidebar(page)).toBeHidden()

    // Choosing something closes it.
    await page.getByRole('button', { name: 'Open menu' }).click()
    await sidebar(page).getByRole('button', { name: 'Settings' }).click()
    await expect(sidebar(page)).toBeHidden()
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible()
  })

  test('on a narrow screen the menu button is in view and the page toolbar wraps', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Create notebook' }).click()
    const menu = page.getByRole('button', { name: 'Open menu' })
    await expect(menu).toBeVisible()
    const b = (await menu.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.width).toBeGreaterThanOrEqual(40)
    // Nothing sticks out on the right: the page does not scroll sideways
    // and every toolbar button is inside the screen.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const buttons = page
      .getByRole('toolbar', { name: 'Page actions' })
      .getByRole('button')
    for (const box of await buttons.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().right),
    )) {
      expect(box).toBeLessThanOrEqual(500)
    }
    await menu.click()
    await expect(page.locator('aside')).toBeVisible()
  })

  test('a page takes the whole width', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create notebook' }).click()
    const title = page.getByRole('textbox', { name: 'Page title' })
    const box = await title.boundingBox()
    expect(box!.x + box!.width).toBeGreaterThan(300) // not squeezed beside a sidebar
  })
})

test('on a computer the sidebar stays and there is no menu button', async ({
  page,
}) => {
  await page.goto('/')
  await expect(sidebar(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden()
})
