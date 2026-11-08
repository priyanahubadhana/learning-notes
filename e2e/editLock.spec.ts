import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  pageAction,
  openPage,
  rowAction,
  sidebar,
  typeInEditor,
} from './helpers.ts'

/**
 * Queue 3c: the edit lock. A switch makes a page, or a whole notebook,
 * read-only. No passcode. It is not the privacy lock (no PIN, nothing hidden).
 */

/** The notebook screen's Tab options menu, then back to the first page. */
async function lockNotebook(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).first().click()
  await page.getByRole('button', { name: 'Tab options' }).click()
  await page.getByRole('menuitem', { name: 'Lock editing (all pages)' }).click()
  await openPage(page, 'Day one')
}

const editor = (page: Page) => page.locator('.bn-editor')
const title = (page: Page) => page.getByRole('textbox', { name: 'Page title' })

test('a page: lock editing stops typing and the title, one tap on the bar unlocks, it survives a reload', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Day one')
  await typeInEditor(page, 'first line')
  await pageAction(page, 'Lock editing')
  const bar = page.getByTestId('edit-lock-bar')
  await expect(bar).toContainText('Locked — tap to unlock')
  await expect(title(page)).toHaveAttribute('readonly', '')
  await editor(page)
    .click({ force: true })
    .catch(() => {})
  await page.keyboard.type(' more')
  await page.waitForTimeout(700)
  await expect(editor(page)).toContainText('first line')
  await expect(editor(page)).not.toContainText('more')
  // No passcode was asked for; the privacy lock is untouched.
  await expect(page.getByTestId('lock-screen')).toHaveCount(0)

  await page.reload()
  await expect(page.getByTestId('edit-lock-bar')).toBeVisible()
  await page.getByTestId('edit-lock-bar').click()
  await expect(page.getByTestId('edit-lock-bar')).toHaveCount(0)
  await typeInEditor(page, ' more')
  await expect(editor(page)).toContainText('more')
})

test('under a locked notebook no page and no notebook can be deleted', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Day one')
  await addPage(page, 'Diary', 'Day two')
  await lockNotebook(page, 'Diary')
  await rowAction(page, 'Day two', 'Delete page')
  await expect(page.getByRole('status')).toContainText('locked')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    sidebar(page).getByRole('button', { name: 'Day two', exact: true }),
  ).toBeVisible()
  await rowAction(page, '🔏 Diary', 'Delete notebook')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(sidebar(page).getByText('Diary')).toBeVisible()
})

test('a notebook: locks all its pages, shown on the bar, one tap unlocks', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Day one')
  await typeInEditor(page, 'first line')
  await lockNotebook(page, 'Diary')
  await expect(page.getByTestId('edit-lock-bar')).toContainText(
    'Notebook locked — tap to unlock',
  )
  await expect(title(page)).toHaveAttribute('readonly', '')
  // The page's own menu offers no separate switch under a locked notebook.
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(
    page.getByRole('menuitem', { name: /Lock editing/ }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByTestId('edit-lock-bar').click()
  await expect(page.getByTestId('edit-lock-bar')).toHaveCount(0)
  await typeInEditor(page, ' more')
  await expect(editor(page)).toContainText('more')
})
