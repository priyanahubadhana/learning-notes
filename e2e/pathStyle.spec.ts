// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage as openSidebarPage,
  pageSubAction,
  showSidebar,
  sidebar,
} from './helpers.ts'

/**
 * Page path styles in the top bar: Simple (Notebook / Page), Full path (like
 * folders: every part a link, every arrow a list of the pages at that level,
 * the middle collapsing to "…") and Page only (tap for the full path). The
 * page's choice wins over the notebook's, which wins over the Settings default.
 */

test.use({ viewport: { width: 1280, height: 900 } })

const path = (page: Page) =>
  page.getByRole('navigation', { name: 'Breadcrumb' })

/**
 * Biology › Cells › Nucleus (and a second top page, Genetics). `depth` is the
 * number of pages in the open path (2 = Cells › Nucleus).
 */
async function start(page: Page, globalStyle?: string, depth = 2) {
  if (globalStyle) {
    await page.addInitScript((value) => {
      localStorage.setItem(
        'learning-notes:general.pathStyle',
        JSON.stringify(value),
      )
    }, globalStyle)
  }
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await addPage(page, 'Biology', 'Genetics')
  const chain = ['Cells', 'Nucleus', 'Chromatin', 'Genes', 'Alleles']
  for (let i = 1; i < depth; i++) {
    await showSidebar(page)
    // Sub-pages fold: open the parent first so its row is reachable.
    await addPage(page, chain[i - 1], chain[i], 'sub-page')
  }
}

test('Simple (the default) is Notebook / Page, as before', async ({ page }) => {
  await start(page)
  await expect(path(page)).toHaveText('Biology/Cells/Nucleus')
  await expect(page.locator('[data-path-sep]')).toHaveCount(0)
})

test('Full path: every part is a link, and each arrow lists the pages at that level', async ({
  page,
}) => {
  await start(page, 'full')
  const nav = path(page)
  await expect(nav).toContainText('📘 Biology')
  await expect(nav.getByRole('button', { name: /Biology/ })).toBeVisible()
  await expect(
    nav.getByRole('button', { name: 'Cells', exact: true }),
  ).toBeVisible()
  await expect(
    nav.getByRole('button', { name: 'Nucleus', exact: true }),
  ).toBeVisible()
  const arrows = nav.locator('[data-path-sep]')
  await expect(arrows).toHaveCount(2)

  // The first arrow: the notebook's top pages (the open path is ticked).
  await arrows.nth(0).click()
  const list = page.getByRole('menu', { name: 'Pages at this level' })
  await expect(list.getByRole('menuitem')).toHaveText([/Cells/, /Genetics/])
  await expect(list.getByRole('menuitem', { name: /Cells/ })).toContainText('✓')
  // It is a pop-up: it has a ✕ and closes on Esc and a tap outside.
  await list.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(list).toHaveCount(0)
  await arrows.nth(0).click()
  await page.keyboard.press('Escape')
  await expect(list).toHaveCount(0)
  await arrows.nth(0).click()
  await page.locator('.bn-editor').click({ position: { x: 5, y: 5 } })
  await expect(list).toHaveCount(0)

  // Choosing a sibling opens it.
  await arrows.nth(0).click()
  await list.getByRole('menuitem', { name: /Genetics/ }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Genetics',
  )
  await expect(list).toHaveCount(0)
})

test('Full path: the second arrow lists the sub-pages under Cells; a part is a link', async ({
  page,
}) => {
  await start(page, 'full')
  const nav = path(page)
  await nav.locator('[data-path-sep]').nth(1).click()
  const list = page.getByRole('menu', { name: 'Pages at this level' })
  await expect(list.getByRole('menuitem')).toHaveText([/Nucleus/])
  await page.keyboard.press('Escape')
  // A part is a link: Cells opens that page.
  await nav.getByRole('button', { name: 'Cells', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Cells',
  )
  await expect(path(page)).toContainText('Cells')
})

test('Full path: the notebook part opens the notebook', async ({ page }) => {
  await start(page, 'full')
  await path(page)
    .getByRole('button', { name: /Biology/ })
    .click()
  await expect(page).toHaveURL(/#\/notebook\//)
})

test('Full path: a long path collapses its middle to "…"; tapping it shows the hidden parts', async ({
  page,
}) => {
  await start(page, 'full', 5)
  const nav = path(page)
  const dots = nav.locator('[data-path-dots]')
  await expect(dots).toHaveCount(1)
  // First part, "…", then the last two.
  await expect(nav.getByRole('button', { name: /Biology/ })).toBeVisible()
  await expect(
    nav.getByRole('button', { name: 'Genes', exact: true }),
  ).toBeVisible()
  await expect(
    nav.getByRole('button', { name: 'Alleles', exact: true }),
  ).toBeVisible()
  await expect(
    nav.getByRole('button', { name: 'Nucleus', exact: true }),
  ).toHaveCount(0)
  await dots.click()
  const menu = page.getByRole('menu', { name: 'Hidden parts of the path' })
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Cells',
    'Nucleus',
    'Chromatin',
  ])
  await menu.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(menu).toHaveCount(0)
  await dots.click()
  await menu.getByRole('menuitem', { name: 'Nucleus' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Nucleus',
  )
})

test('a short path does not collapse', async ({ page }) => {
  await start(page, 'full', 3)
  await expect(path(page).locator('[data-path-dots]')).toHaveCount(0)
})

test('Page only: the page name alone; tapping it shows the full path', async ({
  page,
}) => {
  await start(page, 'page')
  const nav = path(page)
  await expect(nav).toHaveText('Nucleus')
  await nav.getByRole('button').click()
  const menu = page.getByRole('menu', { name: 'Full path' })
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Biology',
    'Cells',
    'Nucleus',
  ])
  await menu.getByRole('menuitem', { name: 'Cells' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Cells',
  )
})

