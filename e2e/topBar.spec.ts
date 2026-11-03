import { expect, test } from '@playwright/test'
import { addPage, createNotebook, openPage, sidebar } from './helpers.ts'

const pageTitle = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Page title' })

test('the menu hides and comes back, and this device remembers', async ({
  page,
}) => {
  await page.goto('/')
  await expect(sidebar(page)).toBeVisible()

  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(sidebar(page)).toBeHidden()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Show menu' })).toBeVisible()
  await expect(sidebar(page)).toBeHidden()

  await page.getByRole('button', { name: 'Show menu' }).click()
  await expect(sidebar(page)).toBeVisible()

  await page.keyboard.press('Control+Backslash')
  await expect(sidebar(page)).toBeHidden()
})

test('Back and Forward move through the pages, and grey out at the ends', async ({
  page,
}) => {
  await page.goto('/')
  const back = page.getByRole('button', { name: 'Back', exact: true })
  const forward = page.getByRole('button', { name: 'Forward', exact: true })
  await createNotebook(page, 'Biology', 'Cells')
  await addPage(page, 'Biology', 'Heart')
  await openPage(page, 'Cells')
  await expect(forward).toBeDisabled()

  await back.click()
  await expect(pageTitle(page)).toHaveValue('Heart')
  await expect(forward).toBeEnabled()

  await forward.click()
  await expect(pageTitle(page)).toHaveValue('Cells')
  await expect(forward).toBeDisabled()

  // A new page after going back ends what was ahead, as in a browser.
  await back.click()
  await expect(pageTitle(page)).toHaveValue('Heart')
  await sidebar(page).getByRole('button', { name: 'Settings' }).click()
  await expect(forward).toBeDisabled()

  // It survives a reload, and the first screen has nowhere to go back to.
  await back.click()
  await expect(forward).toBeEnabled()
  await page.reload()
  await expect(pageTitle(page)).toHaveValue('Heart')
  await expect(forward).toBeEnabled()
})

test('the bar stays above every screen', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  const back = page.getByRole('button', { name: 'Back', exact: true })
  for (const screen of [
    'Databases',
    'All cards',
    'Save & restore',
    'Settings',
  ]) {
    await sidebar(page).getByRole('button', { name: screen }).click()
    await expect(back).toBeVisible()
    await expect(page.locator('header').first()).toContainText(screen)
    await expect(
      page.getByRole('button', { name: 'More options' }),
    ).toHaveCount(0)
  }
})

test('Alt+R reviews the open page', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await page.keyboard.press('Alt+KeyR')
  await expect(page.getByRole('button', { name: 'Close review' })).toBeVisible()
})

test('the ⋯ menu moves with the arrow keys and greys what is coming', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await page.getByRole('button', { name: 'More options' }).click()
  const item = (name: string) =>
    page.getByRole('menuitem', { name: new RegExp(`^.{0,3}${name}`) })
  await expect(item('Review this page')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item('History')).toBeFocused()
  await expect(item('Import')).toBeDisabled()
  await expect(item('Export')).toContainText('Coming soon')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
})

test.describe('phone and tablet', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('⋯ opens with a tap, fits the screen and every item works', async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Biology', 'Cells')
    await page.getByRole('button', { name: 'More options' }).tap()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    const box = (await menu.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    expect(box.y + box.height).toBeLessThanOrEqual(844)
    // The six old items, the two "Switch to … mode" items, the four copy and
    // paste items and the three batch 2d items (favourite, search, tool bar).
    await expect(page.getByRole('menuitem')).toHaveCount(15)

    await page.getByRole('menuitem', { name: /Save & restore/ }).tap()
    await expect(
      page.getByRole('heading', { name: /Save & restore/, level: 1 }),
    ).toBeVisible()
  })

  test('the bar shows on the screens that used to fill the phone', async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Biology', 'Cells')
    await page.getByRole('button', { name: 'Open menu' }).tap()
    await sidebar(page).getByRole('button', { name: 'Databases' }).tap()
    await expect(sidebar(page)).toBeHidden()
    await expect(
      page.getByRole('button', { name: 'Back', exact: true }),
    ).toBeEnabled()
    await page.getByRole('button', { name: 'Open menu' }).tap()
    await expect(sidebar(page)).toBeVisible()
  })
})

test('at iPad width the menu can be hidden too', async ({ page }) => {
  await page.setViewportSize({ width: 695, height: 1000 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(sidebar(page)).toBeHidden()
})

test('on the iPad app the bar and menu start below the blur', async ({
  page,
}) => {
  await page.goto('/')
  const menu = page.getByRole('button', { name: 'Hide menu' })
  await expect(menu).toBeVisible()
  const before = (await menu.boundingBox())!.y
  const brandBefore = (await sidebar(page)
    .getByText('Learning Notes')
    .boundingBox())!.y

  // Browser tests can't be an installed iPad app, so set what its CSS sets.
  await page.addStyleTag({ content: ':root { --top-clear: 36px }' })
  await expect
    .poll(async () => (await menu.boundingBox())!.y)
    .toBeGreaterThanOrEqual(before + 30)
  const brand = (await sidebar(page).getByText('Learning Notes').boundingBox())!
    .y
  expect(brand).toBe(brandBefore + 36)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('dragging the handle shares the screen, and this device remembers', async ({
  page,
}) => {
  await page.goto('/')
  const handle = page.getByRole('separator', { name: 'Resize menu' })
  const width = async () => (await sidebar(page).boundingBox())!.width
  await expect.poll(width).toBe(260)

  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2)
  await page.mouse.up()
  await expect.poll(width).toBe(340)
  await page.reload()
  await expect.poll(width).toBe(340)

  await handle.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(width).toBe(324)
  await handle.dblclick()
  await expect.poll(width).toBe(260)

  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(handle).toBeHidden()
})
