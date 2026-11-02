// Browser types for helpers that run code inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared steps for end-to-end tests, written the way a user works:
 * by visible names and button titles, not internal ids.
 */

export const sidebar = (page: Page) => page.locator('aside')

/** On a phone the sidebar is a drawer: opens it (nothing to do on a computer). */
export async function showSidebar(page: Page) {
  const open = page.getByRole('button', { name: 'Open menu' })
  await sidebar(page).waitFor({ state: 'attached' }) // the app has loaded
  // The dim backdrop exists exactly while the drawer is meant to be open.
  const meantOpen = await page
    .getByRole('button', { name: 'Close menu' })
    .isVisible()
  if ((await open.isVisible()) && !meantOpen) {
    await open.click()
    await expect(sidebar(page)).toBeVisible()
  }
}

/** The sidebar, opened first if it is a phone drawer. */
export async function openSidebar(page: Page) {
  await showSidebar(page)
  return sidebar(page)
}

/** Closes the phone drawer again (Esc), if it is open. */
export async function hideSidebar(page: Page) {
  if (await page.getByRole('button', { name: 'Close menu' }).isVisible()) {
    await page.keyboard.press('Escape')
    await expect(sidebar(page)).toBeHidden()
  }
}

/** The sidebar row (notebook or page) whose name button is `name`. */
export function row(page: Page, name: string): Locator {
  return sidebar(page)
    .locator('div.group')
    .filter({ has: page.getByRole('button', { name, exact: true }) })
    .first()
}

/** Clicks a hover action (by its title) on a sidebar row. */
export async function rowAction(page: Page, name: string, action: string) {
  await showSidebar(page)
  const r = row(page, name)
  await r.hover()
  await r.getByLabel(action, { exact: true }).click()
}

/** Chooses an item in the open page's ⋯ menu. */
export async function pageAction(page: Page, name: string) {
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: new RegExp(name) }).click()
}

/** Types a page title into the open page's title field. */
export async function setTitle(page: Page, title: string) {
  await hideSidebar(page)
  const field = page.getByRole('textbox', { name: 'Page title' })
  await field.click()
  await field.fill(title)
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: title, exact: true }),
  ).toBeVisible()
  await hideSidebar(page)
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
  else {
    await showSidebar(page)
    await sidebar(page).getByLabel('New notebook').click()
  }

  const nameField = sidebar(page).getByRole('textbox', { name: 'Name' })
  const named = sidebar(page).getByRole('button', { name, exact: true })
  // On a phone the drawer can close while naming, which ends the name field,
  // so repeat the whole step until the notebook shows its name, reopening
  // the field with Rename like a user would.
  await expect(async () => {
    await showSidebar(page)
    if (await named.isVisible()) return
    if (!(await nameField.isVisible())) {
      await rowAction(page, 'New notebook', 'Rename')
    }
    await nameField.fill(name, { timeout: 3000 })
    await nameField.press('Enter', { timeout: 3000 }).catch(() => {})
    await showSidebar(page)
    await expect(named).toBeVisible({ timeout: 3000 })
  }).toPass()
  await setTitle(page, firstPage)
}

/** Adds a page to a notebook (or a sub-page to a page) and titles it. */
export async function addPage(
  page: Page,
  parentName: string,
  title: string,
  kind: 'page' | 'sub-page' = 'page',
) {
  const before = page.url()
  await rowAction(
    page,
    parentName,
    kind === 'page' ? 'Add page' : 'Add sub-page',
  )
  await page.getByRole('menuitem', { name: 'Blank page' }).click()
  await page.waitForURL((url) => url.toString() !== before) // the new page is open
  // New pages open with the cursor in the title.
  const field = page.getByRole('textbox', { name: 'Page title' })
  await expect(field).toBeFocused()
  await page.keyboard.type(title)
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: title, exact: true }),
  ).toBeVisible()
  await hideSidebar(page)
}

/** Opens a page from the sidebar. */
export async function openPage(page: Page, title: string) {
  await showSidebar(page)
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
    t.replace(/[📋☀×▸▾]/gu, '').trim(),
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
  await expect(
    sidebar(page)
      .getByText('Trash is empty')
      .or(sidebar(page).getByLabel('Restore', { exact: true }))
      .first(),
  ).toBeVisible()
  return sidebar(page)
}

/** Trash entries, as "title — detail" strings. */
export async function trashEntries(page: Page): Promise<string[]> {
  const entries = sidebar(page)
    .locator('div.group')
    .filter({ has: page.getByLabel('Restore', { exact: true }) })
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
    .filter({ has: page.getByLabel('Restore', { exact: true }) })
    .filter({ hasText: title })
    .first()
  await entry.hover()
  await entry.getByLabel(action, { exact: true }).click()
}

/** Selects `text` (within one line) in the editor, like dragging the mouse. */
export async function selectText(page: Page, text: string) {
  await page.evaluate((wanted) => {
    const root = document.querySelector('.bn-editor')!
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.textContent!.indexOf(wanted)
      if (at < 0) continue
      const range = document.createRange()
      range.setStart(node, at)
      range.setEnd(node, at + wanted.length)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    throw new Error('Text not found: ' + wanted)
  }, text)
}

/** Number of review records in the app database. */
export const cardRecordCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const count = open.result
            .transaction('cards')
            .objectStore('cards')
            .count()
          count.onsuccess = () => {
            resolve(count.result)
            open.result.close()
          }
        }
      }),
  )

/** Text of the blocks being highlighted after a jump ('' if none). */
export const highlighted = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.id === 'reveal' && a.playState === 'running')
      .map((a) => (a.effect as KeyframeEffect | null)?.target?.textContent)
      .join(' | '),
  )

/** Opens the search popup with Ctrl+K and returns it. */
export async function openSearchPopup(page: Page): Promise<Locator> {
  await sidebar(page).waitFor({ state: 'attached' }) // the app has loaded
  await page.keyboard.press('Control+K')
  const popup = page.getByRole('dialog', { name: 'Search' })
  await expect(popup).toBeVisible()
  return popup
}

/** The result list of the Search screen. */
export const searchResults = (page: Page) =>
  page.getByRole('main').getByRole('list', { name: 'Results' })

/** Writes a question and turns it into a card (`total` cards afterwards). */
export async function makeCard(page: Page, question: string, total: number) {
  await typeInEditor(page, question)
  await page.locator('.bn-block-content', { hasText: question }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('An answer')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(total)
}
