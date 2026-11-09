// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/** Phase F3: routines, habits, affirmations, evening review, Briefing. */

async function openHome(page: Page, tab = 'Today') {
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await page.getByRole('tab', { name: tab, exact: true }).click()
}

test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
})

test('tick a habit; a habit missed on an earlier day shows a red cross', async ({
  page,
}) => {
  await page.goto('/')
  await page.clock.install({ time: new Date(2026, 10, 5, 10, 0) })
  await page.reload()
  await openHome(page, 'Routines')
  await page.getByTestId('habit-name-morning').fill('Stretch')
  await page.getByTestId('habit-name-morning').press('Enter')
  const row = page.getByTestId('habit-row').filter({ hasText: 'Stretch' })
  await expect(row).toBeVisible()
  await row.getByRole('checkbox', { name: 'Done: Stretch' }).click()
  await expect(
    row.getByRole('checkbox', { name: 'Not done: Stretch' }),
  ).toBeVisible()

  // Two days later: 5 Nov was ticked, 6 Nov was missed, 7 Nov is still open.
  await page.clock.setSystemTime(new Date(2026, 10, 7, 10, 0))
  await page.reload()
  await openHome(page, 'Routines')
  const cells = page
    .getByTestId('habit-row')
    .getByTestId('habit-strip')
    .locator('li')
  await expect(cells).toHaveCount(7)
  await expect(cells.nth(4)).toHaveAttribute('data-state', 'done') // 5 Nov
  await expect(cells.nth(5)).toHaveAttribute('data-state', 'missed') // 6 Nov
  // The red cross is a line icon (not text), named by the cell's label.
  await expect(cells.nth(5).locator('svg')).toHaveCount(1)
  await expect(cells.nth(5)).toHaveAttribute('aria-label', /: missed$/)
  await expect(cells.nth(6)).toHaveAttribute('data-state', 'open') // today

  // Home shows yesterday's miss in the Briefing.
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await expect(page.getByTestId('brief-missed')).toContainText('Stretch')
  await expect(page.getByTestId('brief-habits')).toContainText(
    '1 habit left today',
  )
})

test('record an affirmation in your own voice and play it back', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'the fake microphone is Chromium only')
  await page.goto('/')
  await openHome(page, 'Routines')
  await page.getByTestId('affirm-name').fill('I can learn this')
  await page.getByTestId('affirm-record').click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Recording' }),
  ).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByTestId('affirm-record').click()
  await expect(page.getByTestId('affirm-recorded')).toBeVisible()
  await page.getByRole('button', { name: 'Add', exact: true }).last().click()

  const row = page
    .getByTestId('habit-row')
    .filter({ hasText: 'I can learn this' })
  await expect(row).toBeVisible()
  const play = row.getByTestId('affirm-play')
  await expect(play).toBeVisible()
  // The sound was kept in the files table.
  const files = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const req = open.result
            .transaction('files', 'readonly')
            .objectStore('files')
            .count()
          req.onsuccess = () => resolve(req.result)
        }
      }),
  )
  expect(files).toBe(1)
  await play.click()
  await expect(play).toHaveAttribute('aria-pressed', /true|false/)
})

test('the evening review writes your answers into today’s journal page', async ({
  page,
}) => {
  await page.goto('/')
  await page.clock.install({ time: new Date(2026, 10, 7, 21, 0) })
  await page.reload()
  await openHome(page)
  const review = page.getByTestId('evening-review')
  await expect(review.getByTestId('evening-body')).toBeVisible() // after 20:00
  await review.getByTestId('evening-answer-0').fill('Finished the essay draft')
  await review.getByTestId('evening-save').click()
  await expect(page.getByText('Saved to today’s journal.')).toBeVisible()

  await page
    .getByTestId('home-screen')
    .getByRole('button', { name: /Open today’s journal/ })
    .click()
  await expect(page.locator('.bn-editor')).toContainText(
    'Finished the essay draft',
  )
  await expect(page.locator('.bn-editor')).toContainText(
    'What went well today?',
  )
})

test('before the set time the review waits, and can be started now', async ({
  page,
}) => {
  await page.goto('/')
  await page.clock.install({ time: new Date(2026, 10, 7, 9, 0) })
  await page.reload()
  await openHome(page)
  const review = page.getByTestId('evening-review')
  await expect(review).toContainText('The review opens at 20:00.')
  await expect(review.getByTestId('evening-body')).toHaveCount(0)
  await review.getByTestId('evening-start').click()
  await expect(review.getByTestId('evening-body')).toBeVisible()
})

test('Briefing lines at the top of Today', async ({ page }) => {
  await page.goto('/')
  await openHome(page)
  const brief = page.getByTestId('briefing')
  await expect(brief).toBeVisible()
  await expect(brief.getByTestId('brief-top3')).toContainText('Top 3')
  await expect(brief.getByTestId('brief-cards')).toContainText('card')
})
