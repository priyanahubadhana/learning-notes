import { expect, test, type Page } from '@playwright/test'
import { createNotebook, pageSubAction } from './helpers.ts'

/**
 * Batch 2g: the Device mode button in the top bar (always visible, on every
 * screen) and the "Device mode" and "Page address" items of the page ⋯ menu.
 */

const button = (page: Page) => page.getByTestId('device-mode-button')
const list = (page: Page) => page.getByRole('menu', { name: 'Device mode' })

test('the top bar button shows the mode, has a 44 px target and a tooltip', async ({
  page,
}) => {
  await page.goto('/')
  await expect(button(page)).toBeVisible()
  await expect(button(page)).toHaveAttribute('aria-label', /^Device mode:/)
  const box = (await button(page).boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(43.5)
  expect(box.height).toBeGreaterThanOrEqual(43.5)
})

test('one tap opens the list: description, tick on the current mode, ✕, Esc', async ({
  page,
}) => {
  await page.goto('/')
  await button(page).click()
  const items = list(page).getByRole('menuitemradio')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('Computer')
  await expect(items.nth(0)).toContainText('Mouse and keyboard')
  await expect(items.nth(1)).toContainText('Finger')
  await expect(items.nth(2)).toContainText('Apple Pencil')
  await expect(list(page).locator('[aria-checked="true"]')).toHaveCount(1)
  await expect(
    list(page).getByRole('button', { name: 'Close', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(list(page)).toHaveCount(0)
})

test('choosing a mode switches it, ticks it, and the icon follows', async ({
  page,
}) => {
  await page.goto('/')
  await button(page).click()
  await list(page)
    .getByRole('menuitemradio', { name: /Pencil/ })
    .click()
  await expect(list(page)).toHaveCount(0)
  await expect(button(page)).toHaveAttribute(
    'aria-label',
    'Device mode: Pencil',
  )
  await button(page).click()
  await expect(
    list(page).getByRole('menuitemradio', { name: /Pencil/ }),
  ).toHaveAttribute('aria-checked', 'true')
  await list(page).getByRole('menuitemradio', { name: /Touch/ }).click()
  await expect(button(page)).toHaveAttribute('aria-label', 'Device mode: Touch')
  await page.reload()
  await expect(button(page)).toHaveAttribute('aria-label', 'Device mode: Touch')
})

test('the page ⋯ menu has one Device mode item that opens the same list', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await page.getByRole('button', { name: 'More options' }).click()
  const menu = page.getByRole('menu').first()
  await expect(menu.getByRole('menuitem', { name: /Switch to/ })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: /Path style/ })).toHaveCount(
    0,
  )
  await menu.getByRole('menuitem', { name: /Device mode/ }).click()
  await expect(list(page).getByRole('menuitemradio')).toHaveCount(3)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await pageSubAction(page, 'Device mode', 'Pencil')
  await expect(button(page)).toHaveAttribute(
    'aria-label',
    'Device mode: Pencil',
  )
})

test('the page ⋯ menu order: page actions, Copy & paste, Page address, Device mode, tool bar, Save & restore', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await page.getByRole('button', { name: 'More options' }).click()
  const names = await page
    .getByRole('menu')
    .first()
    .getByRole('menuitem')
    .allInnerTexts()
  const order = [
    'Review this page',
    'History',
    'Copy & paste',
    'Page address',
    'Device mode',
    'Hide tool bar',
    'Save & restore',
  ].map((n) => names.findIndex((x) => x.includes(n)))
  expect(order.every((i) => i >= 0)).toBe(true)
  expect([...order].sort((a, b) => a - b)).toEqual(order)
})

test('Page address lists Short, Full, Name only and App default with a tick', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: /Page address/ }).click()
  const sub = page.getByRole('menu', { name: 'Page address' })
  await expect(sub.getByRole('menuitemradio')).toHaveText([
    /Short \(Notebook \/ Page\)/,
    /Full \(like folders\)/,
    /Name only/,
    /App default/,
  ])
  await expect(
    sub.getByRole('menuitemradio', { name: /App default/ }),
  ).toHaveAttribute('aria-checked', 'true')
})

test('phone: the button fits next to the path and the list stays on screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  const box = (await button(page).boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  await button(page).click()
  const m = (await list(page).boundingBox())!
  expect(m.x).toBeGreaterThanOrEqual(0)
  expect(m.x + m.width).toBeLessThanOrEqual(390)
  expect(m.y + m.height).toBeLessThanOrEqual(844)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
})
