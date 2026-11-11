// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/** Settings › Reduce glass: Solid turns every blur off at once; Automatic brings it back. */

test.use({ viewport: { width: 1200, height: 800 } })

const blurOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = document.querySelector('.glass')
    return el ? getComputedStyle(el).backdropFilter : 'missing'
  })

test('Solid removes the blur and sets data-glass; Automatic restores it', async ({
  page,
}) => {
  await page.goto('/#/settings/general')
  const group = page.getByRole('group', { name: 'Reduce glass' })
  await expect(
    group.getByRole('button', { name: 'Automatic' }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(await blurOf(page)).toContain('blur')

  await group.getByRole('button', { name: 'Solid' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'lite')
  expect(await blurOf(page)).toBe('none')

  await group.getByRole('button', { name: 'Automatic' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-glass', 'lite')
  expect(await blurOf(page)).toContain('blur')
})

test('Solid stays after a reload', async ({ page }) => {
  await page.goto('/#/settings/general')
  await page
    .getByRole('group', { name: 'Reduce glass' })
    .getByRole('button', { name: 'Solid' })
    .click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'lite')
})