test('the default is a Settings choice found by searching "path" or "breadcrumb"', async ({
  page,
}) => {
  await start(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const search = page.getByRole('searchbox', { name: /Search/ })
  for (const word of ['path', 'breadcrumb']) {
    await search.fill(word)
    await expect(
      page.getByRole('heading', { name: 'Page address' }),
    ).toBeVisible()
  }
  const row = page.locator('[data-setting-id="general.pathStyle"]')
  await row.getByRole('button', { name: 'Full (like folders)' }).click()
  await openSidebarPage(page, 'Nucleus')
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(2)
})

test('precedence: the page wins over the notebook, which wins over the default', async ({
  page,
}) => {
  await start(page, 'simple')
  // Default: simple.
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(0)

  // The notebook's choice (its Tab options menu) wins over the default.
  await page
    .getByRole('button', { name: 'Biology', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Tab options' }).click()
  await page.getByRole('menuitem', { name: 'Page address' }).click()
  await page
    .getByRole('menu', { name: 'Page address' })
    .getByRole('menuitemradio', { name: 'Full (like folders)' })
    .click()
  await openSidebarPage(page, 'Nucleus')
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(2)

  // The page's own choice wins over the notebook's.
  await pageSubAction(page, 'Page address', 'Name only')
  await expect(path(page)).toHaveText('Nucleus')
  // Another page of the notebook still follows the notebook.
  await openSidebarPage(page, 'Genetics')
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(1)

  // "Use default" on the page goes back to the notebook's style, and the
  // notebook's "Use default" goes back to the Settings default.
  await openSidebarPage(page, 'Nucleus')
  await pageSubAction(page, 'Page address', 'App default')
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Biology', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Tab options' }).click()
  await page.getByRole('menuitem', { name: 'Page address' }).click()
  await page
    .getByRole('menu', { name: 'Page address' })
    .getByRole('menuitemradio', { name: 'App default' })
    .click()
  await openSidebarPage(page, 'Nucleus')
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(0)
  await expect(path(page)).toHaveText('Biology/Cells/Nucleus')
})

test('a page choice survives a reload (and the page menu ticks it)', async ({
  page,
}) => {
  await start(page)
  await pageSubAction(page, 'Page address', 'Full (like')
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(2)
  await page.reload()
  await expect(path(page).locator('[data-path-sep]')).toHaveCount(2)
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: 'Page address' }).click()
  await expect(
    page
      .getByRole('menu', { name: 'Page address' })
      .getByRole('menuitemradio', { name: 'Full (like folders)' }),
  ).toHaveAttribute('aria-checked', 'true')
  // The list is a pop-up: it has a ✕ and Esc closes it.
  await expect(
    page
      .getByRole('menu', { name: 'Page address' })
      .getByRole('button', { name: 'Close', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Page address' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  // Also in the sidebar tree nothing else changed.
  await expect(
    sidebar(page).getByRole('button', { name: 'Genetics', exact: true }),
  ).toBeVisible()
})

test('the control panel finds it by "path"', async ({ page }) => {
  await start(page)
  await page.keyboard.press('Control+Shift+K')
  const panel = page.getByRole('dialog', { name: 'Search all features' })
  await panel
    .getByRole('searchbox', { name: 'Search features and settings' })
    .fill('breadcrumb')
  await expect(panel.getByText('Page address').first()).toBeVisible()
})
