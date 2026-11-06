// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  openSearchPopup,
  pageAction,
  showSidebar,
} from './helpers.ts'

/** Phase F1: tasks, inbox, matrix, completed, carry, day record, notes link. */

async function openHome(page: Page, tab: 'Today' | 'Tasks' = 'Tasks') {
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await page.getByRole('tab', { name: tab, exact: true }).click()
}

async function addTask(page: Page, text: string) {
  await page.getByTestId('quick-add').fill(text)
  await page.getByTestId('quick-add').press('Enter')
}

const taskRow = (page: Page, title: string) =>
  page.getByTestId('task-row').filter({ hasText: title })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('add to the inbox, drag to the Do box, tick, and find it under Completed', async ({
  page,
}) => {
  await openHome(page)
  await addTask(page, 'Write essay')
  await addTask(page, 'Call Sam tomorrow')
  const inbox = page.getByRole('region', { name: 'Inbox' })
  await expect(inbox.getByTestId('task-row')).toHaveCount(2)
  // The day word is read and removed from the title.
  await expect(
    inbox.getByTestId('task-row').filter({ hasText: 'Call Sam' }),
  ).not.toContainText('tomorrow')

  // Nothing sorts itself: the matrix is empty until we drag.
  await expect(page.getByTestId('box-1').getByTestId('task-row')).toHaveCount(0)
  const title = taskRow(page, 'Write essay').locator('div.cursor-grab')
  await title.dragTo(page.getByTestId('box-1'), {
    targetPosition: { x: 80, y: 60 },
  })
  await expect(page.getByTestId('box-1').getByTestId('task-row')).toContainText(
    'Write essay',
  )
  await expect(inbox.getByTestId('task-row')).toHaveCount(1)

  // Tick it: it moves to Completed.
  await page.getByRole('checkbox', { name: 'Done: Write essay' }).click()
  await expect(page.getByTestId('box-1').getByTestId('task-row')).toHaveCount(0)
  const completed = page.getByRole('region', { name: 'Completed' })
  await expect(completed).toContainText('Write essay')

  // It stays after a reload.
  await page.reload()
  await openHome(page)
  await expect(page.getByRole('region', { name: 'Completed' })).toContainText(
    'Write essay',
  )
})

test('the … menu fills the matrix without dragging, and carries a task', async ({
  page,
}) => {
  await openHome(page)
  await addTask(page, 'Plan trip')
  await taskRow(page, 'Plan trip')
    .getByRole('button', { name: 'Options for Plan trip' })
    .click()
  await page.getByRole('menuitem', { name: 'Move to Schedule' }).click()
  await expect(page.getByTestId('box-2').getByTestId('task-row')).toContainText(
    'Plan trip',
  )

  await taskRow(page, 'Plan trip')
    .getByRole('button', { name: 'Options for Plan trip' })
    .click()
  await page.getByRole('menuitem', { name: 'Tomorrow' }).click()
  // It stays in its box, and shows up under Upcoming.
  await expect(
    page.getByRole('region', { name: 'Upcoming' }).getByTestId('task-row'),
  ).toContainText('Plan trip')
  await expect(page.getByTestId('box-2').getByTestId('task-row')).toContainText(
    'Plan trip',
  )
})

test('today’s journal page shows a read-only Day record', async ({ page }) => {
  // A fixed clock: the journal follows the calendar, Home the day-start hour.
  await page.clock.setFixedTime(new Date(2026, 10, 7, 12))
  await page.reload()
  await openHome(page)
  await addTask(page, 'Finish report today')
  await page.getByRole('checkbox', { name: 'Done: Finish report' }).click()
  await openHome(page, 'Today')
  await page
    .getByTestId('home-screen')
    .getByRole('button', { name: /Open today’s journal/ })
    .click()
  const record = page.getByTestId('day-record')
  await expect(record).toBeVisible()
  await expect(record).toContainText('Finish report')
  await expect(record).toContainText('Done')
})

test('a checklist line sent to Home: ticking in Home ticks the note, and back', async ({
  page,
}) => {
  await createNotebook(page, 'Study', 'Plan page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('[] Read chapter three')
  await page.waitForTimeout(900)
  await expect(page.locator('.bn-editor input[type="checkbox"]')).toHaveCount(1)

  // Send it to Home from the Features search.
  await openSearchPopup(page)
  const dialog = page.getByRole('dialog', { name: 'Search' })
  await dialog.getByRole('button', { name: 'Features' }).click()
  await dialog
    .getByRole('combobox', { name: 'Search everything' })
    .fill('send to home')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Added to Home.')).toBeVisible()

  // Home has the task (the line is planned for today).
  await openHome(page)
  await expect(taskRow(page, 'Read chapter three')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Done: Read chapter three' }).click()
  await page.waitForTimeout(600) // the note's line is written just after

  // The note's line is ticked. Open the page again to read the saved state.
  await showSidebar(page)
  await page.locator('[data-space="notebooks"]').click()
  await page.getByRole('button', { name: 'Plan page', exact: true }).click()
  await expect(page.locator('.bn-editor input[type="checkbox"]')).toBeChecked()

  // Untick the line in the note: the task opens again.
  await page.locator('.bn-editor input[type="checkbox"]').uncheck()
  await page.waitForTimeout(900)
  await openHome(page)
  await expect(
    page.getByRole('checkbox', { name: 'Done: Read chapter three' }),
  ).toBeVisible()
})

test('the project filter and a new project work', async ({ page }) => {
  await openHome(page)
  await page.getByTestId('new-project').fill('Thesis')
  await page.getByTestId('new-project').press('Enter')
  await expect(page.getByRole('region', { name: 'Projects' })).toContainText(
    'Thesis',
  )
  await addTask(page, 'Outline chapter 1')
  await taskRow(page, 'Outline chapter 1')
    .getByRole('button', { name: 'Options for Outline chapter 1' })
    .click()
  await page.getByRole('menuitem', { name: 'Project…' }).click()
  await page.getByRole('menuitemradio', { name: 'Thesis' }).click()
  await expect(taskRow(page, 'Outline chapter 1')).toContainText('Thesis')
  void pageAction
})
