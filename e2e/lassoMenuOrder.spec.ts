import { expect, test } from '@playwright/test'
import { card, openNote, openPill, option, pref } from './mainBarHelpers.ts'

/**
 * Polish 2, item 6: the Lasso menu is arranged in the same sheet as the
 * Edit toolbar. Reorder an action, Done, reload: the order is kept.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

test('move Convert to text first in the Lasso menu; it stays after a reload', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Lasso', 'lasso')
  await option(page, 'Free-hand').click() // the active option opens the card
  await card(page).getByRole('button', { name: 'Arrange the menu…' }).click()
  const sheet = page.getByRole('dialog', { name: 'Arrange the Lasso menu' })
  await expect(sheet).toBeVisible()
  const rows = sheet.locator('[data-edit-list="lasso"] [data-row-id]')
  await expect(rows.first()).toHaveAttribute('data-row-id', 'copy')
  for (let i = 0; i < 6; i++) {
    const up = sheet.getByRole('button', {
      name: 'Move Convert to text earlier',
    })
    if (await up.isDisabled()) break
    await up.click()
  }
  await expect(rows.first()).toHaveAttribute('data-row-id', 'convert')
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toHaveCount(0)
  expect((await pref<string[]>(page, 'ink.lasso.row'))?.[0]).toBe('convert')
  await page.reload()
  expect((await pref<string[]>(page, 'ink.lasso.row'))?.[0]).toBe('convert')
})
