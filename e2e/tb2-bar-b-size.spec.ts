import { expect, test } from '@playwright/test'
import { card, option, openNote, openPill } from './mainBarHelpers.ts'

/**
 * Box bar part B (switch textbox.v2), item 4 of the owner's list and the mock's
 * frame 6: the Text tool's size control opens the SAME size strip as the box
 * bar (number, slider, minus/plus, any number) and sets the size for what is
 * written next. Today's five steps (90 to 150 %) are replaced under the switch.
 */
test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

async function start(page: import('@playwright/test').Page) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await openNote(page, 'touch')
  await openPill(page, 'Text', 'text')
}

test('S1. the Text tool size control is the shared strip: number, slider, − and +, no 5 steps', async ({
  page,
}) => {
  await start(page)
  await expect(option(page, /^Text size: 16/)).toBeVisible()
  await option(page, /^Text size/).click()
  const c = card(page)
  await expect(c.locator('[data-size-strip]')).toBeVisible()
  await expect(c.getByRole('spinbutton')).toBeVisible()
  await expect(c.getByRole('slider')).toBeVisible()
  await expect(c.getByRole('button', { name: 'Smaller' })).toBeVisible()
  await expect(c.getByRole('button', { name: 'Larger' })).toBeVisible()
  await expect(c.getByRole('radio', { name: '130%' })).toHaveCount(0)
})

test('S2. any number by the number field; − and + move one step; it is kept', async ({
  page,
}) => {
  await start(page)
  await option(page, /^Text size/).click()
  const c = card(page)
  const num = c.getByRole('spinbutton')
  await num.fill('37')
  await num.press('Enter')
  await expect(option(page, /^Text size: 37/)).toBeVisible()
  await c.getByRole('button', { name: 'Larger' }).click()
  await expect(option(page, /^Text size: 38/)).toBeVisible()
  await c.getByRole('button', { name: 'Smaller' }).click()
  await c.getByRole('button', { name: 'Smaller' }).click()
  await expect(option(page, /^Text size: 36/)).toBeVisible()
  await page.waitForTimeout(500)
  await page.reload()
  await openPill(page, 'Text', 'text')
  await expect(option(page, /^Text size: 36/)).toBeVisible()
})

test('S3. the size is for what is written next', async ({ page }) => {
  await start(page)
  await option(page, /^Text size/).click()
  const num = card(page).getByRole('spinbutton')
  await num.fill('30')
  await num.press('Enter')
  await page.keyboard.press('Escape')
  const ed = page.locator('[data-paper-box="main"] .bn-editor')
  await ed.click({ position: { x: 6, y: 8 } })
  await expect(ed).toBeFocused()
  await page.keyboard.press('End')
  await page.keyboard.type(' next')
  await expect(ed.locator('[data-look-size="30"]').first()).toContainText(
    'next',
  )
})
