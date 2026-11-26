// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
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
  // Size-aware (B11): this test is about the docked desktop layout.
  await page.setViewportSize({ width: 1336, height: 720 })
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

// Owner's rule, 25 Nov 2026 (DECISIONS.md, "two more answers"): on the iPad a
// long page name may take AT MOST 3 lines in the sidebar (the owner tested it:
// 3 lines looked neat). On the PC width it still wraps to two lines.
test('long page names wrap to two lines on PC and at most three on the iPad', async ({
  page,
}, testInfo) => {
  const long = 'A long page name that needs two lines'
  await createNotebook(page, 'Wrap NB', long)
  await showSidebar(page)
  const name = sidebar(page).getByRole('button', { name: long, exact: true })
  const box = await name.boundingBox()
  const tablet = testInfo.project.name.includes('ipad')
  expect(box?.height ?? 0).toBeGreaterThan(30)
  // PC: two lines, not three. iPad: up to three lines, fails at four.
  // Measured in lines, not px: the row (and so the button, a flex item) is
  // taller than its text in the CI WebKit (80 px there), and the owner's rule
  // is about lines. A line counts when its text box is inside the button.
  const lines = await name.evaluate((b) => {
    // Text only (an element's own box inside the button is not a line), and
    // only what lies inside the button: clamped lines are cut off below it.
    const at = b.getBoundingClientRect()
    const tops = new Set<number>()
    const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const r = document.createRange()
      r.selectNodeContents(n)
      for (const q of r.getClientRects())
        if (q.width > 0 && q.top >= at.top - 1 && q.bottom <= at.bottom + 1)
          tops.add(Math.round(q.top))
    }
    return tops.size
  })
  expect(lines).toBeLessThanOrEqual(tablet ? 3 : 2)
  await hideSidebar(page)
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
