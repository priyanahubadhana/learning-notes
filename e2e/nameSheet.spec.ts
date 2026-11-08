// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, openSidebar, rowAction, sheetFill } from './helpers.ts'

/**
 * The "Name it" sheet, the sidebar palm guard and the ⋯-only rows on touch
 * and Pencil devices. Runs in chromium (touch emulation) and in the iPad
 * project.
 */

test.use({
  viewport: { width: 1024, height: 768 },
  hasTouch: true,
  isMobile: true,
})

const nbRow = (side: Locator, text: string) =>
  side.locator('[data-notebook-row]').filter({ hasText: text })
const sheetOf = (page: Page) => page.getByTestId('name-sheet')

test('a new notebook is named in a large centred sheet', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Anatomy', 'First')
  // The sheet closed and the notebook has its name.
  await expect(sheetOf(page)).toHaveCount(0)
  const side = await openSidebar(page)
  await expect(
    side.getByRole('button', { name: 'Anatomy', exact: true }),
  ).toBeVisible()
})

test('the sheet field is 56 px tall, focused, modal, and Esc cancels', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await rowAction(page, 'Biology', 'Rename')
  const sheet = sheetOf(page)
  await expect(sheet).toBeVisible()
  const field = sheet.getByRole('textbox', { name: 'Name' })
  await expect(field).toBeFocused()
  const box = (await field.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(56)
  // Modal: the rest of the page is inert while it is open.
  expect(await sheet.evaluate((d) => d.matches(':modal'))).toBe(true)
  await field.fill('Changed')
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  const side = await openSidebar(page)
  await expect(
    side.getByRole('button', { name: 'Biology', exact: true }),
  ).toBeVisible()
  await expect(side.getByRole('button', { name: 'Changed' })).toHaveCount(0)
})

test('Cancel keeps the default name; Enter is Done', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Chem', 'First')
  // A new notebook: Cancel keeps "New notebook".
  const side = await openSidebar(page)
  await side.getByLabel('New notebook').click()
  await expect(sheetOf(page)).toBeVisible()
  await sheetOf(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(sheetOf(page)).toHaveCount(0)
  await expect(nbRow(side, 'New notebook')).toBeVisible()
  // Enter means Done.
  await rowAction(page, 'New notebook', 'Rename')
  expect(await sheetFill(page, 'Physics')).toBe(true)
  await expect(nbRow(side, 'Physics')).toBeVisible()
})

test('a new page is named in the sheet', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Maths', 'First')
  await rowAction(page, 'Maths', 'Add page')
  await page.getByRole('menuitem', { name: 'Blank page' }).click()
  expect(await sheetFill(page, 'Algebra')).toBe(true)
  const side = await openSidebar(page)
  await expect(
    side.getByRole('button', { name: 'Algebra', exact: true }),
  ).toBeVisible()
})

test('touch rows show only ⋯ (44 px), whose menu has the actions', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Touch NB', 'First')
  const side = await openSidebar(page)
  for (const label of ['Add page', 'Rename', 'Delete notebook']) {
    await expect(side.getByLabel(label, { exact: true })).toHaveCount(1)
    await expect(side.getByLabel(label, { exact: true })).toBeHidden()
  }
  const more = side.getByRole('button', { name: 'More for Touch NB' })
  const box = (await more.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)
  await more.click()
  const menu = page.getByRole('menu')
  for (const item of ['Add page', 'Rename', 'Move up', 'Move down'])
    await expect(menu.getByRole('menuitem', { name: item })).toBeVisible()
  // Two lock items: the PIN lock and the edit lock.
  await expect(menu.getByRole('menuitem', { name: /Lock/ })).toHaveCount(2)
  await expect(menu.getByRole('menuitem').last()).toContainText(
    'Delete notebook',
  )
  // The menu is in the body, not inside the scrolling sidebar.
  expect(await menu.evaluate((m) => m.parentElement === document.body)).toBe(
    true,
  )
})

test('a palm right after the Pencil cannot press a row button', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Palm NB', 'First')
  const side = await openSidebar(page)
  const more = side.getByRole('button', { name: 'More for Palm NB' })
  const touchTap = () =>
    more.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const o = {
        bubbles: true,
        cancelable: true,
        pointerType: 'touch',
        pointerId: 7,
        isPrimary: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      }
      el.dispatchEvent(new PointerEvent('pointerdown', o))
      el.dispatchEvent(new PointerEvent('pointerup', o))
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  // The Pencil goes down and lifts, then a palm taps within 500 ms.
  await more.evaluate((el) => {
    const o = { bubbles: true, pointerType: 'pen', pointerId: 3 }
    el.dispatchEvent(new PointerEvent('pointerdown', o))
    el.dispatchEvent(new PointerEvent('pointerup', o))
  })
  await touchTap()
  await expect(page.getByRole('menu')).toHaveCount(0)
  // Well after the Pencil lifted, a finger works again.
  await page.waitForTimeout(700)
  await touchTap()
  await expect(page.getByRole('menu')).toBeVisible()
})

test('Delete asks first, and Cancel has the focus on touch', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Keep me', 'First')
  await rowAction(page, 'Keep me', 'Delete notebook')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  const side = await openSidebar(page)
  await expect(
    side.getByRole('button', { name: 'Keep me', exact: true }),
  ).toBeVisible()
})
