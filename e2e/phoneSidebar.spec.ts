import { expect, test } from '@playwright/test'
import {
  createNotebook,
  makeCard,
  openSearchPopup,
  sidebar,
} from './helpers.ts'

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
    // The drawer slides in, so wait for it to arrive.
    await expect
      .poll(async () => (await sidebar(page).boundingBox())!.x)
      .toBeGreaterThanOrEqual(0)
    const box = await sidebar(page).boundingBox()
    expect(box!.width).toBeLessThanOrEqual(300)

    // Esc and the backdrop close it.
    await page.keyboard.press('Escape')
    await expect(sidebar(page)).toBeHidden()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.mouse.click(370, 400)
    await expect(sidebar(page)).toBeHidden()

    // So does the three-line button at the top of the menu.
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(sidebar(page)).toBeHidden()

    // Choosing something closes it.
    await page.getByRole('button', { name: 'Open menu' }).click()
    await sidebar(page).getByRole('button', { name: 'Settings' }).click()
    await expect(sidebar(page)).toBeHidden()
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible()

    // Choosing the screen already open closes it too.
    await page.getByRole('button', { name: 'Open menu' }).click()
    await sidebar(page).getByRole('button', { name: 'Settings' }).click()
    await expect(sidebar(page)).toBeHidden()
  })

  test('the open page, chosen again, closes the menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create notebook' }).click()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await sidebar(page).getByRole('button', { name: 'Databases' }).click()
    await expect(sidebar(page)).toBeHidden()

    await page.getByRole('button', { name: 'Open menu' }).click()
    await sidebar(page).getByRole('button', { name: 'Databases' }).click()
    await expect(sidebar(page)).toBeHidden()
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

  test('Review has the menu, and keys wait while it is open', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 }) // to make the card
    await page.goto('/')
    await createNotebook(page, 'Biology', 'Cells')
    await makeCard(page, 'What is a cell?', 1)
    await page.reload() // the card is due
    await page.setViewportSize({ width: 390, height: 844 })

    const menu = page.getByRole('button', { name: 'Open menu' })
    await menu.click()
    await sidebar(page)
      .getByRole('button', { name: /^Review(?! this)/ })
      .click()
    const answer = page.getByRole('button', { name: 'Show answer' })
    await expect(answer).toBeVisible()

    // The title has its own line below the button, even on the smallest
    // phones, and the top line (menu, choice, close) stays one line.
    const title = page.getByRole('heading', { name: 'Review', level: 1 })
    const close = page.getByRole('button', { name: 'Close review' })
    await page.setViewportSize({ width: 320, height: 700 })
    const buttonBox = (await menu.boundingBox())!
    const titleBox = (await title.boundingBox())!
    const closeBox = (await close.boundingBox())!
    expect(titleBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height)
    expect(closeBox.y).toBeLessThan(buttonBox.y + buttonBox.height)
    expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(320)
    const choice = page.getByRole('group', { name: 'Which cards' })
    const choiceBox = (await choice.boundingBox())!
    expect(choiceBox.x + choiceBox.width).toBeLessThanOrEqual(closeBox.x + 12)
    expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    )

    await menu.click()
    await expect(sidebar(page)).toBeVisible()
    await page.keyboard.press('Space')
    await page.keyboard.press('Escape')
    await expect(sidebar(page)).toBeHidden()
    await expect(title).toBeVisible()
    await expect(answer).toBeVisible()
  })

  test('the full-screen search popup has the menu too', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create notebook' }).click()
    const popup = await openSearchPopup(page)
    await expect(popup.getByRole('combobox')).toBeFocused()
    await popup.getByRole('button', { name: 'Open menu' }).click()
    await expect(popup).toBeHidden()
    await expect(sidebar(page)).toBeVisible()
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
