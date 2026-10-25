import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared steps for end-to-end tests, written the way a user works:
 * by visible names and button titles, not internal ids.
 */

export const sidebar = (page: Page) => page.locator('aside')

/** The sidebar row (notebook or page) whose name button is `name`. */
export function row(page: Page, name: string): Locator {
  return sidebar(page)
    .locator('div.group')
    .filter({ has: page.getByRole('button', { name, exact: true }) })
    .first()
}

/** Clicks a hover action (by its title) on a sidebar row. */
export async function rowAction(page: Page, name: string, action: string) {
  const r = row(page, name)
  await r.hover()
  await r.getByTitle(action, { exact: true }).click()
}

/** Types a page title into the open page's title field. */
export async function setTitle(page: Page, title: string) {
  const field = page.getByRole('textbox', { name: 'Page title' })
  await field.click()
  await field.fill(title)
  await expect(
    sidebar(page).getByRole('button', { name: title, exact: true }),
  ).toBeVisible()
}

/**
 * Creates a notebook named `name`. The app also creates and opens a first
 * page, which is titled `firstPage`.
 */
export async function createNotebook(
  page: Page,
  name: string,
  firstPage: string,
) {
  const empty = page.getByRole('button', { name: 'Create notebook' })
  if (await empty.isVisible()) await empty.click()
  else await sidebar(page).getByTitle('New notebook').click()

  const nameField = sidebar(page).getByRole('textbox', { name: 'Name' })
  await nameField.fill(name)
  await nameField.press('Enter')
  await expect(
    sidebar(page).getByRole('button', { name, exact: true }),
  ).toBeVisible()
  await setTitle(page, firstPage)
}

/** Adds a page to a notebook (or a sub-page to a page) and titles it. */
export async function addPage(
  page: Page,
  parentName: string,
  title: string,
  kind: 'page' | 'sub-page' = 'page',
) {
  await rowAction(
    page,
    parentName,
    kind === 'page' ? 'Add page' : 'Add sub-page',
  )
  await page.getByRole('menuitem', { name: 'Blank page' }).click()
  // New pages open with the cursor in the title.
  const field = page.getByRole('textbox', { name: 'Page title' })
  await expect(field).toBeFocused()
  await page.keyboard.type(title)
  await expect(
    sidebar(page).getByRole('button', { name: title, exact: true }),
  ).toBeVisible()
}

/** Opens a page from the sidebar. */
export async function openPage(page: Page, title: string) {
  await sidebar(page).getByRole('button', { name: title, exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    title,
  )
}

/** Types text into the open page's editor and waits for autosave. */
export async function typeInEditor(page: Page, text: string) {
  await page.locator('.bn-editor').click()
  await page.keyboard.type(text)
  await page.waitForTimeout(800) // autosave runs ~0.5 s after typing stops
}

/** The Templates section's template names, in order. */
export async function templateNames(page: Page): Promise<string[]> {
  const rows = sidebar(page)
    .locator('div.group')
    .filter({ has: page.locator('span', { hasText: /^(📋|☀)$/ }) })
  return (await rows.allInnerTexts()).map((t) =>
    t.replace(/[📋☀×]/gu, '').trim(),
  )
}

/** Types a "/" command in the editor and picks the first match. */
export async function slashCommand(page: Page, query: string) {
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(`/${query}`)
  await page.keyboard.press('Enter')
}

/** Clicks a button in the open confirm dialog. */
export async function confirmDialog(page: Page, button: string) {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: button, exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

/** Opens the Trash section (if closed) and returns it. */
export async function openTrash(page: Page): Promise<Locator> {
  const toggle = sidebar(page).getByRole('button', { name: /^Trash/ })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
  return sidebar(page)
}

/** Trash entries, as "title — detail" strings. */
export async function trashEntries(page: Page): Promise<string[]> {
  const entries = sidebar(page)
    .locator('div.group')
    .filter({ has: page.getByTitle('Restore', { exact: true }) })
  const texts = await entries.allInnerTexts()
  return texts.map((t) =>
    t
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !['📓', '📄', '↺', '×'].includes(s))
      .join(' — '),
  )
}

/** Clicks Restore or Delete forever on a Trash entry. */
export async function trashAction(
  page: Page,
  title: string,
  action: 'Restore' | 'Delete forever',
) {
  const entry = sidebar(page)
    .locator('div.group')
    .filter({ has: page.getByTitle('Restore', { exact: true }) })
    .filter({ hasText: title })
    .first()
  await entry.hover()
  await entry.getByTitle(action, { exact: true }).click()
}
