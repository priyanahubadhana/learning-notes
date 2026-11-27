import { expect, test, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Task 2A.4, TB-01b: Undo and Redo live in the page top bar; the < > arrows go. */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const top = (page: Page) => page.locator('header[data-shell-top]')

async function open(page: Page, flags: string) {
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${flags}`)
  await expect(page.locator('.sh-frame')).toBeVisible()
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.waitForTimeout(900)
}

test('TB-01b flag on: top bar has Undo and Redo before the page path, no Back or Forward', async ({
  page,
}) => {
  await open(page, 'foundation.shell,toolbar.v8')
  await expect(top(page).getByTestId('history-undo')).toBeVisible()
  await expect(top(page).getByTestId('history-redo')).toBeVisible()
  await expect(top(page).getByRole('button', { name: 'Back' })).toHaveCount(0)
  await expect(top(page).getByRole('button', { name: 'Forward' })).toHaveCount(
    0,
  )
  const u = (await top(page).getByTestId('history-undo').boundingBox())!
  const c = (await top(page).locator('.sh-crumbs').boundingBox())!
  expect(u.x + u.width).toBeLessThanOrEqual(c.x + 1)
  expect(u.width).toBeGreaterThanOrEqual(43.5)
  expect(u.height).toBeGreaterThanOrEqual(43.5)
})

test('TB-01b flag on: the tool bar no longer has Undo or Redo', async ({
  page,
}) => {
  await open(page, 'foundation.shell,toolbar.v8')
  await expect(page.getByTestId('v8-bar')).toBeVisible()
  await expect(page.getByTestId('v8-undo')).toHaveCount(0)
  await expect(page.getByTestId('v8-redo')).toHaveCount(0)
})

test('TB-01b flag on: the top bar pair undoes and redoes typing', async ({
  page,
}) => {
  await open(page, 'foundation.shell,toolbar.v8')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line')
  await page.waitForTimeout(900)
  await top(page).getByTestId('history-undo').click()
  await expect(page.locator('.bn-editor')).not.toContainText('Second line')
  await top(page).getByTestId('history-redo').click()
  await expect(page.locator('.bn-editor')).toContainText('Second line')
})

test('TB-01b flag on: tapping the first part of the page path leaves the page', async ({
  page,
}) => {
  await open(page, 'foundation.shell,toolbar.v8')
  await expect(page.locator('.bn-editor')).toBeVisible()
  await top(page).locator('.sh-crumbs button').first().click()
  await expect(page.locator('.bn-editor')).toHaveCount(0)
})

test('TB-01b flag on: swipe back (browser back) leaves the page; forward returns', async ({
  page,
}) => {
  await open(page, 'foundation.shell,toolbar.v8')
  await expect(page.locator('.bn-editor')).toBeVisible()
  await page.goBack()
  await expect(page.locator('.bn-editor')).toHaveCount(0)
  await page.goForward()
  await expect(page.locator('.bn-editor')).toBeVisible()
})

test('TB-01b flag on, phone width: Undo and Redo show in the top bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'foundation.shell,toolbar.v8')
  await expect(top(page).getByTestId('history-undo')).toBeVisible()
  await expect(top(page).getByTestId('history-redo')).toBeVisible()
  await expect(top(page).getByRole('button', { name: 'Back' })).toHaveCount(0)
})

test('TB-01b the SH-05 setting still hides the pair on a computer', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('learning-notes:general.showUndoRedo', '"off"')
    }
  })
  await page.setViewportSize({ width: 1180, height: 820 })
  await startInMode(page, 'computer')
  await page.goto('/?flags=foundation.shell,toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await expect(top(page).getByTestId('history-undo')).toHaveCount(0)
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:general.showUndoRedo', '"on"'),
  )
  await page.reload()
  await expect(top(page).getByTestId('history-undo')).toBeVisible()
})

test('TB-01b flag off: the arrows stay', async ({ page }) => {
  await open(page, 'foundation.shell')
  await expect(top(page).getByRole('button', { name: 'Back' })).toBeVisible()
  await expect(top(page).getByRole('button', { name: 'Forward' })).toHaveCount(
    1,
  )
})

test('TB-01b new frame off, v8 on: the tool bar keeps its own Undo and Redo', async ({
  page,
}) => {
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expect(page.getByTestId('v8-undo')).toBeVisible()
  await expect(page.getByTestId('v8-redo')).toBeVisible()
})
