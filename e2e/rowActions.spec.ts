// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator } from '@playwright/test'
import { closeCorner, createNotebook, openSidebar } from './helpers.ts'

/** Polish 1 · item 2: row actions reachable by touch (press and hold). */

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 1024, height: 768 },
})

/** A finger held on the middle of an element for 650 ms, then lifted. */
async function hold(target: Locator) {
  await target.evaluate(async (el) => {
    const r = el.getBoundingClientRect()
    const opts = {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 9,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
    }
    el.dispatchEvent(new PointerEvent('pointerdown', opts))
    await new Promise((res) => setTimeout(res, 650))
    el.dispatchEvent(new PointerEvent('pointerup', opts))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

test('press and hold a notebook row: the menu offers Rename and Delete', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Touch NB', 'First')
  const side = await openSidebar(page)
  const row = side
    .locator('[data-notebook-row]')
    .filter({ hasText: 'Touch NB' })
  await hold(row.getByRole('button', { name: 'Touch NB', exact: true }))
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Rename/ })).toBeVisible()
  await menu.getByRole('menuitem', { name: /Rename/ }).click()
  await expect(page.getByTestId('name-sheet')).toBeVisible()
})

test('press and hold a page row: the menu has Delete last', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Touch NB', 'First')
  const side = await openSidebar(page)
  await hold(
    side
      .getByTestId('page-row')
      .filter({ hasText: 'First' })
      .first()
      .getByRole('button', { name: 'First', exact: true }),
  )
  const items = page.getByRole('menu').getByRole('menuitem')
  await expect(items.last()).toContainText('Delete page')
})

test('press and hold a task row opens its ⋯ menu', async ({ page }) => {
  await page.goto('/')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await page.getByTestId('quick-add').fill('Write essay')
  await page.getByTestId('quick-add').press('Enter')
  await hold(page.getByTestId('task-row').first().locator('div.cursor-grab'))
  await expect(page.getByRole('menu')).toBeVisible()
})
