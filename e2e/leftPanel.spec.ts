// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  hideSidebar,
  openPage,
  showSidebar,
  sidebar,
  rowAction,
} from './helpers.ts'
import {
  enterCode,
  lockScreen,
  lockThisPage,
  openLockSettings,
  setCode,
} from './lockHelpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('the left panel lists pages, the outline and audio', async ({ page }) => {
  await createNotebook(page, 'Panel NB', 'First page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('# Big topic ')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Some words under it')
  await page.waitForTimeout(800)
  await addPage(page, 'Panel NB', 'Second page')
  await openPage(page, 'First page')

  await page.getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await expect(panel).toBeVisible()

  // Pages: a card per page, with the first lines of text.
  const cards = panel.getByTestId('panel-page')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('First page')
  await expect(cards.first()).toContainText('Some words under it')

  // Outline: the heading, and a tap jumps to it.
  await panel.getByRole('tab', { name: 'Outline' }).click()
  await expect(panel.getByRole('button', { name: 'Big topic' })).toBeVisible()
  await panel.getByRole('button', { name: 'Big topic' }).click()

  // Audio: nothing recorded yet.
  await panel.getByRole('tab', { name: 'Audio' }).click()
  await expect(panel.getByText('No recordings on this page yet.')).toBeVisible()

  // Pages again: opening another page from the panel.
  await panel.getByRole('tab', { name: 'Pages' }).click()
  await panel
    .getByTestId('panel-page')
    .filter({ hasText: 'Second page' })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Second page',
  )

  // The panel button closes it.
  await page.getByTestId('panel-toggle').click()
  await expect(panel).toBeHidden()
})

test('long page names wrap to two lines in the sidebar', async ({ page }) => {
  const long = 'A long page name that needs two lines'
  await createNotebook(page, 'Wrap NB', long)
  await showSidebar(page)
  const name = sidebar(page).getByRole('button', { name: long, exact: true })
  const box = await name.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThan(30)
  expect(box?.height ?? 99).toBeLessThan(48) // two lines, not three
  await hideSidebar(page)
})

test('pages can be dragged to a new place, and Undo puts them back', async ({
  page,
}) => {
  await createNotebook(page, 'Drag NB', 'Alpha')
  await addPage(page, 'Drag NB', 'Beta')
  await addPage(page, 'Drag NB', 'Gamma')
  await showSidebar(page)

  const names = () =>
    sidebar(page)
      .getByTestId('page-row')
      .getByRole('button', { name: /^(Alpha|Beta|Gamma)$/ })
  await expect(names()).toHaveText(['Alpha', 'Beta', 'Gamma'])

  const rows = sidebar(page).getByTestId('page-row')
  await rows
    .filter({ hasText: 'Gamma' })
    .dragTo(rows.filter({ hasText: 'Alpha' }), {
      targetPosition: { x: 40, y: 2 },
    })
  await expect(names()).toHaveText(['Gamma', 'Alpha', 'Beta'])

  await page.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await expect(names()).toHaveText(['Alpha', 'Beta', 'Gamma'])
})

test('pages can be moved with the keyboard buttons', async ({ page }) => {
  await createNotebook(page, 'Move NB', 'One')
  await addPage(page, 'Move NB', 'Two')
  await showSidebar(page)
  const names = () =>
    sidebar(page)
      .getByTestId('page-row')
      .getByRole('button', { name: /^(One|Two)$/ })
  await expect(names()).toHaveText(['One', 'Two'])
  await rowAction(page, 'Two', 'Move up')
  await expect(names()).toHaveText(['Two', 'One'])
})

test('the PIN field has a name, a placeholder and a visible border', async ({
  page,
}) => {
  await createNotebook(page, 'Lock NB', 'Secret')
  await openLockSettings(page)
  await setCode(page, 'PIN', '2468')
  await openPage(page, 'Secret')
  await lockThisPage(page)

  const field = page.getByRole('textbox', { name: 'Enter your PIN' })
  await expect(field).toHaveAttribute('placeholder', 'Type your PIN here')
  const border = await field.evaluate((el) => {
    const s = getComputedStyle(el)
    return { width: s.borderTopWidth, colour: s.borderTopColor }
  })
  expect(parseFloat(border.width)).toBeGreaterThanOrEqual(2)
  await enterCode(page, '2468')
  await expect(lockScreen(page)).toBeHidden()
})

test('Outline view options: depth, toggles, numbers, folding and tapping a toggle', async ({
  page,
}) => {
  await createNotebook(page, 'Outline NB', 'Long page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('# Alpha ')
  await page.keyboard.press('Enter')
  await page.keyboard.type('## Beta ')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/toggle')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Fold title')
  await page.keyboard.press('Enter')
  await page.keyboard.type('inside words')
  await page.waitForTimeout(800)

  await page.getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await panel.getByRole('tab', { name: 'Outline' }).click()
  await expect(
    panel.getByRole('button', { name: 'Alpha', exact: true }),
  ).toBeVisible()
  await expect(
    panel.getByRole('button', { name: 'Beta', exact: true }),
  ).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Fold title' })).toHaveCount(0)

  // Headings 1 only hides Beta.
  await panel.getByLabel('Headings shown').selectOption('1')
  await expect(
    panel.getByRole('button', { name: 'Beta', exact: true }),
  ).toHaveCount(0)
  await panel.getByLabel('Headings shown').selectOption('3')

  // Toggles and numbers.
  await panel.getByRole('button', { name: 'Toggles' }).click()
  await expect(panel.getByRole('button', { name: 'Fold title' })).toBeVisible()
  await panel.getByRole('button', { name: '1, 1.1' }).click()
  await expect(panel.getByRole('button', { name: /^1\s*Alpha/ })).toBeVisible()
  await expect(
    panel.getByRole('button', { name: /^1\.1\s*Beta/ }),
  ).toBeVisible()

  // Folding Alpha hides what is under it.
  await panel.getByRole('button', { name: 'Fold or unfold' }).first().click()
  await expect(panel.getByRole('button', { name: /Beta/ })).toHaveCount(0)
  await panel.getByRole('button', { name: 'Fold or unfold' }).first().click()

  // Remembered on this device.
  await page.reload()
  await expect(page.locator('.bn-editor')).toBeVisible()
  await page.waitForTimeout(500)
  if (!(await page.getByTestId('left-panel').isVisible())) {
    await page.getByTestId('panel-toggle').click()
  }
  await page
    .getByTestId('left-panel')
    .getByRole('tab', { name: 'Outline' })
    .click()
  await expect(
    page.getByTestId('left-panel').getByRole('button', { name: 'Fold title' }),
  ).toBeVisible()

  // Closing the toggle on the page, then tapping it in the Outline opens it.
  const chevron = page.locator('.bn-editor .bn-toggle-button').first()
  if ((await chevron.getAttribute('aria-expanded')) === 'true') {
    await chevron.click()
  }
  await expect(chevron).toHaveAttribute('aria-expanded', 'false')
  await page
    .getByTestId('left-panel')
    .getByRole('button', { name: 'Fold title' })
    .click()
  await expect(chevron).toHaveAttribute('aria-expanded', 'true')
})
