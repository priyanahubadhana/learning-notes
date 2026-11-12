// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 history and reset: SET-B10, B11, B13, B14 (and the toast of B15). */

const V3 = '/?flags=settings.v3#/settings/review'
const row = (page: Page, id: string) =>
  page.locator(`[data-setting-id="${id}"]`)
const preview = (page: Page, id: string) =>
  row(page, id).locator('[data-row-preview]')
/** The toast's own button (the top-bar buttons have an icon and no text). */
const toastUndo = (page: Page) =>
  page.locator('button').filter({ hasText: /^Undo$/ })

async function open(page: Page) {
  await page.goto(V3)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(row(page, 'review.scheduler')).toBeVisible()
}

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

test('SET-B10 a change shows "Changed X" with Undo, and the top Undo / Redo follow', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByTestId('sv3-undo')).toBeDisabled()
  await row(page, 'review.scheduler')
    .getByRole('radio', { name: 'Simple steps' })
    .click()
  await expect(page.getByText('Changed Scheduler')).toBeVisible()
  await expect(toastUndo(page)).toBeVisible()
  await expect(page.getByTestId('sv3-undo')).toBeEnabled()

  await page.getByTestId('sv3-undo').click()
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: FSRS (smart)',
  )
  await expect(page.getByTestId('sv3-redo')).toBeEnabled()
  await page.getByTestId('sv3-redo').click()
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: Simple steps',
  )
})

test('SET-B10 Ctrl+Z and Ctrl+Y work when no text field has the focus', async ({
  page,
}) => {
  await open(page)
  await row(page, 'review.scheduler')
    .getByRole('radio', { name: 'Simple steps' })
    .click()
  await page.locator('h1').click()
  await page.keyboard.press('Control+z')
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: FSRS (smart)',
  )
  await page.keyboard.press('Control+y')
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: Simple steps',
  )
})

test('SET-B10 Ctrl+Z leaves a focused text field alone', async ({ page }) => {
  await open(page)
  await row(page, 'review.scheduler')
    .getByRole('radio', { name: 'Simple steps' })
    .click()
  await page.getByRole('searchbox', { name: 'Search settings' }).click()
  await page.keyboard.press('Control+z')
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: Simple steps',
  )
})

test('SET-B11 Undo brings back the value, the row, the preview and the stored value together', async ({
  page,
}) => {
  await open(page)
  const r = row(page, 'review.scheduler')
  await r.getByRole('radio', { name: 'Simple steps' }).click()
  await expect(r.locator('[data-row-reset]')).toBeVisible()
  await toastUndo(page).click()
  await expect(r.getByRole('radio', { name: 'FSRS (smart)' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: FSRS (smart)',
  )
  await expect(r.locator('[data-row-reset]')).toHaveCount(0)
  // Today's screen reads the same stored value.
  await page.goto('/#/settings/review')
  await expect(
    page.locator('[data-setting-id="review.scheduler"] select'),
  ).toHaveValue('fsrs')
})

test('SET-B15 the row Reset link also gives a toast with Undo', async ({
  page,
}) => {
  await open(page)
  const r = row(page, 'review.scheduler')
  await r.getByRole('radio', { name: 'Simple steps' }).click()
  await r.locator('[data-row-reset]').click()
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: FSRS (smart)',
  )
  await expect(toastUndo(page)).toBeVisible()
  await toastUndo(page).click()
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: Simple steps',
  )
})

test('SET-B13 / B14 Reset this section resets only this section, as one Undo step', async ({
  page,
}) => {
  await open(page)
  // Two settings changed in Review ...
  await row(page, 'review.scheduler')
    .getByRole('radio', { name: 'Simple steps' })
    .click()
  await row(page, 'review.practiceOrder')
    .getByRole('radio', { name: 'Shuffle' })
    .click()
  // ... and one in General, which must stay.
  await page.locator('[data-section="general"]').click()
  await row(page, 'general.scrollHints')
    .getByRole('radio', { name: 'Off' })
    .click()
  await page.locator('[data-section="review"]').click()

  await page.locator('[data-section-reset]').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Reset 2 settings in Review')
  const w = (await dialog.boundingBox())!
  expect(w.width).toBeLessThanOrEqual(420)
  await dialog.getByRole('button', { name: 'Reset' }).click()

  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: FSRS (smart)',
  )
  await expect(preview(page, 'review.practiceOrder')).not.toHaveText(
    'Now: Shuffle',
  )
  await expect(page.getByText('Section reset')).toBeVisible()

  // Nothing else changed.
  await page.locator('[data-section="general"]').click()
  await expect(preview(page, 'general.scrollHints')).toHaveText('Now: Off')
  await page.locator('[data-section="review"]').click()

  // One Undo gives both back.
  await toastUndo(page).click()
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: Simple steps',
  )
  await expect(preview(page, 'review.practiceOrder')).toHaveText('Now: Shuffle')
})

test('SET-B13 cancel changes nothing; a section already at defaults says so', async ({
  page,
}) => {
  await open(page)
  await page.locator('[data-section-reset]').click()
  await expect(page.getByText('already at its default')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await row(page, 'review.scheduler')
    .getByRole('radio', { name: 'Simple steps' })
    .click()
  await page.locator('[data-section-reset]').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(preview(page, 'review.scheduler')).toHaveText(
    'Now: Simple steps',
  )
})
