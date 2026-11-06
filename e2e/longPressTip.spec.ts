// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/** Polish 1 · item 1: press and hold an icon on touch to read its tip. */

test('long-press on a Home icon shows its tip and does not run the action', async ({
  page,
}) => {
  await page.goto('/')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await page.getByTestId('quick-add').fill('Write essay')
  await page.getByTestId('quick-add').press('Enter')

  const menuButton = page.getByTestId('task-menu-button').first()
  await expect(menuButton).toBeVisible()
  // A finger: press, hold 600 ms, lift, then the browser's click.
  await menuButton.evaluate(async (el) => {
    const opts = {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 7,
    }
    el.dispatchEvent(new PointerEvent('pointerdown', opts))
    await new Promise((r) => setTimeout(r, 650))
    el.dispatchEvent(new PointerEvent('pointerup', opts))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  await expect(page.getByRole('tooltip')).toContainText(
    'Opens more actions for this task.',
  )
  // The action did not run: no menu opened.
  await expect(menuButton).not.toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menu')).toHaveCount(0)

  // A normal tap still works afterwards.
  await menuButton.click()
  await expect(page.getByRole('menu')).toBeVisible()
})
