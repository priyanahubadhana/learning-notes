// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/** Phase F2: Top 3, the project timer, Focus (Pomodoro), plan and reports. */

async function openHome(page: Page, tab = 'Today') {
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await page.getByRole('tab', { name: tab, exact: true }).click()
}

async function addTask(page: Page, text: string) {
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await page.getByTestId('quick-add').fill(text)
  await page.getByTestId('quick-add').press('Enter')
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
}

const clockText = (page: Page) => page.getByTestId('timer-clock')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Top 3: choose up to three, count them, and a fourth is refused', async ({
  page,
}) => {
  await openHome(page)
  for (const title of ['One', 'Two', 'Three', 'Four']) {
    await addTask(page, title)
  }
  const top3 = page.getByTestId('top3')
  await expect(page.getByTestId('top3-count')).toHaveText('0 of 3')
  for (const title of ['One', 'Two', 'Three']) {
    await top3.getByTestId('top3-add').click()
    await top3.getByRole('button', { name: title, exact: true }).click()
  }
  await expect(top3.getByTestId('top3-row')).toHaveCount(3)
  await expect(top3.getByTestId('top3-add')).toHaveCount(0)
  await top3.getByRole('checkbox', { name: 'Done: One' }).click()
  await expect(page.getByTestId('top3-count')).toHaveText('1 of 3')
  // It stays after a reload.
  await page.reload()
  await openHome(page)
  await expect(page.getByTestId('top3-row')).toHaveCount(3)
  await expect(page.getByTestId('top3-count')).toHaveText('1 of 3')
})

test('the timer keeps running after a reload and shows on every screen', async ({
  page,
}) => {
  await openHome(page)
  await page.getByTestId('timer-toggle').click()
  await expect(page.getByTestId('timer-chip')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('timer-chip')).toBeVisible()
  // Another screen still shows it.
  await page.locator('[data-space="notebooks"]').click()
  await expect(page.getByTestId('timer-chip')).toBeVisible()
  await page
    .getByTestId('timer-chip')
    .getByRole('button', { name: 'Stop' })
    .click()
  await expect(page.getByTestId('timer-chip')).toHaveCount(0)
})

test('tracked time shows in Reports per project, and Still working? appears after 2 hours', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 10, 7, 10, 0) })
  await page.reload()
  await openHome(page, 'Tasks')
  await page.getByTestId('new-project').fill('Thesis')
  await page.getByTestId('new-project').press('Enter')
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await page
    .getByLabel('Project', { exact: true })
    .selectOption({ label: 'Thesis' })
  await page.getByTestId('timer-toggle').click()
  await page.clock.fastForward('30:00')
  await expect(clockText(page)).toHaveText(/^(29|30):\d\d$/)
  await page.getByTestId('timer-toggle').click()
  await page.getByRole('tab', { name: 'Reports', exact: true }).click()
  await expect(page.getByTestId('report-row')).toContainText('Thesis')
  await expect(page.getByTestId('report-total')).toHaveText('30 min')

  // A new run: after two hours it asks.
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await page.getByTestId('timer-toggle').click()
  await page.clock.fastForward('02:01:00')
  const ask = page.getByTestId('still-working')
  await expect(ask).toBeVisible()
  await ask.getByRole('button', { name: 'Keep going' }).click()
  await expect(ask).toHaveCount(0)
})

test('Focus mode walks 25 minutes focus, 5 break, then the next round', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 10, 7, 10, 0) })
  await page.reload()
  await openHome(page)
  await page.getByRole('radio', { name: 'Focus', exact: true }).click()
  await page.getByTestId('timer-toggle').click()
  await expect(clockText(page)).toHaveText(/^2[45]:\d\d$/)
  await expect(page.getByText('Focus, round 1').first()).toBeVisible()
  await page.clock.fastForward('25:00')
  await expect(page.getByText('Break after round 1').first()).toBeVisible()
  await expect(clockText(page)).toHaveText(/^[45]:\d\d$/)
  await page.clock.fastForward('05:00')
  await expect(page.getByText('Focus, round 2').first()).toBeVisible()
  await page.getByTestId('timer-toggle').click()
  // Reports count the focus time only (25 + 5 min of the second round = 30).
  await page.getByRole('tab', { name: 'Reports', exact: true }).click()
  await expect(page.getByTestId('report-total')).toHaveText('25 min')
})

test('Plan: place a task with "Add at" and add a free block', async ({
  page,
}) => {
  await openHome(page)
  await addTask(page, 'Write essay')
  await page.getByRole('tab', { name: 'Plan', exact: true }).click()
  await page
    .getByLabel('Add Write essay at a time')
    .selectOption({ label: '09:00' })
  await expect(
    page.getByTestId('slot-9').getByTestId('plan-block'),
  ).toContainText('Write essay')
  await page.getByTestId('plan-free-title').fill('Lunch')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(
    page.getByTestId('slot-9').getByTestId('plan-block'),
  ).toHaveCount(2)
  // Later by 15 minutes, then remove.
  const lunch = page.getByTestId('plan-block').filter({ hasText: 'Lunch' })
  await lunch.getByRole('button', { name: '15 min later' }).click()
  await expect(lunch).toContainText('09:15')
  await lunch.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByTestId('plan-block')).toHaveCount(1)
})
